import { Router } from 'express';
import PDFDocument from 'pdfkit';
import { query } from '../db/pool.js';
import { authRequired } from '../middleware/auth.js';
import { requirePermission } from '../middleware/permissions.js';
import { logAudit } from '../utils/audit.js';

const router = Router();
router.use(authRequired);

async function setting(cle, def) {
  const r = await query('SELECT valeur FROM settings WHERE cle=$1', [cle]);
  return r.rows[0]?.valeur ?? def;
}
const fmt = (n) => Number(n||0).toLocaleString('fr-FR') + ' FCFA';
const dstr = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '';

// En-tête / pied de page entreprise (5.15)
function header(doc, nom, titre, sousTitre) {
  doc.fontSize(16).fillColor('#1a5632').text(nom, { align: 'left' });
  doc.moveDown(0.2);
  doc.fontSize(13).fillColor('#000').text(titre);
  if (sousTitre) doc.fontSize(10).fillColor('#555').text(sousTitre);
  doc.fillColor('#000');
  doc.moveTo(40, doc.y+4).lineTo(555, doc.y+4).strokeColor('#1a5632').stroke();
  doc.moveDown(0.6);
}
function footer(doc) {
  const bottom = doc.page.height - 40;
  doc.fontSize(8).fillColor('#777')
    .text(`Édité le ${new Date().toLocaleString('fr-FR')} — Document N&K SARL`, 40, bottom, { align: 'center', width: 515 });
  doc.fillColor('#000');
}
function table(doc, headers, rows, widths) {
  const startX = 40; let y = doc.y;
  doc.fontSize(9).fillColor('#fff');
  let x = startX;
  doc.rect(startX, y, widths.reduce((a,b)=>a+b,0), 16).fill('#1a5632');
  headers.forEach((h,i) => { doc.fillColor('#fff').text(h, x+3, y+4, { width: widths[i]-6 }); x+=widths[i]; });
  y += 16; doc.fillColor('#000');
  rows.forEach((row, ri) => {
    if (y > doc.page.height - 60) { doc.addPage(); y = 50; }
    x = startX;
    if (ri%2===0) doc.rect(startX, y, widths.reduce((a,b)=>a+b,0), 15).fill('#f0f5f2').fillColor('#000');
    row.forEach((c,i) => { doc.fillColor('#000').fontSize(8).text(String(c ?? ''), x+3, y+3, { width: widths[i]-6 }); x+=widths[i]; });
    y += 15;
  });
  doc.y = y + 10;
}

async function startDoc(res, filename, titre, sousTitre) {
  const nom = await setting('entreprise_nom', 'N&K SARL — Ferme avicole');
  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
  doc.pipe(res);
  doc.on('pageAdded', () => header(doc, nom, titre, sousTitre));
  header(doc, nom, titre, sousTitre);
  return doc;
}

// Rapport financier de synthèse
router.get('/financial.pdf', requirePermission('rapports','export'), async (req, res) => {
  const s = (await query(`SELECT
    (SELECT COALESCE(SUM(montant_total),0) FROM sales) AS ventes,
    (SELECT COALESCE(SUM(montant),0) FROM transactions WHERE type='recette') AS recettes,
    (SELECT COALESCE(SUM(montant_total),0) FROM purchases) AS achats,
    (SELECT COALESCE(SUM(montant),0) FROM transactions WHERE type='depense') AS depenses,
    (SELECT COALESCE(SUM(montant),0) FROM salary_payments WHERE statut='paye') AS salaires`)).rows[0];
  const rec = Number(s.ventes)+Number(s.recettes);
  const dep = Number(s.achats)+Number(s.depenses)+Number(s.salaires);
  const doc = await startDoc(res, 'rapport_financier.pdf', 'Rapport financier de synthèse', `Situation au ${dstr(new Date())}`);
  table(doc, ['Poste','Montant'], [
    ['Ventes', fmt(s.ventes)], ['Autres recettes', fmt(s.recettes)],
    ['— Total recettes', fmt(rec)],
    ['Achats', fmt(s.achats)], ['Dépenses', fmt(s.depenses)], ['Salaires', fmt(s.salaires)],
    ['— Total charges', fmt(dep)],
    ['Résultat', fmt(rec-dep)],
  ], [300, 215]);
  footer(doc); doc.end();
  await logAudit({ user: req.user, action:'export', module:'rapports', details:'rapport financier PDF' });
});

