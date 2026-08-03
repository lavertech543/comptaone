import argon2 from 'argon2';
import { pool } from './pool.js';

// Modules du système (chapitre 6)
export const MODULES = [
  'utilisateurs','batiments','bandes','production','alimentation','mortalite',
  'sanitaire','stocks','achats','ventes','depenses','comptabilite','creances',
  'salaires','rapports','audit','corrections'
];

// Permissions par défaut selon la matrice rôles × modules (chapitre 6)
// ● complet = toutes actions ; ◐ partiel = view (+print/export) ; — = aucun
const FULL   = { v:1,c:1,e:1,d:1,p:1,x:1 };
const READ   = { v:1,c:0,e:0,d:0,p:1,x:1 };
const NONE   = { v:0,c:0,e:0,d:0,p:0,x:0 };
const CREATE = { v:1,c:1,e:0,d:0,p:1,x:0 }; // saisie sans modif/suppr (verrouillage)

const MATRIX = {
  admin: Object.fromEntries(MODULES.map(m => [m, FULL])),
  production: {
    batiments:READ, bandes:READ, production:CREATE, alimentation:CREATE, mortalite:CREATE,
    sanitaire:CREATE, stocks:READ, rapports:READ
  },
  magasinier: {
    alimentation:READ, sanitaire:READ, stocks:FULL, achats:READ, rapports:READ
  },
  comptable: {
    stocks:READ, achats:FULL, ventes:FULL, depenses:FULL, comptabilite:READ,
    creances:READ, salaires:FULL, rapports:FULL
  },
  responsable: {
    batiments:READ, bandes:READ, production:READ, alimentation:READ, mortalite:READ,
    sanitaire:READ, stocks:READ, comptabilite:READ, rapports:READ
  }
};

function permRow(userId, module, p) {
  return [userId, module, !!p.v, !!p.c, !!p.e, !!p.d, !!p.p, !!p.x];
}

async function applyPermissions(userId, role) {
  const map = MATRIX[role] || {};
  for (const module of MODULES) {
    const p = role === 'admin' ? FULL : (map[module] || NONE);
    await pool.query(
      `INSERT INTO permissions(user_id,module,can_view,can_create,can_edit,can_delete,can_print,can_export)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT(user_id,module) DO UPDATE SET
         can_view=$3,can_create=$4,can_edit=$5,can_delete=$6,can_print=$7,can_export=$8`,
      permRow(userId, module, p)
    );
  }
}

async function makeUser(username, fullName, role, password, email) {
  const hash = await argon2.hash(password, { type: argon2.argon2id });
  const r = await pool.query(
    `INSERT INTO users(username,full_name,email,password_hash,role)
     VALUES($1,$2,$3,$4,$5)
     ON CONFLICT(username) DO UPDATE SET full_name=$2, role=$5, password_hash=$4
     RETURNING id`,
    [username, fullName, email, hash, role]
  );
  const id = r.rows[0].id;
  await applyPermissions(id, role);
  return id;
}

