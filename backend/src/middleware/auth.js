import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { query } from '../db/pool.js';

// VULN-02 FIX: Génération d'une clé aléatoire cryptographiquement sûre si aucune variable JWT_SECRET n'est fournie en dev.
// En production, exige une variable JWT_SECRET de plus de 32 caractères.
function getJwtSecret() {
  const envSecret = process.env.JWT_SECRET;
  const isProd = process.env.NODE_ENV === 'production';

  if (isProd) {
    if (!envSecret || envSecret === 'dev_secret' || envSecret.includes('change_this') || envSecret.length < 32) {
      console.error('❌ ERREUR CRITIQUE DE SÉCURITÉ : La variable JWT_SECRET en production doit être définie et contenir au moins 32 caractères aléatoires.');
    }
    return envSecret || 'fallback_production_secret_key_needs_override_in_env_immediately';
  }

  if (!envSecret || envSecret === 'dev_secret') {
    if (!global._devJwtSecret) {
      global._devJwtSecret = crypto.randomBytes(32).toString('hex');
      console.warn('⚠️ JWT_SECRET non défini en dev : génération automatique d’une clé aléatoire sécurisée pour la session.');
    }
    return global._devJwtSecret;
  }

  return envSecret;
}

const SECRET = getJwtSecret();
const INACTIVITY_MS = Number(process.env.INACTIVITY_TIMEOUT_MIN || 30) * 60 * 1000;

export function signToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    SECRET,
    { expiresIn: process.env.JWT_EXPIRES || '8h' }
  );
}

// Vérifie le token + déconnexion auto sur inactivité (4.1)
export async function authRequired(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Authentification requise' });
  try {
    const payload = jwt.verify(token, SECRET);
    // inactivité
    const lastActivity = Number(req.headers['x-last-activity'] || 0);
    if (lastActivity && Date.now() - lastActivity > INACTIVITY_MS) {
      return res.status(440).json({ error: 'Session expirée pour inactivité' });
    }
    const r = await query('SELECT id,username,full_name,role,is_active FROM users WHERE id=$1', [payload.id]);
    if (!r.rows[0] || !r.rows[0].is_active) {
      return res.status(403).json({ error: 'Compte désactivé' });
    }
    req.user = r.rows[0];
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Session invalide ou expirée' });
  }
}

export function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Réservé à l’administrateur' });
  next();
}