// Rapport par bande (KPI)
router.get('/bands.pdf', requirePermission('rapports','export'), async (req, res) => {
  const r = await query(`SELECT b.numero, bl.nom AS bat, b.nb_poussins, b.statut,
    COALESCE((SELECT SUM(nombre) FROM mortalities WHERE band_id=b.id),0) AS morts,
    COALESCE((SELECT SUM(quantite) FROM sales WHERE band_id=b.id),0) AS vendus,
    COALESCE((SELECT SUM(montant_total) FROM sales WHERE band_id=b.id),0) AS ca
    FROM bands b JOIN buildings bl ON bl.id=b.building_id ORDER BY b.date_arrivee DESC`);
  const doc = await startDoc(res, 'rapport_bandes.pdf', 'Rapport par bande', 'Indicateurs zootechniques et ventes');
  table(doc, ['Bande','Bâtiment','Reçus','Morts','Taux mort.','Vendus','CA'],
    r.rows.map(b => [b.numero, b.bat, b.nb_poussins, b.morts,
      (b.nb_poussins? (b.morts/b.nb_poussins*100).toFixed(1):'0')+'%', b.vendus, fmt(b.ca)]),
    [95,90,50,45,60,50,125]);
  footer(doc); doc.end();
  await logAudit({ user: req.user, action:'export', module:'rapports', details:'rapport bandes PDF' });
});

// Rapport salaires (masse salariale)
router.get('/salaries.pdf', requirePermission('rapports','export'), async (req, res) => {
  const r = await query(`SELECT periode, SUM(montant) AS masse, COUNT(*) AS nb,
    SUM(CASE WHEN statut='en_attente' THEN 1 ELSE 0 END) AS attente
    FROM salary_payments GROUP BY periode ORDER BY periode DESC`);
  const doc = await startDoc(res, 'rapport_salaires.pdf', 'Rapport des salaires', 'Masse salariale par période');
  table(doc, ['Période','Nb paiements','En attente','Masse salariale'],
    r.rows.map(x => [x.periode, x.nb, x.attente, fmt(x.masse)]), [120,110,110,175]);
  footer(doc); doc.end();
  await logAudit({ user: req.user, action:'export', module:'rapports', details:'rapport salaires PDF' });
});

