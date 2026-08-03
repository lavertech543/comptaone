import { Router } from 'express';
import { query, tx } from '../db/pool.js';
import { authRequired, adminOnly } from '../middleware/auth.js';
import { logAudit } from '../utils/audit.js';

const router = Router();
router.use(authRequired);

// Tables autorisées à la correction
const TABLES = {
  alimentation:'feedings', mortalite:'mortalities', sanitaire:'treatments',
  achats:'purchases', ventes:'sales', depenses:'transactions', stocks:'stock_movements',
  salaires:'salary_payments', bandes:'bands', batiments:'buildings'
};

// Créer une demande de correction — l'utilisateur ne modifie jamais directement
router.post('/', async (req, res) => {
  const { module, record_id, champ, nouvelle_valeur, motif } = req.body;
  if (!TABLES[module]) return res.status(400).json({ error: 'Module non corrigeable' });
  if (!champ || !motif) return res.status(400).json({ error: 'Champ et motif requis' });
  const cur = await query(`SELECT ${champ} AS v FROM ${TABLES[module]} WHERE id=$1`, [record_id]);
  if (!cur.rows[0]) return res.status(404).json({ error: 'Enregistrement introuvable' });
  const r = await query(
    `INSERT INTO corrections(module,record_id,champ,ancienne_valeur,nouvelle_valeur,motif,requested_by)
     VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
    [module, record_id, champ, String(cur.rows[0].v ?? ''), String(nouvelle_valeur ?? ''), motif, req.user.id]);
  await logAudit({ user: req.user, action: 'correction_request', module, recordId: record_id, details: `${champ}: ${cur.rows[0].v} → ${nouvelle_valeur}` });
  res.status(201).json({ id: r.rows[0].id });
});

// Liste : admin voit tout ; utilisateur voit ses demandes
router.get('/', async (req, res) => {
  const isAdmin = req.user.role === 'admin';
  const r = await query(
    `SELECT c.*, u.full_name AS demandeur, a.full_name AS validateur
     FROM corrections c
     LEFT JOIN users u ON u.id=c.requested_by
     LEFT JOIN users a ON a.id=c.reviewed_by
     ${isAdmin ? '' : 'WHERE c.requested_by=$1'}
     ORDER BY c.created_at DESC`,
    isAdmin ? [] : [req.user.id]);
  res.json(r.rows);
});

// Validation (admin seul) — conserve l'ancienne valeur dans l'historique (5.12.3)
router.post('/:id/review', adminOnly, async (req, res) => {
  const { decision, commentaire } = req.body; // accept | reject
  const c = (await query('SELECT * FROM corrections WHERE id=$1', [req.params.id])).rows[0];
  if (!c) return res.status(404).json({ error: 'Demande introuvable' });
  if (c.statut !== 'en_attente') return res.status(400).json({ error: 'Demande déjà traitée' });

  if (decision === 'accept') {
    const table = TABLES[c.module];
    await tx(async (client) => {
      await client.query(`UPDATE ${table} SET ${c.champ}=$1 WHERE id=$2`, [c.nouvelle_valeur, c.record_id]);
      await client.query('UPDATE corrections SET statut=$1, reviewed_by=$2, reviewed_at=now(), commentaire=$3 WHERE id=$4',
        ['acceptee', req.user.id, commentaire || null, c.id]);
    });
    await logAudit({ user: req.user, action: 'correction_validate', module: c.module, recordId: c.record_id,
      details: `acceptée — ${c.champ}: ${c.ancienne_valeur} → ${c.nouvelle_valeur}` });
  } else {
    await query('UPDATE corrections SET statut=$1, reviewed_by=$2, reviewed_at=now(), commentaire=$3 WHERE id=$4',
      ['refusee', req.user.id, commentaire || null, c.id]);
    await logAudit({ user: req.user, action: 'correction_reject', module: c.module, recordId: c.record_id, details: commentaire || '' });
  }
  res.json({ ok: true });
});

export default router;
