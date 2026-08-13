import { Router } from 'express';
import argon2 from 'argon2';
import crypto from 'crypto';
import { query } from '../db/pool.js';
import { authRequired } from '../middleware/auth.js';
import { requirePermission } from '../middleware/permissions.js';
import { logAudit } from '../utils/audit.js';
import { sendMail } from '../utils/mail.js';

const router = Router();
const M = 'users';

router.use(authRequired);

// --- 1. LISTER TOUS LES UTILISATEURS ---
router.get('/', requirePermission(M, 'view'), async (req, res) => {
  try {
    const result = await query(
      `SELECT id, full_name, email, matricule, role, is_active, created_at,
              (password_hash IS NOT NULL) AS is_activated
       FROM users 
       ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Erreur GET /api/users :', err);
    res.status(500).json({ error: 'Erreur lors de la récupération des utilisateurs' });
  }
});

// --- 2. DÉTAILS D'UN UTILISATEUR ---
router.get('/:id', requirePermission(M, 'view'), async (req, res) => {
  try {
    const result = await query(
      `SELECT id, full_name, email, matricule, role, is_active, created_at,
              (password_hash IS NOT NULL) AS is_activated
       FROM users WHERE id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erreur GET /api/users/:id :', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// --- HELPERS ---
function generateMatricule(prefix = 'NK') {
  const year = new Date().getFullYear();
  const randomDigits = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${year}-${randomDigits}`;
}

function generateSetupToken() {
  return crypto.randomBytes(32).toString('hex');
}

// --- 3. CRÉER UN UTILISATEUR / ATTRIBUER UN POSTE ---
router.post('/', requirePermission(M, 'create'), async (req, res) => {
  try {
    const { full_name, email, role } = req.body;

    if (!full_name || !role || !email) {
      return res.status(400).json({ error: "Le nom complet, l'email et le rôle sont requis" });
    }

    let matricule;
    let attempts = 0;
    while (attempts < 5) {
      matricule = generateMatricule('NK');
      const exists = await query('SELECT id FROM users WHERE matricule=$1', [matricule]);
      if (exists.rows.length === 0) break;
      attempts++;
    }

    const setupToken = generateSetupToken();
    const setupExpires = new Date(Date.now() + 48 * 60 * 60 * 1000);

    const result = await query(
      `INSERT INTO users (username, full_name, email, matricule, role, password_hash, is_active, setup_token, setup_token_expires)
       VALUES ($1, $2, $3, $4, $5, NULL, TRUE, $6, $7)
       RETURNING id, full_name, email, matricule, role, is_active, created_at`,
      [matricule, full_name, email, matricule, role, setupToken, setupExpires]
    );

    const newUser = result.rows[0];

    try {
      await logAudit({
        user: req.user,
        action: 'create',
        module: M,
        recordId: newUser.id,
        details: `Création de l'utilisateur ${full_name} (${role})`
      });
    } catch (auditErr) {
      console.error('Erreur audit:', auditErr);
    }

    const setupLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/set-password?token=${setupToken}`;

    try {
      await sendMail(
        newUser.email,
        '[N&K] Activez votre compte',
        `Bonjour ${newUser.full_name},\n\nVotre compte a été créé sur la plateforme ComptaOne SARL.\n\nVotre matricule : ${matricule}\n\nPour activer votre compte, définissez votre mot de passe via ce lien (valable 48h) :\n${setupLink}\n\nUne fois votre mot de passe défini, connectez-vous avec votre matricule.`
      );
    } catch (mailErr) {
      console.error('Erreur envoi email activation:', mailErr);
    }

    res.status(201).json(newUser);
  } catch (err) {
    console.error('Erreur POST /api/users :', err);
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Cet email ou matricule existe déjà' });
    }
    res.status(500).json({ error: "Erreur lors de la création de l'utilisateur" });
  }
});

// --- 4. MODIFIER UN UTILISATEUR ---
router.put('/:id', requirePermission(M, 'edit'), async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, email, role, is_active } = req.body;

    const currentRes = await query('SELECT * FROM users WHERE id = $1', [id]);
    if (currentRes.rows.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }
    const current = currentRes.rows[0];

    const updatedName = full_name !== undefined ? full_name : current.full_name;
    const updatedEmail = email !== undefined ? email : current.email;
    const updatedRole = role !== undefined ? role : current.role;
    const updatedActive = is_active !== undefined ? is_active : current.is_active;

    const result = await query(
      `UPDATE users
       SET full_name = $1, email = $2, role = $3, is_active = $4
       WHERE id = $5
       RETURNING id, full_name, email, matricule, role, is_active`,
      [updatedName, updatedEmail, updatedRole, updatedActive, id]
    );

    try {
      await logAudit({
        user: req.user,
        action: 'edit',
        module: M,
        recordId: Number(id),
        details: `Modification de l'utilisateur ${updatedName}`
      });
    } catch (auditErr) {
      console.error('Erreur audit:', auditErr);
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erreur PUT /api/users/:id :', err);
    res.status(500).json({ error: "Erreur lors de la modification de l'utilisateur" });
  }
});

