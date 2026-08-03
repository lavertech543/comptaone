import { Router } from 'express';
import { query, tx } from '../db/pool.js';
import { authRequired } from '../middleware/auth.js';
import { requirePermission } from '../middleware/permissions.js';
import { logAudit } from '../utils/audit.js';
import { runAlerts } from '../utils/notify.js';

const router = Router();
const M = 'creances';
router.use(authRequired);

function statut(montant, paye, echeance) {
  const solde = Number(montant) - Number(paye);
  if (solde <= 0) return 'solde';
  if (echeance && new Date(echeance) < new Date()) return 'en_retard';
  if (paye > 0) return 'partiel';
  return 'en_cours';
}

router.get('/', requirePermission(M,'view'), async (req, res) => {
  const r = await query(`SELECT *, (montant-montant_paye) AS solde FROM receivables ORDER BY date_echeance NULLS LAST`);
  res.json(r.rows);
});

router.post('/', requirePermission(M,'create'), async (req, res) => {
  const { client, montant, date_creation, date_echeance, observations } = req.body;
  if (!client || !montant) return res.status(400).json({ error: 'Client et montant requis' });
  const st = statut(montant, 0, date_echeance);
  const r = await query(`INSERT INTO receivables(client,montant,date_creation,date_echeance,statut,observations,created_by)
    VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id`, [client, montant, date_creation||new Date(), date_echeance||null, st, observations, req.user.id]);
  await logAudit({ user: req.user, action:'create', module:M, recordId:r.rows[0].id });
  res.status(201).json({ id: r.rows[0].id });
});

// Encaissement partiel/total
router.post('/:id/payment', requirePermission(M,'edit'), async (req, res) => {
  const { montant, mode_paiement, date_op } = req.body;
  const c = (await query('SELECT * FROM receivables WHERE id=$1', [req.params.id])).rows[0];
  if (!c) return res.status(404).json({ error: 'Créance introuvable' });
  const nouveauPaye = Number(c.montant_paye) + Number(montant||0);
  const st = statut(c.montant, nouveauPaye, c.date_echeance);
  await tx(async (cl) => {
    await cl.query(`INSERT INTO receivable_payments(receivable_id,date_op,montant,mode_paiement,created_by) VALUES($1,$2,$3,$4,$5)`,
      [c.id, date_op||new Date(), montant||0, mode_paiement, req.user.id]);
    await cl.query('UPDATE receivables SET montant_paye=$1, statut=$2 WHERE id=$3', [nouveauPaye, st, c.id]);
  });
  await logAudit({ user: req.user, action:'payment', module:M, recordId:c.id, details:`+${montant} FCFA` });
  runAlerts().catch(()=>{});
  res.json({ ok: true, montant_paye: nouveauPaye, statut: st });
});

export default router;
