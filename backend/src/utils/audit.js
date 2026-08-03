import { query } from '../db/pool.js';

// Écrit une entrée inaltérable dans le journal d'audit (5.12.4)
export async function logAudit({ user, action, module = null, recordId = null, details = null, ip = null }) {
  try {
    await query(
      `INSERT INTO audit_log(user_id,username,action,module,record_id,details,ip)
       VALUES($1,$2,$3,$4,$5,$6,$7)`,
      [user?.id || null, user?.username || null, action, module, recordId, details, ip]
    );
  } catch (e) {
    console.error('audit_log error', e.message);
  }
}
