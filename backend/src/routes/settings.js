import { Router } from 'express';
import { query } from '../db/pool.js';
import { authRequired, adminOnly } from '../middleware/auth.js';
import { logAudit } from '../utils/audit.js';

const router = Router();
router.use(authRequired);

router.get('/', async (req, res) => {
  const r = await query('SELECT cle,valeur FROM settings');
  res.json(Object.fromEntries(r.rows.map(x => [x.cle, x.valeur])));
});
router.put('/', adminOnly, async (req, res) => {
  for (const [cle, valeur] of Object.entries(req.body || {})) {
    await query('INSERT INTO settings(cle,valeur) VALUES($1,$2) ON CONFLICT(cle) DO UPDATE SET valeur=$2', [cle, String(valeur)]);
  }
  await logAudit({ user: req.user, action:'edit', module:'utilisateurs', details:'paramètres modifiés' });
  res.json({ ok: true });
});

export default router;
