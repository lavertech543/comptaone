import jwt from 'jsonwebtoken';
import { query } from '../db/pool.js';

const SECRET = process.env.JWT_SECRET || 'dev_secret';
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