// Rapport journalier d'activité complet
router.get('/daily.pdf', requirePermission('rapports', 'export'), async (req, res) => {
  try {
    const targetDate = req.query.date || new Date().toISOString().split('T')[0];
    const dateFormatted = new Date(targetDate).toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // 1. Récupération des données du jour ciblé
    const feedings = await query(
      `SELECT f.*, b.numero AS bande 
       FROM feedings f 
       JOIN bands b ON b.id=f.band_id 
       WHERE f.date_op = $1 
       ORDER BY f.created_at ASC`,
      [targetDate]
    );

    const mortalities = await query(
      `SELECT m.*, b.numero AS bande 
       FROM mortalities m 
       JOIN bands b ON b.id=m.band_id 
       WHERE m.date_op = $1 
       ORDER BY m.created_at ASC`,
      [targetDate]
    );

    const treatments = await query(
      `SELECT t.*, b.numero AS bande 
       FROM treatments t 
       JOIN bands b ON b.id=t.band_id 
       WHERE t.date_op = $1 
       ORDER BY t.created_at ASC`,
      [targetDate]
    );

    const sales = await query(
      `SELECT s.*, b.numero AS bande 
       FROM sales s 
       LEFT JOIN bands b ON b.id=s.band_id 
       WHERE s.date_op = $1 
       ORDER BY s.created_at ASC`,
      [targetDate]
    );

    const purchases = await query(
      `SELECT p.* 
       FROM purchases p 
       WHERE p.date_op = $1 
       ORDER BY p.created_at ASC`,
      [targetDate]
    );

    const transactions = await query(
      `SELECT t.* 
       FROM transactions t 
       WHERE t.date_op = $1 
       ORDER BY t.created_at ASC`,
      [targetDate]
    );

    const stockMovs = await query(
      `SELECT sm.*, pr.nom AS produit, b.numero AS bande 
       FROM stock_movements sm 
       JOIN products pr ON pr.id=sm.product_id 
       LEFT JOIN bands b ON b.id=sm.band_id 
       WHERE sm.date_op = $1 
       ORDER BY sm.created_at ASC`,
      [targetDate]
    );

    // Calculs de synthèse
    const totalMorts = mortalities.rows.reduce((sum, m) => sum + Number(m.nombre || 0), 0);
    const totalAlimentKg = feedings.rows.reduce((sum, f) => sum + Number(f.quantite_kg || 0), 0);

    const totalVentes = sales.rows.reduce((sum, s) => sum + Number(s.montant_total || 0), 0);
    const totalRecettesTrans = transactions.rows
      .filter(t => t.type === 'recette')
      .reduce((sum, t) => sum + Number(t.montant || 0), 0);
    const totalRecettesJour = totalVentes + totalRecettesTrans;

    const totalAchats = purchases.rows.reduce((sum, p) => sum + Number(p.montant_total || 0), 0);
    const totalDepensesTrans = transactions.rows
      .filter(t => t.type === 'depense')
      .reduce((sum, t) => sum + Number(t.montant || 0), 0);
    const totalChargesJour = totalAchats + totalDepensesTrans;

    const soldeJour = totalRecettesJour - totalChargesJour;

    // 2. Initialisation du PDF
    const doc = await startDoc(
      res, 
      `rapport_journalier_${targetDate}.pdf`, 
      "Rapport Journalier d'Activité", 
      `Bilan complet du ${dateFormatted}`
    );

    // Bloc Synthèse & Indicateurs
    table(doc, ['Indicateur Clé du Jour', 'Valeur Enregistrée'], [
      ['Total Alimentation distribuée', `${totalAlimentKg.toLocaleString('fr-FR')} kg`],
      ['Total Mortalité constatée', `${totalMorts} sujet(s)`],
      ['Total Ventes & Recettes', fmt(totalRecettesJour)],
      ['Total Achats & Dépenses', fmt(totalChargesJour)],
      ['Solde Net de la journée', fmt(soldeJour)]
    ], [260, 255]);

    // Section 1: Alimentation
    if (feedings.rows.length > 0) {
      doc.fontSize(11).fillColor('#1a5632').text('1. Alimentation distribuée', { underline: true });
      doc.moveDown(0.3);
      table(doc, ['Bande', 'Type d’aliment', 'Quantité (kg)', 'Observations'],
        feedings.rows.map(f => [f.bande, f.type_aliment || '—', `${Number(f.quantite_kg).toLocaleString('fr-FR')} kg`, f.observations || '—']),
        [100, 150, 100, 165]
      );
    }

    // Section 2: Mortalité
    if (mortalities.rows.length > 0) {
      doc.fontSize(11).fillColor('#1a5632').text('2. Mortalités enregistrées', { underline: true });
      doc.moveDown(0.3);
      table(doc, ['Bande', 'Nombre', 'Cause suspectée', 'Observations'],
        mortalities.rows.map(m => [m.bande, `${m.nombre} mort(s)`, m.cause || 'Non précisée', m.observations || '—']),
        [100, 90, 160, 165]
      );
    }

    // Section 3: Traitements sanitaires
    if (treatments.rows.length > 0) {
      doc.fontSize(11).fillColor('#1a5632').text('3. Traitements & Soins sanitaires', { underline: true });
      doc.moveDown(0.3);
      table(doc, ['Bande', 'Produit', 'Type', 'Dose', 'Observations'],
        treatments.rows.map(t => [t.bande, t.produit, t.type || '—', t.dose || '—', t.observations || '—']),
        [90, 120, 80, 80, 145]
      );
    }

    // Section 4: Ventes
    if (sales.rows.length > 0) {
      doc.fontSize(11).fillColor('#1a5632').text('4. Ventes effectuées', { underline: true });
      doc.moveDown(0.3);
      table(doc, ['Client', 'Bande', 'Qté', 'Prix unitaire', 'Montant Total', 'Paiement'],
        sales.rows.map(s => [
          s.client || 'Client comptant', 
          s.bande || '—', 
          s.quantite, 
          fmt(s.prix_unitaire), 
          fmt(s.montant_total), 
          s.mode_paiement || 'Espèces'
        ]),
        [120, 70, 45, 90, 100, 90]
      );
    }

    // Section 5: Achats & Dépenses
    const allExpenses = [
      ...purchases.rows.map(p => ({
        libelle: p.description || p.fournisseur || 'Achat matériel/intrant',
        categorie: p.categorie || 'Achat',
        montant: p.montant_total,
        mode: p.mode_paiement || '—'
      })),
      ...transactions.rows.filter(t => t.type === 'depense').map(t => ({
        libelle: t.motif || t.tiers || 'Dépense courante',
        categorie: t.categorie || 'Dépense',
        montant: t.montant,
        mode: t.mode_paiement || '—'
      }))
    ];

    if (allExpenses.length > 0) {
      doc.fontSize(11).fillColor('#1a5632').text('5. Achats & Dépenses de la journée', { underline: true });
      doc.moveDown(0.3);
      table(doc, ['Libellé / Tiers', 'Catégorie', 'Montant', 'Mode de paiement'],
        allExpenses.map(e => [e.libelle, e.categorie, fmt(e.montant), e.mode]),
        [180, 120, 115, 100]
      );
    }

    // Section 6: Mouvements de stock
    if (stockMovs.rows.length > 0) {
      doc.fontSize(11).fillColor('#1a5632').text('6. Mouvements de stock du jour', { underline: true });
      doc.moveDown(0.3);
      table(doc, ['Produit', 'Sens', 'Quantité', 'Motif', 'Bande'],
        stockMovs.rows.map(sm => [
          sm.produit, 
          sm.sens === 'entree' ? 'ENTRÉE' : 'SORTIE', 
          sm.quantite, 
          sm.motif || '—', 
          sm.bande || '—'
        ]),
        [130, 65, 65, 160, 95]
      );
    }

    footer(doc);
    doc.end();

    await logAudit({ 
      user: req.user, 
      action: 'export', 
      module: 'rapports', 
      details: `rapport journalier PDF du ${targetDate}` 
    });
  } catch (err) {
    console.error('Erreur génération rapport journalier PDF :', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Erreur lors de la génération du rapport journalier PDF' });
    }
  }
});

export default router;

