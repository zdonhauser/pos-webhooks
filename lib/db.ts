import { Pool, PoolClient } from 'pg';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : undefined,
  max: 1, // Vercel free tier has connection limits
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export async function queryDB(query: string, values: any[] = []): Promise<any> {
  let client: PoolClient | null = null;

  try {
    client = await pool.connect();
    const res = await client.query(query, values);
    return res;
  } catch (err) {
    console.error('Database query error:', err);
    throw err;
  } finally {
    if (client) {
      client.release();
    }
  }
}

export default pool;