async function seed() {
  console.log('🌱 Insertion des données de démonstration…');
  // Idempotence : ne pas re-seeder si des données existent déjà
  const existing = await pool.query('SELECT COUNT(*)::int AS n FROM users');
  if (existing.rows[0].n > 0) { console.log('ℹ️  Base déjà initialisée — seed ignoré.'); await pool.end(); return; }


  // Utilisateurs (un par rôle)
  const admin = await makeUser('admin', 'Administrateur N&K', 'admin', 'Admin@2026', 'admin@nk-avicole.local');
  await makeUser('production', 'Jean Éleveur', 'production', 'Prod@2026', null);
  await makeUser('magasin', 'Awa Magasinière', 'magasinier', 'Stock@2026', null);
  await makeUser('comptable', 'Paul Comptable', 'comptable', 'Compta@2026', 'compta@nk-avicole.local');
  await makeUser('responsable', 'Marie Responsable', 'responsable', 'Resp@2026', null);

  // Exercice courant
  const ex = await pool.query(
    `INSERT INTO exercices(annee,libelle) VALUES($1,$2)
     ON CONFLICT(annee) DO UPDATE SET libelle=$2 RETURNING id`,
    [2026, 'Exercice 2026']
  );
  const exId = ex.rows[0].id;

  // Paramètres
  const params = [
    ['devise','FCFA'],['langue','fr'],['seuil_tresorerie','200000'],
    ['rappel_creance_jours','5'],['rappel_salaire_jours','3'],
    ['entreprise_nom','N&K SARL — Ferme avicole'],
    ['entreprise_adresse','Ferme avicole N&K SARL'],
    ['mortalite_seuil_pct','5']
  ];
  for (const [k,v] of params) {
    await pool.query(`INSERT INTO settings(cle,valeur) VALUES($1,$2)
      ON CONFLICT(cle) DO UPDATE SET valeur=$2`, [k,v]);
  }

  // Bâtiments
  const b1 = (await pool.query(`INSERT INTO buildings(nom,capacite,statut,created_by) VALUES('Poulailler A',5000,'en_production',$1) RETURNING id`,[admin])).rows[0].id;
  const b2 = (await pool.query(`INSERT INTO buildings(nom,capacite,statut,created_by) VALUES('Poulailler B',3000,'en_production',$1) RETURNING id`,[admin])).rows[0].id;
  await pool.query(`INSERT INTO buildings(nom,capacite,statut,created_by) VALUES('Poulailler C',3000,'nettoye',$1)`,[admin]);

  // Bandes
  const bd1 = (await pool.query(
    `INSERT INTO bands(numero,building_id,exercice_id,date_arrivee,fournisseur,nb_poussins,prix_achat,statut,created_by)
     VALUES('BANDE-2026-01',$1,$2,'2026-05-01','Couvoir Central',4800,2400000,'ouverte',$3) RETURNING id`,
    [b1, exId, admin])).rows[0].id;
  const bd2 = (await pool.query(
    `INSERT INTO bands(numero,building_id,exercice_id,date_arrivee,fournisseur,nb_poussins,prix_achat,statut,created_by)
     VALUES('BANDE-2026-02',$1,$2,'2026-06-10','Couvoir Central',2900,1450000,'ouverte',$3) RETURNING id`,
    [b2, exId, admin])).rows[0].id;

  // Production
  await pool.query(`INSERT INTO feedings(band_id,date_op,type_aliment,quantite_kg,created_by) VALUES
    ($1,'2026-05-05','Démarrage',450,$3),($1,'2026-05-20','Croissance',900,$3),($2,'2026-06-15','Démarrage',300,$3)`,[bd1,bd2,admin]);
  await pool.query(`INSERT INTO mortalities(band_id,date_op,nombre,cause,created_by) VALUES
    ($1,'2026-05-06',35,'Stress transport',$3),($1,'2026-05-25',12,'Inconnue',$3),($2,'2026-06-16',20,'Stress transport',$3)`,[bd1,bd2,admin]);
  await pool.query(`INSERT INTO treatments(band_id,date_op,produit,type,dose,created_by) VALUES
    ($1,'2026-05-03','Vaccin Newcastle','vaccin','1 dose/sujet',$3),($2,'2026-06-12','Vaccin Gumboro','vaccin','1 dose/sujet',$3)`,[bd1,bd2,admin]);

  // Produits & stocks
  const p1 = (await pool.query(`INSERT INTO products(nom,categorie,unite,quantite,seuil_min) VALUES('Aliment démarrage','aliment','kg',1200,500) RETURNING id`)).rows[0].id;
  const p2 = (await pool.query(`INSERT INTO products(nom,categorie,unite,quantite,seuil_min) VALUES('Aliment croissance','aliment','kg',300,500) RETURNING id`)).rows[0].id;
  await pool.query(`INSERT INTO products(nom,categorie,unite,quantite,seuil_min) VALUES('Vaccin Newcastle','vaccin','flacon',40,20)`);
  await pool.query(`INSERT INTO stock_movements(product_id,date_op,sens,quantite,motif,created_by) VALUES
    ($1,'2026-05-01','entree',1650,'Achat initial',$2),($1,'2026-05-05','sortie',450,'Distribution bande 01',$2)`,[p1,admin]);

  // Achats
  await pool.query(`INSERT INTO purchases(date_op,fournisseur,description,categorie,quantite,prix_unitaire,montant_total,mode_paiement,band_id,exercice_id,created_by) VALUES
    ('2026-05-01','Provendier SA','Aliment démarrage','aliment',1650,320,528000,'Espèces',$1,$2,$3),
    ('2026-05-02','Pharmavet','Vaccins et médicaments','sanitaire',1,150000,150000,'Virement',$1,$2,$3)`,[bd1,exId,admin]);

  // Ventes
  const s1 = (await pool.query(`INSERT INTO sales(date_op,client,band_id,quantite,poids_kg,prix_unitaire,montant_total,mode_paiement,a_credit,exercice_id,created_by)
    VALUES('2026-07-05','Restaurant Le Palmier',$1,500,900,2500,1250000,'Crédit',TRUE,$2,$3) RETURNING id`,[bd1,exId,admin])).rows[0].id;
  await pool.query(`INSERT INTO sales(date_op,client,band_id,quantite,poids_kg,prix_unitaire,montant_total,mode_paiement,exercice_id,created_by)
    VALUES('2026-07-10','Marché central',$1,300,540,2600,780000,'Espèces',$2,$3)`,[bd1,exId,admin]);

  // Créance liée à la vente à crédit
  await pool.query(`INSERT INTO receivables(client,sale_id,montant,montant_paye,date_creation,date_echeance,statut,created_by)
    VALUES('Restaurant Le Palmier',$1,1250000,250000,'2026-07-05','2026-07-25','partiel',$2)`,[s1,admin]);

  // Dépenses / recettes
  await pool.query(`INSERT INTO transactions(type,date_op,montant,categorie,motif,tiers,mode_paiement,exercice_id,created_by) VALUES
    ('depense','2026-05-10',75000,'Énergie','Facture électricité','SENELEC','Virement',$1,$2),
    ('depense','2026-06-01',40000,'Eau','Facture eau','Régie','Espèces',$1,$2),
    ('recette','2026-07-12',60000,'Fumier','Vente de fumier','Maraîcher local','Espèces',$1,$2)`,[exId,admin]);

  // Employés & salaires
  const e1 = (await pool.query(`INSERT INTO employees(nom,poste,salaire_ref,date_entree,statut) VALUES('Ibrahima Sow','Ouvrier avicole',90000,'2026-01-15','actif') RETURNING id`)).rows[0].id;
  const e2 = (await pool.query(`INSERT INTO employees(nom,poste,salaire_ref,date_entree,statut) VALUES('Fatou Ndiaye','Gardien',75000,'2026-02-01','actif') RETURNING id`)).rows[0].id;
  await pool.query(`INSERT INTO salary_payments(employee_id,periode,montant,date_paiement,mode_paiement,statut,exercice_id,created_by) VALUES
    ($1,'2026-06',90000,'2026-06-30','Espèces','paye',$3,$4),
    ($2,'2026-06',75000,'2026-06-30','Espèces','paye',$3,$4),
    ($1,'2026-07',90000,NULL,NULL,'en_attente',$3,$4)`,[e1,e2,exId,admin]);

  console.log('✅ Données de démonstration insérées.');
  console.log('   Comptes: admin/Admin@2026, production/Prod@2026, magasin/Stock@2026, comptable/Compta@2026, responsable/Resp@2026');
  await pool.end();
}

seed().catch((e) => { console.error('❌ Seed échoué', e); process.exit(1); });
