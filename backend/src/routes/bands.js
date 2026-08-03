import { Router } from 'express';
import { query, tx } from '../db/pool.js';
import { authRequired, adminOnly } from '../middleware/auth.js';
import { requirePermission } from '../middleware/permissions.js';
import { logAudit } from '../utils/audit.js';

const router = Router();
const M = 'bandes';
router.use(authRequired);

// effectif vivant = reçus - morts - vendus
const EFFECTIF = `(b.nb_poussins
  - COALESCE((SELECT SUM(nombre) FROM mortalities WHERE band_id=b.id),0)
  - COALESCE((SELECT SUM(quantite) FROM sales WHERE band_id=b.id),0))`;

router.get('/', requirePermission(M,'view'), async (req, res) => {
  const r = await query(`
    SELECT b.*, bl.nom AS batiment,
      ${EFFECTIF} AS effectif_vivant,
      COALESCE((SELECT SUM(nombre) FROM mortalities WHERE band_id=b.id),0) AS total_morts,
      COALESCE((SELECT SUM(quantite) FROM sales WHERE band_id=b.id),0) AS total_vendus
    FROM bands b JOIN buildings bl ON bl.id=b.building_id
    ORDER BY b.statut='ouverte' DESC, b.date_arrivee DESC`);
  res.json(r.rows);
});

router.get('/:id', requirePermission(M,'view'), async (req, res) => {
  const r = await query(`SELECT b.*, bl.nom AS batiment, ${EFFECTIF} AS effectif_vivant
    FROM bands b JOIN buildings bl ON bl.id=b.building_id WHERE b.id=$1`, [req.params.id]);
  if (!r.rows[0]) return res.status(404).json({ error: 'Bande introuvable' });
  res.json(r.rows[0]);
});

// Ouverture — admin (5.2.1). RG-1 (capacité), RG-2 (bâtiment libre)
router.post('/', adminOnly, async (req, res) => {
  const { numero, building_id, date_arrivee, fournisseur, nb_poussins, prix_achat, observations, exercice_id } = req.body;
  if (!numero || !building_id || !date_arrivee) return res.status(400).json({ error: 'Numéro, bâtiment et date requis' });
  const bl = (await query('SELECT * FROM buildings WHERE id=$1', [building_id])).rows[0];
  if (!bl) return res.status(404).json({ error: 'Bâtiment introuvable' });
  if (Number(nb_poussins) > bl.capacite) return res.status(400).json({ error: `RG-1 : ${nb_poussins} > capacité ${bl.capacite}` });
  const open = await query(`SELECT 1 FROM bands WHERE building_id=$1 AND statut='ouverte'`, [building_id]);
  if (open.rows[0]) return res.status(400).json({ error: 'RG-2 : bâtiment déjà occupé par une bande ouverte' });

  try {
    const id = await tx(async (c) => {
      const r = await c.query(
        `INSERT INTO bands(numero,building_id,exercice_id,date_arrivee,fournisseur,nb_poussins,prix_achat,observations,created_by)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
        [numero, building_id, exercice_id || null, date_arrivee, fournisseur, nb_poussins || 0, prix_achat || 0, observations, req.user.id]);
      await c.query(`UPDATE buildings SET statut='en_production' WHERE id=$1`, [building_id]);
      return r.rows[0].id;
    });
    await logAudit({ user: req.user, action: 'band_open', module: M, recordId: id, details: `ouverture ${numero}` });
    res.status(201).json({ id });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Numéro de bande déjà utilisé' });
    res.status(500).json({ error: e.message });
  }
});

// Clôture — admin (5.2.2/3)
router.post('/:id/close', adminOnly, async (req, res) => {
  const b = (await query('SELECT * FROM bands WHERE id=$1', [req.params.id])).rows[0];
  if (!b) return res.status(404).json({ error: 'Bande introuvable' });
  if (b.statut === 'cloturee') return res.status(400).json({ error: 'Bande déjà clôturée' });
  await tx(async (c) => {
    await c.query(`UPDATE bands SET statut='cloturee', closed_at=now(), closed_by=$1 WHERE id=$2`, [req.user.id, b.id]);
    await c.query(`UPDATE buildings SET statut='nettoye' WHERE id=$1`, [b.building_id]);
  });
  await logAudit({ user: req.user, action: 'band_close', module: M, recordId: b.id, details: `clôture ${b.numero}` });
  res.json({ ok: true });
});

// Réouverture exceptionnelle — admin
router.post('/:id/reopen', adminOnly, async (req, res) => {
  const b = (await query('SELECT * FROM bands WHERE id=$1', [req.params.id])).rows[0];
  if (!b || b.statut !== 'cloturee') return res.status(400).json({ error: 'Bande non clôturée' });
  await query(`UPDATE bands SET statut='ouverte', closed_at=NULL WHERE id=$1`, [b.id]);
  await logAudit({ user: req.user, action: 'band_reopen', module: M, recordId: b.id, details: `réouverture exceptionnelle ${b.numero}` });
  res.json({ ok: true });
});

export default router;
