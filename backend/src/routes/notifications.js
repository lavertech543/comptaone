import { Router } from 'express';
import { query } from '../db/pool.js';
import { authRequired } from '../middleware/auth.js';
import { runAlerts } from '../utils/notify.js';

const router = Router();
router.use(authRequired);

// Récupérer uniquement les notifications NON RÉSOLUES et NON LUES pour l'affichage actif
router.get('/', async (req, res) => {
  try {
    const r = await query(`
      SELECT * FROM notifications
      WHERE (target_role IS NULL OR target_role = $1 OR $2 = 'admin')
        AND is_resolved = FALSE
        AND is_read = FALSE
      ORDER BY created_at DESC 
      LIMIT 100
    `, [req.user.role, req.user.role]);

    res.json(r.rows);
  } catch (err) {
    console.error('Erreur GET /notifications :', err);
    res.status(500).json({ error: 'Erreur lors de la récupération des notifications.' });
  }
});

// Forcer la vérification et la mise à jour des alertes
router.post('/refresh', async (req, res) => {
  try {
    await runAlerts();
    res.json({ ok: true });
  } catch (err) {
    console.error('Erreur POST /notifications/refresh :', err);
    res.status(500).json({ error: 'Erreur lors du rafraîchissement des alertes.' });
  }
});

// Marquer une notification comme lue
router.post('/:id/read', async (req, res) => {
  try {
    await query('UPDATE notifications SET is_read = TRUE WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error('Erreur POST /notifications/:id/read :', err);
    res.status(500).json({ error: 'Erreur de mise à jour.' });
  }
});

// Marquer TOUTES les notifications comme lues
router.post('/read-all', async (req, res) => {
  try {
    await query(`
      UPDATE notifications 
      SET is_read = TRUE 
      WHERE is_read = FALSE 
        AND (target_role IS NULL OR target_role = $1 OR $2 = 'admin')
    `, [req.user.role, req.user.role]);

    res.json({ ok: true });
  } catch (err) {
    console.error('Erreur POST /notifications/read-all :', err);
    res.status(500).json({ error: 'Erreur de mise à jour des notifications.' });
  }
});

export default router;