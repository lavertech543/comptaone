import { Router } from 'express';
import argon2 from 'argon2';
import rateLimit from 'express-rate-limit';
import { query } from '../db/pool.js';
import { signToken, authRequired } from '../middleware/auth.js';
import { getUserPermissions } from '../middleware/permissions.js';
import { logAudit } from '../utils/audit.js';

const router = Router();
const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

// Limite globale par IP : 20 tentatives de connexion max toutes les 15 minutes
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de tentatives de connexion depuis cette adresse. Réessayez plus tard.' }
});

// Limite stricte pour la définition / modification de mot de passe (VULN-14 FIX)
const passwordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de tentatives de modification de mot de passe. Réessayez plus tard.' }
});

// VULN-07 FIX: Validation renforcée de la politique de mot de passe
function validatePasswordComplexity(password) {
  if (!password || password.length < 8) {
    return 'Le mot de passe doit contenir au moins 8 caractères.';
  }
  if (!/[A-Z]/.test(password)) {
    return 'Le mot de passe doit contenir au moins une lettre majuscule.';
  }
  if (!/[a-z]/.test(password)) {
    return 'Le mot de passe doit contenir au moins une lettre minuscule.';
  }
  if (!/[0-9]/.test(password) && !/[^A-Za-z0-9]/.test(password)) {
    return 'Le mot de passe doit contenir au moins un chiffre ou un caractère spécial.';
  }
  return null;
}

// Verification du statut d'initialisation (première utilisation)
router.get('/setup-status', async (req, res) => {
  try {
    const r = await query("SELECT COUNT(*) AS count FROM users WHERE role='admin'");
    const count = parseInt(r.rows[0].count, 10);
    res.json({ setupRequired: count === 0 });
  } catch (err) {
    console.error('Erreur GET /setup-status :', err);
    res.status(500).json({ error: 'Erreur lors de la vérification du statut d’initialisation' });
  }
});

// Création initiale du compte Administrateur
router.post('/setup-admin', passwordLimiter, async (req, res) => {
  try {
    const check = await query("SELECT COUNT(*) AS count FROM users WHERE role='admin'");
    if (parseInt(check.rows[0].count, 10) > 0) {
      return res.status(403).json({ error: 'Un compte administrateur existe déjà dans le système.' });
    }

    const { fullName, email, password } = req.body;
    if (!fullName || !email || !password) {
      return res.status(400).json({ error: 'Veuillez remplir tous les champs obligatoires (Nom complet, Email, Mot de passe).' });
    }

    const emailTrimmed = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailTrimmed)) {
      return res.status(400).json({ error: 'Adresse email invalide.' });
    }

    const pwdErr = validatePasswordComplexity(password);
    if (pwdErr) {
      return res.status(400).json({ error: pwdErr });
    }

    const hash = await argon2.hash(password, { type: argon2.argon2id });

    // Enregistrement de l'administrateur (pour un admin, username = email)
    const newUser = await query(
      `INSERT INTO users(username, full_name, email, password_hash, role, is_active)
       VALUES($1, $2, $3, $4, 'admin', TRUE)
       RETURNING id, username, full_name, email, role`,
      [emailTrimmed, fullName.trim(), emailTrimmed, hash]
    );
    const user = newUser.rows[0];

    // Attribuer toutes les permissions par défaut
    const MODULES = [
      'utilisateurs','batiments','bandes','production','alimentation','mortalite',
      'sanitaire','stocks','achats','ventes','depenses','comptabilite','creances',
      'salaires','rapports','audit','corrections'
    ];
    for (const mod of MODULES) {
      await query(
        `INSERT INTO permissions(user_id, module, can_view, can_create, can_edit, can_delete, can_print, can_export)
         VALUES($1, $2, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE)
         ON CONFLICT (user_id, module) DO UPDATE SET
           can_view=TRUE, can_create=TRUE, can_edit=TRUE, can_delete=TRUE, can_print=TRUE, can_export=TRUE`,
        [user.id, mod]
      );
    }

    await logAudit({ user, action: 'setup_admin', details: 'Création initiale du compte administrateur', ip: req.ip });

    const permissions = await getUserPermissions(user.id, user.role);
    const token = signToken(user);

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        role: user.role,
        email: user.email,
        must_change_password: false
      },
      permissions
    });
  } catch (err) {
    console.error('Erreur POST /setup-admin :', err);
    res.status(500).json({ error: 'Erreur lors de la création du compte administrateur', details: err.message });
  }
});


router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;
    const ip = req.ip;
    if (!username || !password) return res.status(400).json({ error: 'Identifiant et mot de passe requis' });

    const r = await query('SELECT * FROM users WHERE username=$1 OR email=$1', [username]);
    const user = r.rows[0];
    if (!user) {
      await logAudit({ user: { username }, action: 'login_failed', details: 'utilisateur inconnu', ip });
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }

    if (user.role === 'admin') {
      // Les administrateurs doivent obligatoirement se connecter avec leur email
      if (!user.email || username.toLowerCase() !== user.email.toLowerCase()) {
        await logAudit({ user, action: 'login_failed', details: 'admin a tenté une connexion par matricule', ip });
        return res.status(401).json({ error: 'Les administrateurs doivent se connecter avec leur adresse email.' });
      }
    } else {
      // Les employés doivent obligatoirement se connecter avec leur matricule
      if (username !== user.username) {
        await logAudit({ user, action: 'login_failed', details: 'employé a tenté une connexion par email', ip });
        return res.status(401).json({ error: 'Veuillez vous connecter avec votre matricule.' });
      }
    }

    if (!user.is_active) return res.status(403).json({ error: 'Compte désactivé' });
    if (!user.password_hash) {
      return res.status(403).json({ error: 'Compte non activé. Contactez votre administrateur.' });
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
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        role: user.role,
        email: user.email,
        must_change_password: user.must_change_password
      },
      permissions,
    });
  } catch (err) {
    console.error('❌ ERREUR LOGIN:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Route conservée pour les anciens liens d'activation par email (setup_token)
router.post('/set-password', passwordLimiter, async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ error: 'Lien invalide ou mot de passe manquant.' });
    }

    const pwdErr = validatePasswordComplexity(password);
    if (pwdErr) {
      return res.status(400).json({ error: pwdErr });
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
  const r = await query('SELECT must_change_password FROM users WHERE id=$1', [req.user.id]);
  const permissions = await getUserPermissions(req.user.id, req.user.role);
  res.json({
    user: { ...req.user, must_change_password: r.rows[0]?.must_change_password || false },
    permissions
  });
});

router.post('/change-password', authRequired, passwordLimiter, async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!newPassword) return res.status(400).json({ error: 'Nouveau mot de passe requis.' });
  
  const pwdErr = validatePasswordComplexity(newPassword);
  if (pwdErr) {
    return res.status(400).json({ error: pwdErr });
  }

  const r = await query('SELECT password_hash FROM users WHERE id=$1', [req.user.id]);
  const ok = await argon2.verify(r.rows[0].password_hash, oldPassword || '');
  if (!ok) return res.status(400).json({ error: 'Ancien mot de passe incorrect' });
  const hash = await argon2.hash(newPassword, { type: argon2.argon2id });
  await query('UPDATE users SET password_hash=$1, must_change_password=FALSE WHERE id=$2', [hash, req.user.id]);
  await logAudit({ user: req.user, action: 'change_password', module: 'utilisateurs' });
  res.json({ ok: true });
});

export default router;