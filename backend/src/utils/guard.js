import { query } from '../db/pool.js';
export async function bandOpen(bandId) {
  const r = await query('SELECT statut FROM bands WHERE id=$1', [bandId]);
  return r.rows[0] && r.rows[0].statut === 'ouverte';
}
