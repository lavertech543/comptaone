import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
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
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ ERREUR DE CONNEXION POSTGRESQL :', err.message);
  } else {
    console.log('✅ CONNECTÉ À POSTGRESQL AVEC SUCCÈS !');
  }
});

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', async (req, res) => {
  try { await pool.query('SELECT 1'); res.json({ status: 'ok', db: 'up' }); }
  catch { res.status(503).json({ status: 'degraded', db: 'down' }); }
});

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

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Erreur serveur' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🐔 API N&K SARL démarrée sur le port ${PORT}`));
