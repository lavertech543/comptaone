import { Router } from 'express';
import { query } from '../db/pool.js';
import { authRequired } from '../middleware/auth.js';
import { requirePermission } from '../middleware/permissions.js';
import { logAudit } from '../utils/audit.js';
import { runAlerts } from '../utils/notify.js';
import { sendMail } from '../utils/mail.js';

const router = Router();
const M = 'salaires';
router.use(authRequired);

// Employés
router.get('/employees', requirePermission(M,'view'), async (req, res) => {
  const r = await query('SELECT * FROM employees ORDER BY statut, nom');
  res.json(r.rows);
});
router.post('/employees', requirePermission(M,'create'), async (req, res) => {
  const { nom, poste, email, salaire_ref, date_entree, statut } = req.body;
  if (!nom) return res.status(400).json({ error: 'Nom requis' });
  const r = await query('INSERT INTO employees(nom,poste,email,salaire_ref,date_entree,statut) VALUES($1,$2,$3,$4,$5,$6) RETURNING id',
    [nom, poste, email||null, salaire_ref||0, date_entree||null, statut||'actif']);
  await logAudit({ user: req.user, action:'create', module:M, recordId:r.rows[0].id, details:`employé ${nom}` });
  res.status(201).json({ id: r.rows[0].id });
});
router.put('/employees/:id', requirePermission(M,'edit'), async (req, res) => {
  const { poste, email, salaire_ref, statut } = req.body;
  await query('UPDATE employees SET poste=COALESCE($1,poste),email=COALESCE($2,email),salaire_ref=COALESCE($3,salaire_ref),statut=COALESCE($4,statut) WHERE id=$5',
    [poste, email, salaire_ref, statut, req.params.id]);
  await logAudit({ user: req.user, action:'edit', module:M, recordId:Number(req.params.id) });
  res.json({ ok: true });
});

// Paiements
router.get('/payments', requirePermission(M,'view'), async (req, res) => {
  const r = await query(`SELECT sp.*, e.nom AS employe, e.poste FROM salary_payments sp JOIN employees e ON e.id=sp.employee_id
    ORDER BY sp.periode DESC, e.nom`);
  res.json(r.rows);
});
router.post('/payments', requirePermission(M,'create'), async (req, res) => {
  const { employee_id, periode, montant, date_paiement, mode_paiement, statut, observations, exercice_id } = req.body;
  if (!employee_id || !periode) return res.status(400).json({ error: 'Employé et période requis' });
  const r = await query(`INSERT INTO salary_payments(employee_id,periode,montant,date_paiement,mode_paiement,statut,observations,exercice_id,created_by)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
    [employee_id, periode, montant||0, date_paiement||null, mode_paiement, statut||'en_attente', observations, exercice_id||null, req.user.id]);
  await logAudit({ user: req.user, action:'create', module:M, recordId:r.rows[0].id, details:`salaire ${periode}` });
  runAlerts().catch(()=>{});
  res.status(201).json({ id: r.rows[0].id });
});
// Marquer payé (verrouillage à la validation)
router.post('/payments/:id/pay', requirePermission(M,'edit'), async (req, res) => {
  const { date_paiement, mode_paiement } = req.body;

  // Récupérer les infos du paiement + email de l'employé
  const info = await query(
    `SELECT sp.montant, sp.periode, e.nom AS employe, e.email AS employe_email
     FROM salary_payments sp
     JOIN employees e ON e.id = sp.employee_id
     WHERE sp.id = $1`,
    [req.params.id]
  );

  await query(`UPDATE salary_payments SET statut='paye', date_paiement=COALESCE($1,CURRENT_DATE), mode_paiement=COALESCE($2,mode_paiement), locked=TRUE WHERE id=$3`,
    [date_paiement||null, mode_paiement||null, req.params.id]);
  await logAudit({ user: req.user, action:'salary_paid', module:M, recordId:Number(req.params.id) });

  // Email de confirmation envoyé à l'employé (s'il a un email renseigné)
  if (info.rows.length > 0) {
    const { employe, montant, periode, employe_email } = info.rows[0];
    if (employe_email) {
      const sujet = `[N&K] Confirmation de paiement de salaire`;
      const msg = `Bonjour ${employe},\n\nVotre salaire pour la période ${periode} a été payé avec succès.\nMontant : ${Number(montant).toLocaleString('fr-FR')} FCFA\n\nCordialement,\nLa Direction`;
      sendMail(employe_email, sujet, msg).catch((err) =>
        console.error(`Erreur envoi mail salaire à ${employe_email}:`, err)
      );
    }
  }

  runAlerts().catch(() => {});
  res.json({ ok: true });
});

// Masse salariale par période
router.get('/masse', requirePermission(M,'view'), async (req, res) => {
  const r = await query(`SELECT periode, SUM(montant) AS masse, COUNT(*) AS nb,
    SUM(CASE WHEN statut='en_attente' THEN 1 ELSE 0 END) AS en_attente
    FROM salary_payments GROUP BY periode ORDER BY periode DESC`);
  res.json(r.rows);
});

export default router;
