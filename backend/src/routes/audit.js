import { Router } from 'express';
import { query } from '../db/pool.js';
import { authRequired, adminOnly } from '../middleware/auth.js';

const router = Router();
router.use(authRequired, adminOnly); // journal réservé admin (matrice ch.6)

router.get('/', async (req, res) => {
  const { module, action, user, from, to, limit = 200 } = req.query;
  const cond = [], vals = [];
  if (module) { vals.push(module); cond.push(`module=$${vals.length}`); }
  if (action) { vals.push(action); cond.push(`action=$${vals.length}`); }
  if (user) { vals.push(`%${user}%`); cond.push(`username ILIKE $${vals.length}`); }
  if (from) { vals.push(from); cond.push(`created_at >= $${vals.length}`); }
  if (to) { vals.push(to); cond.push(`created_at <= $${vals.length}`); }
  vals.push(Math.min(Number(limit), 1000));
  const where = cond.length ? 'WHERE ' + cond.join(' AND ') : '';
  const r = await query(`SELECT * FROM audit_log ${where} ORDER BY created_at DESC LIMIT $${vals.length}`, vals);
  res.json(r.rows);
});

export default router;
