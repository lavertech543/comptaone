import { Router } from 'express';
import { query, tx } from '../db/pool.js';
import { authRequired } from '../middleware/auth.js';
import { requirePermission } from '../middleware/permissions.js';
import { logAudit } from '../utils/audit.js';
import { runAlerts } from '../utils/notify.js';

const router = Router();
const M = 'stocks';
router.use(authRequired);

// --- LISTER LES PRODUITS (actifs ET archivés, le frontend filtre localement) ---
router.get('/products', requirePermission(M, 'view'), async (req, res) => {
  try {
    const r = await query(
      'SELECT *, (quantite<=seuil_min) AS alerte FROM products ORDER BY nom'
    );
    res.json(r.rows);
  } catch (err) {
    console.error('Erreur GET /products:', err);
    res.status(500).json({ error: 'Erreur lors de la récupération des produits' });
  }
});

// --- CRÉER UN PRODUIT ---
router.post('/products', requirePermission(M, 'create'), async (req, res) => {
  try {
    const { nom, categorie, unite, quantite, seuil_min } = req.body;
    if (!nom) return res.status(400).json({ error: 'Nom requis' });

    const r = await query(
      'INSERT INTO products(nom, categorie, unite, quantite, seuil_min) VALUES($1, $2, $3, $4, $5) RETURNING id',
      [nom, categorie, unite || 'unité', quantite || 0, seuil_min || 0]
    );

    try {
      await logAudit({
        user: req.user,
        action: 'create',
        module: M,
        recordId: r.rows[0].id,
        details: nom
      });
    } catch (auditErr) {
      console.error('Erreur audit create product:', auditErr);
    }

    res.status(201).json({ id: r.rows[0].id });
  } catch (err) {
    console.error('Erreur POST /products:', err);
    res.status(500).json({ error: 'Erreur lors de la création du produit' });
  }
});

// --- MODIFIER UN PRODUIT (Mise à jour complète, incluant archive/restauration) ---
router.put('/products/:id', requirePermission(M, 'edit'), async (req, res) => {
  try {
    const { nom, categorie, unite, quantite, seuil_min, archive } = req.body;

    // Le frontend envoie 'archive: true/false' -> on le convertit vers is_active
    const is_active = archive === true ? false : (archive === false ? true : undefined);

    const result = await query(
      `UPDATE products 
       SET nom = COALESCE($1, nom),
           categorie = COALESCE($2, categorie),
           unite = COALESCE($3, unite),
           quantite = COALESCE($4, quantite),
           seuil_min = COALESCE($5, seuil_min),
           is_active = COALESCE($6, is_active)
       WHERE id = $7 RETURNING *`,
      [nom, categorie, unite, quantite, seuil_min, is_active, req.params.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Produit non trouvé' });
    }

    try {
      if (typeof runAlerts === 'function') {
        runAlerts().catch((e) => console.error('Erreur runAlerts:', e));
      }
      await logAudit({
        user: req.user,
        action: 'edit',
        module: M,
        recordId: Number(req.params.id),
        details: nom
      });
    } catch (auditErr) {
      console.error('Erreur secondaire audit/alertes:', auditErr);
    }

    res.json({ ok: true, product: result.rows[0] });
  } catch (err) {
    console.error('❌ Erreur UPDATE product:', err);
    res.status(500).json({ error: 'Erreur serveur lors de la modification du produit' });
  }
});

// --- SUPPRIMER UN PRODUIT (définitif, seulement si aucun historique) ---
router.delete('/products/:id', requirePermission(M, 'edit'), async (req, res) => {
  try {
    const result = await query('DELETE FROM products WHERE id = $1 RETURNING id', [req.params.id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Produit non trouvé' });
    }

    try {
      await logAudit({ user: req.user, action: 'delete', module: M, recordId: Number(req.params.id) });
      if (typeof runAlerts === 'function') {
        runAlerts().catch(() => {});
      }
    } catch (auditErr) {
      console.error('Erreur secondaire audit delete:', auditErr);
    }

    res.json({ ok: true });
  } catch (err) {
    // Code PostgreSQL 23503 = violation de clé étrangère (le produit a un historique)
    if (err.code === '23503') {
      return res.status(409).json({
        error: 'Ce produit a un historique de mouvements et ne peut pas être supprimé définitivement. Veuillez l\'archiver à la place.'
      });
    }
    console.error('❌ Erreur DELETE product:', err);
    res.status(500).json({ error: 'Erreur serveur lors de la suppression' });
  }
});

// --- HISTORIQUE DES MOUVEMENTS ---
router.get('/movements', requirePermission(M, 'view'), async (req, res) => {
  try {
    const r = await query(
      `SELECT sm.*, p.nom AS produit, p.unite 
       FROM stock_movements sm 
       JOIN products p ON p.id = sm.product_id
       ORDER BY sm.date_op DESC, sm.id DESC LIMIT 500`
    );
    res.json(r.rows);
  } catch (err) {
    console.error('Erreur GET /movements:', err);
    res.status(500).json({ error: 'Erreur lors de la récupération des mouvements' });
  }
});

// --- ENREGISTRER UN MOUVEMENT ---
router.post('/movements', requirePermission(M, 'create'), async (req, res) => {
  try {
    const { product_id, date_op, sens, quantite, motif, band_id } = req.body;
    if (!['entree', 'sortie'].includes(sens)) {
      return res.status(400).json({ error: 'Sens invalide' });
    }

    const p = (await query('SELECT quantite FROM products WHERE id=$1', [product_id])).rows[0];
    if (!p) return res.status(404).json({ error: 'Produit introuvable' });

    const q = Number(quantite || 0);
    if (sens === 'sortie' && q > Number(p.quantite)) {
      return res.status(400).json({ error: 'Stock insuffisant' });
    }

    const id = await tx(async (c) => {
      const r = await c.query(
        `INSERT INTO stock_movements(product_id, date_op, sens, quantite, motif, band_id, created_by)
         VALUES($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [product_id, date_op, sens, q, motif, band_id || null, req.user.id]
      );
      await c.query(
        `UPDATE products SET quantite = quantite ${sens === 'entree' ? '+' : '-'} $1 WHERE id=$2`,
        [q, product_id]
      );
      return r.rows[0].id;
    });

    try {
      await logAudit({ user: req.user, action: 'create', module: M, recordId: id, details: `${sens} ${q}` });
      if (typeof runAlerts === 'function') {
        runAlerts().catch(() => {});
      }
    } catch (auditErr) {
      console.error('Erreur secondaire audit:', auditErr);
    }

    res.status(201).json({ id });
  } catch (err) {
    console.error('Erreur POST /movements:', err);
    res.status(500).json({ error: 'Erreur lors de la création du mouvement' });
  }
});

export default router;