// --- 5. DÉSACTIVER / ARCHIVER UN UTILISATEUR ---
router.patch('/:id/toggle-status', requirePermission(M, 'edit'), async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      `UPDATE users SET is_active = NOT is_active WHERE id = $1 RETURNING id, is_active`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    res.json({ message: 'Statut mis à jour', user: result.rows[0] });
  } catch (err) {
    console.error('Erreur PATCH /api/users/:id/toggle-status :', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// --- 6. RÉCUPÉRER LES PERMISSIONS D'UN UTILISATEUR ---
router.get('/:id/permissions', requirePermission(M, 'view'), async (req, res) => {
  try {
    const r = await query(
      'SELECT module, can_view, can_create, can_edit, can_delete, can_print, can_export FROM permissions WHERE user_id=$1',
      [req.params.id]
    );
    res.json(r.rows);
  } catch (err) {
    console.error('Erreur GET /:id/permissions :', err);
    res.status(500).json({ error: 'Erreur lors de la récupération des permissions' });
  }
});

// --- 7. METTRE À JOUR LES PERMISSIONS D'UN UTILISATEUR ---
router.put('/:id/permissions', requirePermission(M, 'edit'), async (req, res) => {
  try {
    const { permissions } = req.body;
    const userId = req.params.id;

    for (const p of permissions) {
      await query(
        `INSERT INTO permissions (user_id, module, can_view, can_create, can_edit, can_delete, can_print, can_export)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (user_id, module) 
         DO UPDATE SET can_view=$3, can_create=$4, can_edit=$5, can_delete=$6, can_print=$7, can_export=$8`,
        [userId, p.module, !!p.can_view, !!p.can_create, !!p.can_edit, !!p.can_delete, !!p.can_print, !!p.can_export]
      );
    }

    try {
      await logAudit({ user: req.user, action: 'edit', module: 'permissions', recordId: Number(userId), details: 'Mise à jour des droits' });
    } catch (auditErr) {
      console.error('Erreur audit:', auditErr);
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('Erreur PUT /:id/permissions :', err);
    res.status(500).json({ error: 'Erreur lors de la mise à jour des permissions' });
  }
});

// --- 8. RÉGÉNÉRER LE LIEN D'ACTIVATION (si expiré ou non utilisé) ---
router.post('/:id/resend-activation', requirePermission(M, 'edit'), async (req, res) => {
  try {
    const { id } = req.params;

    const userRes = await query('SELECT id, full_name, email, matricule, password_hash FROM users WHERE id=$1', [id]);
    const user = userRes.rows[0];

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }
    if (user.password_hash) {
      return res.status(400).json({ error: 'Ce compte est déjà activé, aucun besoin de renvoyer un lien.' });
    }
    if (!user.email) {
      return res.status(400).json({ error: "Cet utilisateur n'a pas d'adresse email enregistrée." });
    }

    const setupToken = generateSetupToken();
    const setupExpires = new Date(Date.now() + 48 * 60 * 60 * 1000);

    await query(
      'UPDATE users SET setup_token=$1, setup_token_expires=$2 WHERE id=$3',
      [setupToken, setupExpires, id]
    );

    const setupLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/set-password?token=${setupToken}`;

    await sendMail(
      user.email,
      'Activation de  votre compte',
      `Bonjour ${user.full_name},\n\nVoici un nouveau lien pour activer votre compte N&K SARL.\n\nVotre matricule : ${user.matricule}\n\nDéfinissez votre mot de passe via ce lien (valable 48h) :\n${setupLink}\n\nUne fois votre mot de passe défini, connectez-vous avec votre matricule.`
    );

    try {
      await logAudit({ user: req.user, action: 'edit', module: M, recordId: Number(id), details: "Renvoi du lien d'activation" });
    } catch (auditErr) {
      console.error('Erreur audit:', auditErr);
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('Erreur POST /:id/resend-activation :', err);
    res.status(500).json({ error: "Erreur lors de l'envoi du nouveau lien" });
  }
});

export default router;