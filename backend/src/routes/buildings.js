import { Router } from 'express';
import { query } from '../db/pool.js';
import { authRequired } from '../middleware/auth.js';
import { requirePermission } from '../middleware/permissions.js';
import { logAudit } from '../utils/audit.js';

const router = Router();
const M = 'batiments';
router.use(authRequired);

router.get('/', requirePermission(M,'view'), async (req, res) => {
  const r = await query(`
    SELECT b.*,
      (SELECT COUNT(*) FROM bands WHERE building_id=b.id AND statut='ouverte') AS bandes_ouvertes,
      (SELECT COALESCE(SUM(bd.nb_poussins),0)
        - COALESCE((SELECT SUM(m.nombre) FROM mortalities m JOIN bands b2 ON b2.id=m.band_id WHERE b2.building_id=b.id),0)
        - COALESCE((SELECT SUM(s.quantite) FROM sales s JOIN bands b3 ON b3.id=s.band_id WHERE b3.building_id=b.id),0)
       FROM bands bd WHERE bd.building_id=b.id AND bd.statut='ouverte') AS effectif_actuel
    FROM buildings b ORDER BY b.id`);
  res.json(r.rows);
});

router.get('/:id/history', requirePermission(M,'view'), async (req, res) => {
  const r = await query('SELECT * FROM bands WHERE building_id=$1 ORDER BY date_arrivee DESC', [req.params.id]);
  res.json(r.rows);
});

router.post('/', requirePermission(M,'create'), async (req, res) => {
  const { nom, capacite, statut } = req.body;
  if (!nom) return res.status(400).json({ error: 'Nom requis' });
  const r = await query('INSERT INTO buildings(nom,capacite,statut,created_by) VALUES($1,$2,$3,$4) RETURNING id',
    [nom, capacite || 0, statut || 'vide', req.user.id]);
  await logAudit({ user: req.user, action: 'create', module: M, recordId: r.rows[0].id, details: nom });
  res.status(201).json({ id: r.rows[0].id });
});

router.put('/:id', requirePermission(M,'edit'), async (req, res) => {
  const { nom, capacite, statut, is_active } = req.body;
  await query('UPDATE buildings SET nom=COALESCE($1,nom),capacite=COALESCE($2,capacite),statut=COALESCE($3,statut),is_active=COALESCE($4,is_active) WHERE id=$5',
    [nom, capacite, statut, is_active, req.params.id]);
  await logAudit({ user: req.user, action: 'edit', module: M, recordId: Number(req.params.id) });
  res.json({ ok: true });
});

export default router;
