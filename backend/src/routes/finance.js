import { Router } from 'express';
import { query, tx } from '../db/pool.js';
import { authRequired } from '../middleware/auth.js';
import { requirePermission } from '../middleware/permissions.js';
import { logAudit } from '../utils/audit.js';
import { runAlerts } from '../utils/notify.js';

const router = Router();
router.use(authRequired);

// ---------- Achats (5.7) ----------
router.get('/purchases', requirePermission('achats','view'), async (req, res) => {
  const r = await query(`SELECT p.*, b.numero AS bande FROM purchases p LEFT JOIN bands b ON b.id=p.band_id
    ORDER BY p.date_op DESC, p.id DESC`);
  res.json(r.rows);
});
router.post('/purchases', requirePermission('achats','create'), async (req, res) => {
  const { date_op, fournisseur, description, categorie, quantite, prix_unitaire, mode_paiement, band_id, product_id, exercice_id } = req.body;
  const total = Number(quantite||1) * Number(prix_unitaire||0);
  const id = await tx(async (c) => {
    const r = await c.query(`INSERT INTO purchases(date_op,fournisseur,description,categorie,quantite,prix_unitaire,montant_total,mode_paiement,band_id,product_id,exercice_id,created_by)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
      [date_op, fournisseur, description, categorie, quantite||1, prix_unitaire||0, total, mode_paiement, band_id||null, product_id||null, exercice_id||null, req.user.id]);
    // Entrée en stock si produit lié
    if (product_id) {
      await c.query(`INSERT INTO stock_movements(product_id,date_op,sens,quantite,motif,created_by) VALUES($1,$2,'entree',$3,$4,$5)`,
        [product_id, date_op, quantite||0, 'Achat '+(description||''), req.user.id]);
      await c.query(`UPDATE products SET quantite=quantite+$1 WHERE id=$2`, [quantite||0, product_id]);
    }
    return r.rows[0].id;
  });
  await logAudit({ user: req.user, action:'create', module:'achats', recordId:id, details:`${description} — ${total} FCFA` });
  res.status(201).json({ id, montant_total: total });
});

// ---------- Ventes (5.8) ----------
router.get('/sales', requirePermission('ventes','view'), async (req, res) => {
  const r = await query(`SELECT s.*, b.numero AS bande FROM sales s LEFT JOIN bands b ON b.id=s.band_id
    ORDER BY s.date_op DESC, s.id DESC`);
  res.json(r.rows);
});
router.post('/sales', requirePermission('ventes','create'), async (req, res) => {
  const { date_op, client, band_id, quantite, poids_kg, prix_unitaire, mode_paiement, a_credit, date_echeance, observations, exercice_id } = req.body;
  const total = Number(quantite||0) * Number(prix_unitaire||0);
  const id = await tx(async (c) => {
    const r = await c.query(`INSERT INTO sales(date_op,client,band_id,quantite,poids_kg,prix_unitaire,montant_total,mode_paiement,a_credit,observations,exercice_id,created_by)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
      [date_op, client, band_id||null, quantite||0, poids_kg||null, prix_unitaire||0, total, mode_paiement, !!a_credit, observations, exercice_id||null, req.user.id]);
    const saleId = r.rows[0].id;
    // Génère une créance si vente à crédit (5.8 → 5.13)
    if (a_credit) {
      await c.query(`INSERT INTO receivables(client,sale_id,montant,date_creation,date_echeance,statut,created_by)
        VALUES($1,$2,$3,$4,$5,'en_cours',$6)`, [client, saleId, total, date_op, date_echeance||null, req.user.id]);
    }
    return saleId;
  });
  await logAudit({ user: req.user, action:'create', module:'ventes', recordId:id, details:`${client} — ${total} FCFA` });
  res.status(201).json({ id, montant_total: total });
});

// ---------- Dépenses / Recettes (5.9) ----------
router.get('/transactions', requirePermission('depenses','view'), async (req, res) => {
  const { type } = req.query;
  const r = await query(`SELECT t.*, b.numero AS bande FROM transactions t LEFT JOIN bands b ON b.id=t.band_id
    ${type?'WHERE t.type=$1':''} ORDER BY t.date_op DESC, t.id DESC`, type?[type]:[]);
  res.json(r.rows);
});
router.post('/transactions', requirePermission('depenses','create'), async (req, res) => {
  const { type, date_op, montant, categorie, motif, tiers, mode_paiement, band_id, exercice_id } = req.body;
  if (!['depense','recette'].includes(type)) return res.status(400).json({ error: 'Type invalide' });
  const r = await query(`INSERT INTO transactions(type,date_op,montant,categorie,motif,tiers,mode_paiement,band_id,exercice_id,created_by)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
    [type, date_op, montant||0, categorie, motif, tiers, mode_paiement, band_id||null, exercice_id||null, req.user.id]);
  await logAudit({ user: req.user, action:'create', module:'depenses', recordId:r.rows[0].id, details:`${type} ${montant} FCFA` });
  runAlerts().catch(()=>{});
  res.status(201).json({ id: r.rows[0].id });
});

export default router;
