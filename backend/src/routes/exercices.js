import { Router } from 'express';
import { query } from '../db/pool.js';
import { authRequired, adminOnly } from '../middleware/auth.js';
import { logAudit } from '../utils/audit.js';

const router = Router();
router.use(authRequired);

router.get('/', async (req, res) => {
  const r = await query('SELECT * FROM exercices ORDER BY annee DESC');
  res.json(r.rows);
});

router.post('/', adminOnly, async (req, res) => {
  const { annee, libelle, is_reprise } = req.body;
  if (!annee) return res.status(400).json({ error: 'Année requise' });
  try {
    const r = await query('INSERT INTO exercices(annee,libelle,is_reprise) VALUES($1,$2,$3) RETURNING id',
      [annee, libelle||`Exercice ${annee}`, !!is_reprise]);
    await logAudit({ user: req.user, action:'create', module:'comptabilite', recordId:r.rows[0].id, details:`exercice ${annee}${is_reprise?' (reprise)':''}` });
    res.status(201).json({ id: r.rows[0].id });
  } catch (e) {
    if (e.code==='23505') return res.status(409).json({ error: 'Exercice déjà existant' });
    res.status(500).json({ error: e.message });
  }
});

// Clôture définitive d'un exercice (verrouille — RG-4)
router.post('/:id/close', adminOnly, async (req, res) => {
  await query('UPDATE exercices SET is_closed=TRUE WHERE id=$1', [req.params.id]);
  await logAudit({ user: req.user, action:'exercice_close', module:'comptabilite', recordId:Number(req.params.id) });
  res.json({ ok: true });
});

export default router;
