import { Router } from 'express';
import { query } from '../db/pool.js';
import { authRequired } from '../middleware/auth.js';
import { computeTresorerie } from '../utils/notify.js';

const router = Router();
router.use(authRequired);

router.get('/', async (req, res) => {
  const isFin = ['admin','comptable'].includes(req.user.role) ||
    (await query(`SELECT can_view FROM permissions WHERE user_id=$1 AND module='comptabilite'`, [req.user.id])).rows[0]?.can_view;

  const base = await query(`SELECT
    (SELECT COUNT(*) FROM buildings WHERE is_active) AS nb_batiments,
    (SELECT COUNT(*) FROM bands WHERE statut='ouverte') AS bandes_ouvertes,
    (SELECT COALESCE(SUM(nb_poussins),0)
       - COALESCE((SELECT SUM(nombre) FROM mortalities m JOIN bands b ON b.id=m.band_id WHERE b.statut='ouverte'),0)
       - COALESCE((SELECT SUM(quantite) FROM sales s JOIN bands b ON b.id=s.band_id WHERE b.statut='ouverte'),0)
     FROM bands WHERE statut='ouverte') AS total_sujets`);

  const data = { ...base.rows[0], financier: false };

  if (isFin) {
    const fin = await query(`SELECT
      (SELECT COALESCE(SUM(montant_total),0) FROM sales)+(SELECT COALESCE(SUM(montant),0) FROM transactions WHERE type='recette') AS recettes,
      (SELECT COALESCE(SUM(montant_total),0) FROM purchases)+(SELECT COALESCE(SUM(montant),0) FROM transactions WHERE type='depense')+(SELECT COALESCE(SUM(montant),0) FROM salary_payments WHERE statut='paye') AS depenses,
      (SELECT COALESCE(SUM(prix_achat),0) FROM bands) AS capital_investi,
      (SELECT COALESCE(SUM(montant),0) FROM salary_payments WHERE statut='paye') AS masse_salariale,
      (SELECT COALESCE(SUM(montant-montant_paye),0) FROM receivables WHERE statut<>'solde') AS creances`);
    const f = fin.rows[0];
    data.financier = true;
    data.recettes = Number(f.recettes);
    data.depenses = Number(f.depenses);
    data.benefice = Number(f.recettes) - Number(f.depenses);
    data.capital_investi = Number(f.capital_investi);
    data.masse_salariale = Number(f.masse_salariale);
    data.creances = Number(f.creances);
    data.tresorerie = await computeTresorerie();
  }

  // Alertes non lues
  const notifs = await query(`SELECT * FROM notifications WHERE is_read=FALSE ORDER BY created_at DESC LIMIT 10`);
  data.alertes = notifs.rows;
  // Utilisateurs récemment connectés
  data.users_actifs = (await query(`SELECT full_name, role, last_login FROM users WHERE last_login > now()-interval '1 day' ORDER BY last_login DESC`)).rows;
  res.json(data);
});

export default router;
