import { Router } from 'express';
import { query } from '../db/pool.js';
import { authRequired } from '../middleware/auth.js';
import { requirePermission } from '../middleware/permissions.js';
import { computeTresorerie } from '../utils/notify.js';

const router = Router();
router.use(authRequired);

// Synthèse comptable globale
router.get('/summary', requirePermission('comptabilite','view'), async (req, res) => {
  const q = await query(`SELECT
    (SELECT COALESCE(SUM(montant_total),0) FROM sales) AS ventes,
    (SELECT COALESCE(SUM(montant),0) FROM transactions WHERE type='recette') AS autres_recettes,
    (SELECT COALESCE(SUM(montant_total),0) FROM purchases) AS achats,
    (SELECT COALESCE(SUM(montant),0) FROM transactions WHERE type='depense') AS depenses,
    (SELECT COALESCE(SUM(montant),0) FROM salary_payments WHERE statut='paye') AS salaires,
    (SELECT COALESCE(SUM(montant-montant_paye),0) FROM receivables WHERE statut<>'solde') AS creances_en_cours`);
  const s = q.rows[0];
  const recettes = Number(s.ventes)+Number(s.autres_recettes);
  const charges = Number(s.achats)+Number(s.depenses)+Number(s.salaires);
  res.json({ ...s, recettes_totales: recettes, charges_totales: charges,
    resultat: recettes - charges, tresorerie: await computeTresorerie() });
});

// Situation par bande + KPI zootechniques (ch.7)
router.get('/bands', requirePermission('comptabilite','view'), async (req, res) => {
  const r = await query(`
    SELECT b.id, b.numero, b.nb_poussins, b.prix_achat, bl.nom AS batiment, b.statut,
      COALESCE((SELECT SUM(nombre) FROM mortalities WHERE band_id=b.id),0) AS morts,
      COALESCE((SELECT SUM(quantite) FROM sales WHERE band_id=b.id),0) AS vendus,
      COALESCE((SELECT SUM(quantite_kg) FROM feedings WHERE band_id=b.id),0) AS aliment_kg,
      COALESCE((SELECT SUM(poids_kg) FROM sales WHERE band_id=b.id),0) AS poids_vendu,
      COALESCE((SELECT SUM(montant_total) FROM sales WHERE band_id=b.id),0) AS ca,
      b.prix_achat
        + COALESCE((SELECT SUM(montant_total) FROM purchases WHERE band_id=b.id),0)
        + COALESCE((SELECT SUM(montant) FROM transactions WHERE band_id=b.id AND type='depense'),0) AS charges
    FROM bands b JOIN buildings bl ON bl.id=b.building_id
    ORDER BY b.date_arrivee DESC`);
  const rows = r.rows.map(b => {
    const morts = Number(b.morts), recus = Number(b.nb_poussins);
    const tauxMort = recus ? (morts/recus*100) : 0;
    const ic = Number(b.poids_vendu) ? Number(b.aliment_kg)/Number(b.poids_vendu) : null;
    const poidsMoyen = Number(b.vendus) ? Number(b.poids_vendu)/Number(b.vendus) : null;
    const coutRevient = recus ? Number(b.charges)/recus : null;
    return {
      ...b,
      effectif_vivant: recus - morts - Number(b.vendus),
      taux_mortalite: +tauxMort.toFixed(2),
      taux_viabilite: +(100-tauxMort).toFixed(2),
      indice_consommation: ic!=null?+ic.toFixed(2):null,
      poids_moyen_vente: poidsMoyen!=null?+poidsMoyen.toFixed(2):null,
      cout_revient_sujet: coutRevient!=null?Math.round(coutRevient):null,
      resultat: Number(b.ca) - Number(b.charges),
    };
  });
  res.json(rows);
});

export default router;
