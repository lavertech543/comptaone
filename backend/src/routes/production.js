import { Router } from 'express';
import { query } from '../db/pool.js';
import { authRequired } from '../middleware/auth.js';
import { requirePermission } from '../middleware/permissions.js';
import { logAudit } from '../utils/audit.js';
import { bandOpen } from '../utils/guard.js';
import { runAlerts } from '../utils/notify.js';

const router = Router();
router.use(authRequired);

// ---- Alimentation (5.4) ----
router.get('/feedings', requirePermission('alimentation','view'), async (req, res) => {
  const band = req.query.band_id;
  const r = await query(`SELECT f.*, b.numero AS bande FROM feedings f JOIN bands b ON b.id=f.band_id
    ${band?'WHERE f.band_id=$1':''} ORDER BY f.date_op DESC`, band?[band]:[]);
  res.json(r.rows);
});
router.post('/feedings', requirePermission('alimentation','create'), async (req, res) => {
  const { band_id, date_op, type_aliment, quantite_kg, observations } = req.body;
  if (!await bandOpen(band_id)) return res.status(400).json({ error: 'RG-3 : bande fermée ou inexistante' });
  const r = await query(`INSERT INTO feedings(band_id,date_op,type_aliment,quantite_kg,observations,created_by)
    VALUES($1,$2,$3,$4,$5,$6) RETURNING id`, [band_id, date_op, type_aliment, quantite_kg||0, observations, req.user.id]);
  await logAudit({ user: req.user, action:'create', module:'alimentation', recordId:r.rows[0].id });
  res.status(201).json({ id: r.rows[0].id });
});

// ---- Mortalité (5.5) ----
router.get('/mortalities', requirePermission('mortalite','view'), async (req, res) => {
  const band = req.query.band_id;
  const r = await query(`SELECT m.*, b.numero AS bande FROM mortalities m JOIN bands b ON b.id=m.band_id
    ${band?'WHERE m.band_id=$1':''} ORDER BY m.date_op DESC`, band?[band]:[]);
  res.json(r.rows);
});
router.post('/mortalities', requirePermission('mortalite','create'), async (req, res) => {
  const { band_id, date_op, nombre, cause, observations } = req.body;
  if (!await bandOpen(band_id)) return res.status(400).json({ error: 'RG-3 : bande fermée ou inexistante' });
  const r = await query(`INSERT INTO mortalities(band_id,date_op,nombre,cause,observations,created_by)
    VALUES($1,$2,$3,$4,$5,$6) RETURNING id`, [band_id, date_op, nombre||0, cause, observations, req.user.id]);
  await logAudit({ user: req.user, action:'create', module:'mortalite', recordId:r.rows[0].id, details:`${nombre} morts` });
  runAlerts().catch(()=>{});
  res.status(201).json({ id: r.rows[0].id });
});

// ---- Sanitaire (5.6) ----
router.get('/treatments', requirePermission('sanitaire','view'), async (req, res) => {
  const band = req.query.band_id;
  const r = await query(`SELECT t.*, b.numero AS bande FROM treatments t JOIN bands b ON b.id=t.band_id
    ${band?'WHERE t.band_id=$1':''} ORDER BY t.date_op DESC`, band?[band]:[]);
  res.json(r.rows);
});
router.post('/treatments', requirePermission('sanitaire','create'), async (req, res) => {
  const { band_id, date_op, produit, type, dose, observations } = req.body;
  if (!await bandOpen(band_id)) return res.status(400).json({ error: 'RG-3 : bande fermée ou inexistante' });
  const r = await query(`INSERT INTO treatments(band_id,date_op,produit,type,dose,observations,created_by)
    VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id`, [band_id, date_op, produit, type, dose, observations, req.user.id]);
  await logAudit({ user: req.user, action:'create', module:'sanitaire', recordId:r.rows[0].id });
  res.status(201).json({ id: r.rows[0].id });
});

export default router;
