import { query } from '../db/pool.js';

// Écrit une entrée inaltérable dans le journal d'audit (5.12.4)
// VULN-17 FIX: Sanitisation des entrées utilisateur pour empêcher l'injection de logs
export async function logAudit({ user, action, module = null, recordId = null, details = null, ip = null }) {
  try {
    const safeDetails = details ? String(details).replace(/[\r\n\t\x00-\x1F]/g, ' ') : null;
    const safeAction = action ? String(action).replace(/[\r\n\t\x00-\x1F]/g, ' ') : null;
    const safeIp = ip ? String(ip).replace(/[\r\n\t\x00-\x1F]/g, '') : null;

    await query(
      `INSERT INTO audit_log(user_id,username,action,module,record_id,details,ip)
       VALUES($1,$2,$3,$4,$5,$6,$7)`,
      [user?.id || null, user?.username || null, safeAction, module, recordId, safeDetails, safeIp]
    );
  } catch (e) {
    console.error('audit_log error', e.message);
  }
}
