import { query } from '../db/pool.js';

export const MODULES = [
  'utilisateurs', 'batiments', 'bandes', 'production', 'alimentation', 'mortalite',
  'sanitaire', 'stocks', 'achats', 'ventes', 'depenses', 'comptabilite', 'creances',
  'salaires', 'rapports', 'audit', 'corrections'
];

const FULL = { v: 1, c: 1, e: 1, d: 1, p: 1, x: 1 };
const READ = { v: 1, c: 0, e: 0, d: 0, p: 1, x: 1 };
const NONE = { v: 0, c: 0, e: 0, d: 0, p: 0, x: 0 };
const CREATE = { v: 1, c: 1, e: 0, d: 0, p: 1, x: 0 };

const MATRIX = {
  admin: Object.fromEntries(MODULES.map(m => [m, FULL])),
  production: {
    batiments: READ, bandes: READ, production: CREATE, alimentation: CREATE, mortalite: CREATE,
    sanitaire: CREATE, stocks: READ, rapports: READ
  },
  magasinier: {
    alimentation: READ, sanitaire: READ, stocks: FULL, achats: READ, rapports: READ
  },
  comptable: {
    stocks: READ, achats: FULL, ventes: FULL, depenses: FULL, comptabilite: READ,
    creances: READ, salaires: FULL, rapports: FULL
  },
  responsable: {
    batiments: READ, bandes: READ, production: READ, alimentation: READ, mortalite: READ,
    sanitaire: READ, stocks: READ, comptabilite: READ, rapports: READ
  },
  veterinaire: {
    sanitaire: FULL, mortalite: FULL, stocks: READ, rapports: READ, alimentation: READ
  }
};

export async function applyDefaultPermissions(userId, role) {
  const map = MATRIX[role] || {};
  for (const module of MODULES) {
    const p = role === 'admin' ? FULL : (map[module] || NONE);
    await query(
      `INSERT INTO permissions(user_id,module,can_view,can_create,can_edit,can_delete,can_print,can_export)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT(user_id,module) DO NOTHING`,
      [userId, module, !!p.v, !!p.c, !!p.e, !!p.d, !!p.p, !!p.x]
    );
  }
}

// Vérifie l'autorisation module × action (chapitre 6)
export function requirePermission(module, action = 'view') {
  const col = { view:'can_view', create:'can_create', edit:'can_edit',
                delete:'can_delete', print:'can_print', export:'can_export' }[action];
  return async (req, res, next) => {
    if (req.user?.role === 'admin') return next(); // admin = tous droits

    let r = await query(`SELECT ${col} AS ok FROM permissions WHERE user_id=$1 AND module=$2`,
      [req.user.id, module]);

    if (r.rows.length === 0) {
      await applyDefaultPermissions(req.user.id, req.user.role);
      r = await query(`SELECT ${col} AS ok FROM permissions WHERE user_id=$1 AND module=$2`,
        [req.user.id, module]);
    }

    if (r.rows[0]?.ok) return next();
    return res.status(403).json({ error: `Accès refusé au module « ${module} » (${action})` });
  };
}

export async function getUserPermissions(userId, role) {
  let r = await query('SELECT module,can_view,can_create,can_edit,can_delete,can_print,can_export FROM permissions WHERE user_id=$1', [userId]);
  if (r.rows.length === 0 && role !== 'admin') {
    await applyDefaultPermissions(userId, role);
    r = await query('SELECT module,can_view,can_create,can_edit,can_delete,can_print,can_export FROM permissions WHERE user_id=$1', [userId]);
  }
  const map = {};
  for (const row of r.rows) {
    map[row.module] = {
      view: role === 'admin' || row.can_view,
      create: role === 'admin' || row.can_create,
      edit: role === 'admin' || row.can_edit,
      delete: role === 'admin' || row.can_delete,
      print: role === 'admin' || row.can_print,
      export: role === 'admin' || row.can_export,
    };
  }
  return map;
}

