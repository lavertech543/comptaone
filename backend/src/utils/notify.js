import { query } from '../db/pool.js';
import { sendMail } from './mail.js';

async function setting(cle, def) {
  const r = await query('SELECT valeur FROM settings WHERE cle=$1', [cle]);
  return r.rows[0]?.valeur ?? def;
}

/**
 * Insère une nouvelle alerte OU met à jour le message d'une alerte existante.
 * Ne réinitialise PAS is_read à FALSE si le contenu de l'alerte n'a pas varié.
 */
async function pushOrUpdate(type, referenceId, message, severite, targetRole = 'admin') {
  try {
    // 1. Chercher si une notification non résolue existe déjà
    const existing = await query(
      'SELECT id, message, is_read FROM notifications WHERE type=$1 AND reference_id=$2 AND is_resolved=FALSE',
      [type, referenceId]
    );

    if (existing.rows.length > 0) {
      const currentNotif = existing.rows[0];

      // Si le message est identique, on ne touche à rien (on préserve le "Vu / is_read")
      if (currentNotif.message === message) return;

      // Si la métrique a changé (ex: stock passé de 3 à 1), on met à jour le message.
      // On remet is_read = FALSE pour notifier l'utilisateur de l'aggravation / changement.
      await query(
        `UPDATE notifications 
         SET message = $1, severite = $2, created_at = NOW(), is_read = FALSE 
         WHERE id = $3`,
        [message, severite, currentNotif.id]
      );
    } else {
      // NOUVELLE ALERTE
      await query(
        `INSERT INTO notifications (type, reference_id, message, severite, target_role, created_at, is_resolved, is_read)
         VALUES ($1, $2, $3, $4, $5, NOW(), FALSE, FALSE)`,
        [type, referenceId, message, severite, targetRole]
      );

      // Notification par email aux administrateurs
      query(`SELECT email FROM users WHERE role='admin' AND email IS NOT NULL AND is_active=TRUE`)
        .then((admins) => {
          for (const a of admins.rows) {
            sendMail(a.email, `[N&K] Alerte ${type.toUpperCase()}`, message).catch((err) =>
              console.error(`Erreur envoi mail à ${a.email}:`, err)
            );
          }
        })
        .catch((err) => console.error('Erreur récupération admins pour mail:', err));
    }
  } catch (err) {
    console.error(`Erreur pushOrUpdate (${type}):`, err);
  }
}

/**
 * Marque comme résolues et lues toutes les alertes dont les conditions ne sont plus remplies.
 */
async function resolveIfGone(type, existsSql, params = []) {
  await query(
    `UPDATE notifications 
     SET is_resolved = TRUE, is_read = TRUE
     WHERE type = $1 AND is_resolved = FALSE
       AND NOT EXISTS (${existsSql})`,
    [type, ...params]
  );
}

