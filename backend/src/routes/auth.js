import { Router } from 'express';
import argon2 from 'argon2';
import { query } from '../db/pool.js';
import { signToken, authRequired } from '../middleware/auth.js';
import { getUserPermissions } from '../middleware/permissions.js';
import { logAudit } from '../utils/audit.js';

const router = Router();
const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const ip = req.ip;
    if (!username || !password) return res.status(400).json({ error: 'Identifiant et mot de passe requis' });

    // Accepte le matricule (stocké dans username) OU l'email comme identifiant de connexion
    const r = await query('SELECT * FROM users WHERE username=$1 OR email=$1', [username]);
    const user = r.rows[0];
    if (!user) {
      await logAudit({ user: { username }, action: 'login_failed', details: 'utilisateur inconnu', ip });
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }
    if (!user.is_active) return res.status(403).json({ error: 'Compte désactivé' });
    if (!user.password_hash) {
      return res.status(403).json({ error: 'Compte non activé. Consultez votre email pour définir votre mot de passe.' });
    }
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      return res.status(423).json({ error: 'Compte temporairement verrouillé. Réessayez plus tard.' });
    }

    const ok = await argon2.verify(user.password_hash, password);
    if (!ok) {
      const attempts = user.failed_attempts + 1;
      let lockedUntil = null;
      if (attempts >= MAX_ATTEMPTS) lockedUntil = new Date(Date.now() + LOCK_MINUTES * 60000);
      await query('UPDATE users SET failed_attempts=$1, locked_until=$2 WHERE id=$3', [attempts, lockedUntil, user.id]);
      await logAudit({ user, action: 'login_failed', details: `échec ${attempts}/${MAX_ATTEMPTS}`, ip });
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }

    await query('UPDATE users SET failed_attempts=0, locked_until=NULL, last_login=now() WHERE id=$1', [user.id]);
    await logAudit({ user, action: 'login', details: 'connexion réussie', ip });

    const permissions = await getUserPermissions(user.id, user.role);
    const token = signToken(user);
    res.json({
      token,
      user: { id: user.id, username: user.username, full_name: user.full_name, role: user.role, email: user.email },
      permissions,
    });
  } catch (err) {
    console.error('❌ ERREUR LOGIN:', err);
    res.status(500).json({ error: 'Erreur serveur', details: err.message });
  }
});

router.post('/set-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password || password.length < 6) {
      return res.status(400).json({ error: 'Lien invalide ou mot de passe trop court (min 6 caractères)' });
    }

    const r = await query(
      'SELECT id, setup_token_expires FROM users WHERE setup_token=$1',
      [token]
    );
    const user = r.rows[0];

    if (!user) {
      return res.status(400).json({ error: 'Lien invalide ou déjà utilisé.' });
    }
    if (new Date(user.setup_token_expires) < new Date()) {
      return res.status(400).json({ error: 'Ce lien a expiré. Contactez votre administrateur.' });
    }

    const hash = await argon2.hash(password, { type: argon2.argon2id });
    await query(
      'UPDATE users SET password_hash=$1, setup_token=NULL, setup_token_expires=NULL WHERE id=$2',
      [hash, user.id]
    );

    res.json({ ok: true });
  } catch (err) {
    console.error('Erreur set-password:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/logout', authRequired, async (req, res) => {
  await logAudit({ user: req.user, action: 'logout', ip: req.ip });
  res.json({ ok: true });
});

router.get('/me', authRequired, async (req, res) => {
  const permissions = await getUserPermissions(req.user.id, req.user.role);
  res.json({ user: req.user, permissions });
});

router.post('/change-password', authRequired, async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) return res.status(400).json({ error: 'Nouveau mot de passe trop court (min 6)' });
  const r = await query('SELECT password_hash FROM users WHERE id=$1', [req.user.id]);
  const ok = await argon2.verify(r.rows[0].password_hash, oldPassword || '');
  if (!ok) return res.status(400).json({ error: 'Ancien mot de passe incorrect' });
  const hash = await argon2.hash(newPassword, { type: argon2.argon2id });
  await query('UPDATE users SET password_hash=$1 WHERE id=$2', [hash, req.user.id]);
  await logAudit({ user: req.user, action: 'change_password', module: 'utilisateurs' });
  res.json({ ok: true });
});

export default router;