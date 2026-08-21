-- ============================================================
--  N&K SARL — Ferme avicole
--  Schéma de base de données (chapitre 9 du cahier des charges)
-- ============================================================

-- ---------- Utilisateurs, rôles, permissions ----------
CREATE TABLE IF NOT EXISTS users (
  id              SERIAL PRIMARY KEY,
  username        VARCHAR(60) UNIQUE NOT NULL,
  full_name       VARCHAR(120) NOT NULL,
  email           VARCHAR(160),
  password_hash   TEXT NOT NULL,
  role            VARCHAR(30) NOT NULL,           -- admin, production, magasinier, comptable, responsable
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  failed_attempts INT NOT NULL DEFAULT 0,
  locked_until    TIMESTAMPTZ,
  last_login      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Permissions par module et action (surcharge du rôle)
-- actions: view, create, edit, delete, print, export
CREATE TABLE IF NOT EXISTS permissions (
  id       SERIAL PRIMARY KEY,
  user_id  INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  module   VARCHAR(40) NOT NULL,
  can_view    BOOLEAN NOT NULL DEFAULT FALSE,
  can_create  BOOLEAN NOT NULL DEFAULT FALSE,
  can_edit    BOOLEAN NOT NULL DEFAULT FALSE,
  can_delete  BOOLEAN NOT NULL DEFAULT FALSE,
  can_print   BOOLEAN NOT NULL DEFAULT FALSE,
  can_export  BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE(user_id, module)
);

-- ---------- Exercices comptables ----------
CREATE TABLE IF NOT EXISTS exercices (
  id          SERIAL PRIMARY KEY,
  annee       INT NOT NULL UNIQUE,
  libelle     VARCHAR(60),
  is_reprise  BOOLEAN NOT NULL DEFAULT FALSE,   -- exercice repris (historique)
  is_closed   BOOLEAN NOT NULL DEFAULT FALSE,   -- verrouillé définitivement
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Bâtiments ----------
CREATE TABLE IF NOT EXISTS buildings (
  id         SERIAL PRIMARY KEY,
  nom        VARCHAR(80) NOT NULL,
  capacite   INT NOT NULL DEFAULT 0,
  statut     VARCHAR(30) NOT NULL DEFAULT 'vide', -- vide, en_production, nettoye, en_preparation
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_by INT REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Bandes (lots) ----------
CREATE TABLE IF NOT EXISTS bands (
  id            SERIAL PRIMARY KEY,
  numero        VARCHAR(40) UNIQUE NOT NULL,
  building_id   INT NOT NULL REFERENCES buildings(id),
  exercice_id   INT REFERENCES exercices(id),
  date_arrivee  DATE NOT NULL,
  fournisseur   VARCHAR(120),
  nb_poussins   INT NOT NULL DEFAULT 0,
  prix_achat    NUMERIC(14,2) NOT NULL DEFAULT 0,
  observations  TEXT,
  statut        VARCHAR(20) NOT NULL DEFAULT 'ouverte', -- ouverte, cloturee
  is_historique BOOLEAN NOT NULL DEFAULT FALSE,
  closed_at     TIMESTAMPTZ,
  closed_by     INT REFERENCES users(id),
  created_by    INT REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Production : alimentation ----------
CREATE TABLE IF NOT EXISTS feedings (
  id          SERIAL PRIMARY KEY,
  band_id     INT NOT NULL REFERENCES bands(id),
  date_op     DATE NOT NULL,
  type_aliment VARCHAR(80),
  quantite_kg NUMERIC(12,2) NOT NULL DEFAULT 0,
  observations TEXT,
  locked      BOOLEAN NOT NULL DEFAULT TRUE,
  created_by  INT REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Production : mortalité ----------
CREATE TABLE IF NOT EXISTS mortalities (
  id         SERIAL PRIMARY KEY,
  band_id    INT NOT NULL REFERENCES bands(id),
  date_op    DATE NOT NULL,
  nombre     INT NOT NULL DEFAULT 0,
  cause      VARCHAR(120),
  observations TEXT,
  locked     BOOLEAN NOT NULL DEFAULT TRUE,
  created_by INT REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Sanitaire : traitements / vaccins ----------
CREATE TABLE IF NOT EXISTS treatments (
  id         SERIAL PRIMARY KEY,
  band_id    INT NOT NULL REFERENCES bands(id),
  date_op    DATE NOT NULL,
  produit    VARCHAR(120),
  type       VARCHAR(40),           -- vaccin, traitement, medicament
  dose       VARCHAR(60),
  observations TEXT,
  locked     BOOLEAN NOT NULL DEFAULT TRUE,
  created_by INT REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Stocks ----------
CREATE TABLE IF NOT EXISTS products (
  id            SERIAL PRIMARY KEY,
  nom           VARCHAR(100) NOT NULL,
  categorie     VARCHAR(50),          -- aliment, vaccin, medicament, materiel, consommable
  unite         VARCHAR(20) DEFAULT 'unité',
  quantite      NUMERIC(14,2) NOT NULL DEFAULT 0,
  seuil_min     NUMERIC(14,2) NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stock_movements (
  id          SERIAL PRIMARY KEY,
  product_id  INT NOT NULL REFERENCES products(id),
  date_op     DATE NOT NULL,
  sens        VARCHAR(10) NOT NULL,   -- entree, sortie
  quantite    NUMERIC(14,2) NOT NULL DEFAULT 0,
  motif       VARCHAR(160),
  band_id     INT REFERENCES bands(id),
  locked      BOOLEAN NOT NULL DEFAULT TRUE,
  created_by  INT REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Achats ----------
CREATE TABLE IF NOT EXISTS purchases (
  id           SERIAL PRIMARY KEY,
  date_op      DATE NOT NULL,
  fournisseur  VARCHAR(120),
  description  VARCHAR(200),
  categorie    VARCHAR(60),
  quantite     NUMERIC(14,2) NOT NULL DEFAULT 1,
  prix_unitaire NUMERIC(14,2) NOT NULL DEFAULT 0,
  montant_total NUMERIC(16,2) NOT NULL DEFAULT 0,
  mode_paiement VARCHAR(40),
  band_id      INT REFERENCES bands(id),
  product_id   INT REFERENCES products(id),
  exercice_id  INT REFERENCES exercices(id),
  is_historique BOOLEAN NOT NULL DEFAULT FALSE,
  locked       BOOLEAN NOT NULL DEFAULT TRUE,
  created_by   INT REFERENCES users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Ventes ----------
CREATE TABLE IF NOT EXISTS sales (
  id           SERIAL PRIMARY KEY,
  date_op      DATE NOT NULL,
  client       VARCHAR(120),
  band_id      INT REFERENCES bands(id),
  quantite     NUMERIC(14,2) NOT NULL DEFAULT 0,
  poids_kg     NUMERIC(14,2),
  prix_unitaire NUMERIC(14,2) NOT NULL DEFAULT 0,
  montant_total NUMERIC(16,2) NOT NULL DEFAULT 0,
  mode_paiement VARCHAR(40),
  a_credit     BOOLEAN NOT NULL DEFAULT FALSE,
  observations TEXT,
  exercice_id  INT REFERENCES exercices(id),
  is_historique BOOLEAN NOT NULL DEFAULT FALSE,
  locked       BOOLEAN NOT NULL DEFAULT TRUE,
  created_by   INT REFERENCES users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Dépenses / Recettes ----------
CREATE TABLE IF NOT EXISTS transactions (
  id           SERIAL PRIMARY KEY,
  type         VARCHAR(10) NOT NULL,   -- depense, recette
  date_op      DATE NOT NULL,
  montant      NUMERIC(16,2) NOT NULL DEFAULT 0,
  categorie    VARCHAR(80),
  motif        VARCHAR(200),
  tiers        VARCHAR(120),           -- bénéficiaire / fournisseur / source
  mode_paiement VARCHAR(40),
  band_id      INT REFERENCES bands(id),
  exercice_id  INT REFERENCES exercices(id),
  is_historique BOOLEAN NOT NULL DEFAULT FALSE,
  locked       BOOLEAN NOT NULL DEFAULT TRUE,
  created_by   INT REFERENCES users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Employés & salaires ----------
CREATE TABLE IF NOT EXISTS employees (
  id            SERIAL PRIMARY KEY,
  nom           VARCHAR(120) NOT NULL,
  poste         VARCHAR(80),
  email         VARCHAR(160),
  salaire_ref   NUMERIC(14,2) NOT NULL DEFAULT 0,
  date_entree   DATE,
  statut        VARCHAR(15) NOT NULL DEFAULT 'actif',  -- actif, inactif
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS salary_payments (
  id           SERIAL PRIMARY KEY,
  employee_id  INT NOT NULL REFERENCES employees(id),
  periode      VARCHAR(20) NOT NULL,   -- ex 2026-07
  montant      NUMERIC(14,2) NOT NULL DEFAULT 0,
  date_paiement DATE,
  mode_paiement VARCHAR(40),
  statut       VARCHAR(15) NOT NULL DEFAULT 'en_attente', -- paye, en_attente
  observations TEXT,
  exercice_id  INT REFERENCES exercices(id),
  is_historique BOOLEAN NOT NULL DEFAULT FALSE,
  locked       BOOLEAN NOT NULL DEFAULT FALSE,
  created_by   INT REFERENCES users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Créances ----------
CREATE TABLE IF NOT EXISTS receivables (
  id           SERIAL PRIMARY KEY,
  client       VARCHAR(120) NOT NULL,
  sale_id      INT REFERENCES sales(id),
  montant      NUMERIC(16,2) NOT NULL DEFAULT 0,
  montant_paye NUMERIC(16,2) NOT NULL DEFAULT 0,
  date_creation DATE NOT NULL,
  date_echeance DATE,
  statut       VARCHAR(20) NOT NULL DEFAULT 'en_cours', -- en_cours, partiel, solde, en_retard
  observations TEXT,
  created_by   INT REFERENCES users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS receivable_payments (
  id            SERIAL PRIMARY KEY,
  receivable_id INT NOT NULL REFERENCES receivables(id),
  date_op       DATE NOT NULL,
  montant       NUMERIC(16,2) NOT NULL DEFAULT 0,
  mode_paiement VARCHAR(40),
  created_by    INT REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Pièces justificatives ----------
CREATE TABLE IF NOT EXISTS attachments (
  id          SERIAL PRIMARY KEY,
  module      VARCHAR(40) NOT NULL,
  record_id   INT NOT NULL,
  filename    VARCHAR(255) NOT NULL,
  original_name VARCHAR(255),
  mimetype    VARCHAR(100),
  uploaded_by INT REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Demandes de correction ----------
CREATE TABLE IF NOT EXISTS corrections (
  id            SERIAL PRIMARY KEY,
  module        VARCHAR(40) NOT NULL,
  record_id     INT NOT NULL,
  champ         VARCHAR(60) NOT NULL,
  ancienne_valeur TEXT,
  nouvelle_valeur TEXT,
  motif         TEXT,
  statut        VARCHAR(15) NOT NULL DEFAULT 'en_attente', -- en_attente, acceptee, refusee
  requested_by  INT REFERENCES users(id),
  reviewed_by   INT REFERENCES users(id),
  reviewed_at   TIMESTAMPTZ,
  commentaire   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Journal d'audit (inaltérable) ----------
CREATE TABLE IF NOT EXISTS audit_log (
  id         BIGSERIAL PRIMARY KEY,
  user_id    INT REFERENCES users(id),
  username   VARCHAR(60),
  action     VARCHAR(40) NOT NULL,     -- login, logout, create, correction_request, correction_validate...
  module     VARCHAR(40),
  record_id  INT,
  details    TEXT,
  ip         VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Notifications ----------
CREATE TABLE IF NOT EXISTS notifications (
  id         SERIAL PRIMARY KEY,
  type       VARCHAR(40) NOT NULL,     -- stock, mortalite, creance, salaire, tresorerie, sanitaire
  message    TEXT NOT NULL,
  severite   VARCHAR(15) NOT NULL DEFAULT 'info', -- info, warning, danger
  target_role VARCHAR(30),
  is_read    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Paramètres système ----------
CREATE TABLE IF NOT EXISTS settings (
  cle    VARCHAR(60) PRIMARY KEY,
  valeur TEXT
);

-- Index utiles
CREATE INDEX IF NOT EXISTS idx_bands_building ON bands(building_id);
CREATE INDEX IF NOT EXISTS idx_feed_band ON feedings(band_id);
CREATE INDEX IF NOT EXISTS idx_mort_band ON mortalities(band_id);
CREATE INDEX IF NOT EXISTS idx_sales_band ON sales(band_id);
CREATE INDEX IF NOT EXISTS idx_purch_band ON purchases(band_id);
CREATE INDEX IF NOT EXISTS idx_tx_band ON transactions(band_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_notif_read ON notifications(is_read);
