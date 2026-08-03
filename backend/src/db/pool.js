import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
export const pool = new Pool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || 'nk_avicole',
  user: process.env.DB_USER || 'nk_admin',
  password: process.env.DB_PASSWORD || 'changeme_db_password',
  max: 10,
});

export const query = (text, params) => pool.query(text, params);

// Helper de transaction atomique (exigence 8.2)
export async function tx(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const res = await fn(client);
    await client.query('COMMIT');
    return res;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}