// Analyse complète et rafraîchissement dynamique des alertes
export async function runAlerts() {
  try {
    // ==========================================
    // 1. STOCKS DES PRODUITS
    // ==========================================
    // Auto-résolution : si le stock est redevenu normal (> seuil_min), 
    // ou si le produit est désactivé/supprimé.
    await resolveIfGone(
      'stock',
      `SELECT 1 FROM products p
       WHERE p.id = notifications.reference_id
         AND p.is_active = TRUE 
         AND p.quantite <= p.seuil_min`
    );

    // Détection des produits dont le stock est sous ou égal au seuil minimal
    const stocks = await query(
      'SELECT id, nom, quantite, seuil_min, unite FROM products WHERE is_active = TRUE AND quantite <= seuil_min'
    );

    for (const s of stocks.rows) {
      await pushOrUpdate(
        'stock',
        s.id,
        `Stock faible : ${s.nom} (${s.quantite} ${s.unite || ''} ≤ seuil ${s.seuil_min})`,
        'warning'
      );
    }

    // ==========================================
    // 2. CRÉANCES
    // ==========================================
    // Auto-résolution si la créance est soldée ou réglée
    await resolveIfGone(
      'creance',
      `SELECT 1 FROM receivables r
       WHERE r.id = notifications.reference_id
         AND r.statut IN ('en_cours', 'partiel') AND (r.montant - r.montant_paye) > 0`
    );

    const jours = Number(await setting('rappel_creance_jours', '5'));
    const cre = await query(
      `SELECT id, client, date_echeance, (montant - montant_paye) AS solde,
              (date_echeance < CURRENT_DATE) AS en_retard
       FROM receivables
       WHERE statut IN ('en_cours', 'partiel') AND (montant - montant_paye) > 0
         AND date_echeance <= CURRENT_DATE + ($1 || ' days')::interval`,
      [jours]
    );

    for (const c of cre.rows) {
      const dateStr = c.date_echeance ? new Date(c.date_echeance).toLocaleDateString('fr-FR') : 'N/A';
      const msg = c.en_retard
        ? `Créance EN RETARD : ${c.client}, solde ${Number(c.solde).toLocaleString('fr-FR')} FCFA (échéance le ${dateStr})`
        : `Créance à échéance proche : ${c.client}, solde ${Number(c.solde).toLocaleString('fr-FR')} FCFA (échéance le ${dateStr})`;
      await pushOrUpdate('creance', c.id, msg, c.en_retard ? 'danger' : 'warning');
    }

    // ==========================================
    // 3. SALAIRES EN ATTENTE
    // ==========================================
    await resolveIfGone(
      'salaire',
      `SELECT 1 FROM salary_payments sp
       WHERE sp.id = notifications.reference_id
         AND sp.statut = 'en_attente'`
    );

    const sal = await query(
      `SELECT sp.id, e.nom, sp.periode 
       FROM salary_payments sp 
       JOIN employees e ON e.id = sp.employee_id
       WHERE sp.statut = 'en_attente'`
    );
    for (const s of sal.rows) {
      await pushOrUpdate('salaire', s.id, `Salaire en attente : ${s.nom} — période ${s.periode}`, 'warning');
    }

    // ==========================================
    // 4. MORTALITÉ PAR BANDE
    // ==========================================
    const seuilMort = Number(await setting('mortalite_seuil_pct', '5'));
    const mort = await query(
      `SELECT b.id, b.numero, b.nb_poussins, COALESCE(SUM(m.nombre), 0) AS morts
       FROM bands b 
       LEFT JOIN mortalities m ON m.band_id = b.id
       WHERE b.statut = 'ouverte' 
       GROUP BY b.id, b.numero, b.nb_poussins`
    );

    for (const m of mort.rows) {
      const pct = m.nb_poussins ? (m.morts / m.nb_poussins) * 100 : 0;
      if (pct >= seuilMort) {
        await pushOrUpdate(
          'mortalite',
          m.id,
          `Mortalité élevée bande ${m.numero} : ${pct.toFixed(1)}% (${m.morts}/${m.nb_poussins})`,
          'danger'
        );
      } else {
        await query(
          "UPDATE notifications SET is_resolved = TRUE, is_read = TRUE WHERE type = 'mortalite' AND reference_id = $1",
          [m.id]
        );
      }
    }

    // ==========================================
    // 5. TRÉSORERIE
    // ==========================================
    const seuilTreso = Number(await setting('seuil_tresorerie', '200000'));
    const treso = await computeTresorerie();
    if (treso < seuilTreso) {
      const msgTreso = `Trésorerie sous le seuil : ${treso.toLocaleString('fr-FR')} FCFA (seuil ${seuilTreso.toLocaleString('fr-FR')} FCFA)`;

      // Vérifier si c'est une nouvelle alerte (pas encore en base) pour envoyer l'email
      const existingTreso = await query(
        "SELECT id, message FROM notifications WHERE type='tresorerie' AND reference_id=0 AND is_resolved=FALSE"
      );
      const isNewTresoAlert = existingTreso.rows.length === 0 || existingTreso.rows[0].message !== msgTreso;

      await pushOrUpdate('tresorerie', 0, msgTreso, 'danger');

      // Envoi email aux admins uniquement si c'est une nouvelle alerte ou si le montant a changé
      if (isNewTresoAlert) {
        query(`SELECT email FROM users WHERE role='admin' AND email IS NOT NULL AND is_active=TRUE`)
          .then((admins) => {
            for (const a of admins.rows) {
              sendMail(a.email, `[N&K] Alerte TRÉSORERIE`, msgTreso).catch((err) =>
                console.error(`Erreur envoi mail trésorerie à ${a.email}:`, err)
              );
            }
          })
          .catch((err) => console.error('Erreur récupération admins (trésorerie):', err));
      }
    } else {
      await query("UPDATE notifications SET is_resolved = TRUE, is_read = TRUE WHERE type = 'tresorerie' AND reference_id = 0");
    }

  } catch (err) {
    console.error('❌ Erreur lors de l’exécution de runAlerts:', err);
  }
}

export async function computeTresorerie() {
  const r = await query(`
    SELECT
      (SELECT COALESCE(SUM(montant_total), 0) FROM sales) +
      (SELECT COALESCE(SUM(montant), 0) FROM transactions WHERE type = 'recette') -
      (SELECT COALESCE(SUM(montant_total), 0) FROM purchases) -
      (SELECT COALESCE(SUM(montant), 0) FROM transactions WHERE type = 'depense') -
      (SELECT COALESCE(SUM(montant), 0) FROM salary_payments WHERE statut = 'paye') AS treso
  `);
  return Number(r.rows[0]?.treso || 0);
}