# N&K SARL — Logiciel de gestion et comptabilité (Ferme avicole)

Application web sécurisée couvrant l'ensemble des activités de la ferme avicole
N&K SARL : production, achats, ventes, stocks, comptabilité, créances, salaires,
rapports et gestion des utilisateurs — conformément au cahier des charges **v2.1**.

## Pile technologique (chapitre 10.2 du cahier des charges)

| Couche | Technologie |
|---|---|
| Frontend | **React 18** (Vite), responsive — ordinateur, tablette, smartphone |
| Backend / API | **Node.js + Express** (API REST sécurisée) |
| Base de données | **PostgreSQL 16** |
| Authentification | **JWT** + rôles, mots de passe hachés **argon2id** |
| Rapports | Génération **PDF** côté serveur (en-tête, logo, pied de page, date) |
| E-mail | SMTP (notifications) |
| Déploiement | **Docker Compose** (portable : cloud VPS ou serveur local) |

## Démarrage rapide (Docker)

Prérequis : Docker + Docker Compose.

```bash
cd app
cp .env.example .env      # ajustez les mots de passe / JWT_SECRET pour la production
docker compose up --build
```

- Interface : http://localhost:8080
- API : http://localhost:4000/api
- La base est migrée et alimentée automatiquement au premier démarrage.

## Démarrage manuel (développement)

```bash
# 1) PostgreSQL en local (ou docker compose up db)
# 2) Backend
cd app/backend
npm install
cp ../.env.example .env    # renseigner DB_HOST=localhost, etc.
npm run migrate            # crée le schéma
npm run seed               # données de démonstration
npm start                  # API sur le port 4000

# 3) Frontend
cd app/frontend
npm install
npm run dev                # http://localhost:5173 (proxy /api -> 4000)
```

## Comptes de démonstration

| Identifiant | Mot de passe | Rôle |
|---|---|---|
| `admin` | `Admin@2026` | Administrateur (tous droits) |
| `production` | `Prod@2026` | Employé de production |
| `magasin` | `Stock@2026` | Magasinier |
| `comptable` | `Compta@2026` | Comptable |
| `responsable` | `Resp@2026` | Responsable de ferme |

> ⚠️ Changez ces mots de passe avant toute mise en production.

## Modules livrés (chapitre 5 du cahier des charges)

- **5.1 Bâtiments** — création, statut, capacité, effectif, historique
- **5.2 Bandes** — ouverture/clôture/archivage, règles RG-1 (capacité), RG-2 (bâtiment libre), RG-3 (rattachement)
- **5.3–5.6 Production** — poussins, alimentation, mortalité, sanitaire (vaccins/traitements)
- **5.7 Achats** · **5.8 Ventes & recettes** · **5.9 Dépenses**
- **5.10 Stocks** — entrées/sorties, seuils et alertes automatiques
- **5.11 Comptabilité** — centralisation automatique, résultat par bande et global
- **5.12 Verrouillage, corrections & audit** — données verrouillées, circuit « demande de correction » validé par l'admin, journal d'audit inaltérable, pièces justificatives
- **5.13 Créances** — échéances, encaissements, statuts
- **5.14 Notifications** — stocks, mortalité, créances, salaires, trésorerie
- **5.15 Rapports** — exports PDF avec en-tête/logo/pied de page
- **5.16 Tableau de bord** administrateur
- **5.17 Reprise des exercices antérieurs** (mode historique, verrouillage définitif)
- **5.18 Salaires** — fiches employés, paiements, masse salariale, rappels de paie
- **Chapitre 6** — matrice rôles × modules × actions (view/create/edit/delete/print/export), configurable par utilisateur
- **Chapitre 7** — KPI zootechniques (mortalité, viabilité, IC, GMQ, poids moyen) et économiques (coût de revient, CA, marge, trésorerie, masse salariale)

## Sécurité (chapitre 4 & 8)

- Mots de passe hachés **argon2id**, connexion **JWT**
- Verrouillage de compte après 5 échecs de connexion
- Déconnexion automatique sur inactivité (configurable)
- Autorisations par module et action — aucun accès sans droit explicite
- Confidentialité financière : les rôles non autorisés ne voient aucun chiffre financier
- Transactions atomiques (aucune perte de donnée validée)
- Journal d'audit horodaté et inaltérable

## Architecture

```
app/
├── docker-compose.yml        # Postgres + backend + frontend
├── .env.example
├── backend/                  # API Node.js/Express
│   ├── src/
│   │   ├── db/               # schema.sql, migrate, seed, pool
│   │   ├── middleware/       # auth (JWT), permissions (RBAC)
│   │   ├── routes/           # 1 module = 1 route
│   │   ├── utils/            # audit, notifications, e-mail
│   │   └── server.js
│   └── Dockerfile
└── frontend/                 # React (Vite)
    ├── src/
    │   ├── pages/            # une page par module
    │   ├── components/       # UI réutilisable
    │   ├── context/          # AuthContext (session, permissions)
    │   └── api.js
    └── Dockerfile            # build + nginx
```

## Tests

Le backend a été validé de bout en bout contre un vrai PostgreSQL (27 tests
d'intégration : authentification, matrice de permissions, confidentialité
financière, règles de gestion RG-1/2/3, circuit de verrouillage/correction,
journal d'audit, clôture de bande, génération PDF, alertes). Le frontend est
validé par un build de production réussi.

## Paramétrage (sans redéveloppement)

Via l'écran **Paramètres** (admin) : nom/adresse de l'entreprise, devise,
seuil de trésorerie, délais de rappel (créances, salaires), seuil d'alerte
mortalité. Les droits sont ajustables par utilisateur via **Utilisateurs → Droits**.
