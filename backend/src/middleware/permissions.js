import { query } from '../db/pool.js';

// Vérifie l'autorisation module × action (chapitre 6)
export function requirePermission(module, action = 'view') {
  const col = { view:'can_view', create:'can_create', edit:'can_edit',
                delete:'can_delete', print:'can_print', export:'can_export' }[action];
  return async (req, res, next) => {
    if (req.user?.role === 'admin') return next(); // admin = tous droits
    const r = await query(`SELECT ${col} AS ok FROM permissions WHERE user_id=$1 AND module=$2`,
      [req.user.id, module]);
    if (r.rows[0]?.ok) return next();
    return res.status(403).json({ error: `Accès refusé au module « ${module} » (${action})` });
  };
}

export async function getUserPermissions(userId, role) {
  const r = await query('SELECT module,can_view,can_create,can_edit,can_delete,can_print,can_export FROM permissions WHERE user_id=$1', [userId]);
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
