import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { pool } from './db/pool.js';

import auth from './routes/auth.js';
import users from './routes/users.js';
import buildings from './routes/buildings.js';
import bands from './routes/bands.js';
import production from './routes/production.js';
import stock from './routes/stock.js';
import finance from './routes/finance.js';
import receivables from './routes/receivables.js';
import salaries from './routes/salaries.js';
import accounting from './routes/accounting.js';
import dashboard from './routes/dashboard.js';
import corrections from './routes/corrections.js';
import audit from './routes/audit.js';
import notifications from './routes/notifications.js';
import exercices from './routes/exercices.js';
import settings from './routes/settings.js';
import attachments from './routes/attachments.js';
import reports from './routes/reports.js';

const app = express();

// Configuration proxy pour rate limiting derrière Docker / Nginx (VULN-10 FIX)
app.set('trust proxy', 1);

// Sécurité : en-têtes HTTP (X-Frame-Options, CSP, X-Content-Type-Options, etc.)
app.use(helmet());

// CORS restreint à l'origine frontend autorisée uniquement
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'http://localhost:5173',
  'http://localhost:8080',
];
app.use(cors({
  origin: (origin, callback) => {
    // Autoriser les requêtes sans origine (Postman, curl, SSR) ou les origines connues
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origine CORS non autorisée : ${origin}`));
    }
  },
  credentials: true,
}));

// Limite réduite à 500kb pour réduire le risque de DoS par payload
app.use(express.json({ limit: '500kb' }));

// Route de vérification de santé
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'up' });
  } catch {
    res.status(503).json({ status: 'degraded', db: 'down' });
  }
});

// Enregistrement des routes API
app.use('/api/auth', auth);
app.use('/api/users', users);
app.use('/api/buildings', buildings);
app.use('/api/bands', bands);
app.use('/api/production', production);
app.use('/api/stock', stock);
app.use('/api/finance', finance);
app.use('/api/receivables', receivables);
app.use('/api/salaries', salaries);
app.use('/api/accounting', accounting);
app.use('/api/dashboard', dashboard);
app.use('/api/corrections', corrections);
app.use('/api/audit', audit);
app.use('/api/notifications', notifications);
app.use('/api/exercices', exercices);
app.use('/api/settings', settings);
app.use('/api/attachments', attachments);
app.use('/api/reports', reports);

// Route fallback 404 pour les endpoints d'API non trouvés
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'Ressource introuvable' });
});

// Middleware global de gestion des erreurs
app.use((err, req, res, next) => {
  console.error('❌ Erreur serveur non interceptée :', err);
  const statusCode = err.status || err.statusCode || 500;
  const isProd = process.env.NODE_ENV === 'production';
  // En production, ne jamais exposer les détails internes (stack traces, noms de tables…)
  const message = isProd && statusCode === 500
    ? 'Erreur interne du serveur'
    : (err.message || 'Erreur interne du serveur');
  res.status(statusCode).json({ error: message });
});

const PORT = process.env.PORT || 4000;

// Test de connexion à la base de données et démarrage du serveur
async function startServer() {
  try {
    await pool.query('SELECT NOW()');
    console.log('✅ CONNECTÉ À POSTGRESQL AVEC SUCCÈS !');
  } catch (err) {
    console.error('❌ ERREUR DE CONNEXION POSTGRESQL :', err.message);
  }

  const server = app.listen(PORT, () => {
    console.log(`🐔 API N&K SARL démarrée sur le port ${PORT}`);
  });

  // Graceful shutdown (Fermeture propre)
  const shutdown = async (signal) => {
    console.log(`\n🛑 Signal ${signal} reçu. Arrêt propre du serveur...`);
    server.close(async () => {
      console.log('🔒 Serveur HTTP fermé.');
      try {
        await pool.end();
        console.log('🔒 Pool PostgreSQL fermé avec succès.');
        process.exit(0);
      } catch (err) {
        console.error('❌ Erreur lors de la fermeture du pool PostgreSQL :', err.message);
        process.exit(1);
      }
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

startServer();

