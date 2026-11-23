const { Pool } = require('pg');

function buildPool() {
  const connectionString = (process.env.DATABASE_URL || '').trim();

  // Neon (and any other hosted Postgres) — use the pooled connection string.
  if (connectionString) {
    const sslOff = process.env.DATABASE_SSL === 'false';
    return new Pool({
      connectionString,
      max: Number(process.env.DB_POOL_MAX || 5),
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: Number(process.env.DB_CONNECTION_TIMEOUT_MS || 10000),
      ssl: sslOff ? false : { rejectUnauthorized: false },
    });
  }

  const host = process.env.DB_HOST || 'localhost';
  const password = process.env.DB_PASSWORD;
  const remote = host !== 'localhost' && host !== '127.0.0.1';

  if (remote && (typeof password !== 'string' || password.length === 0)) {
    throw new Error(
      'Set DATABASE_URL (Neon) or DB_PASSWORD in the root .env before using a remote PostgreSQL host.',
    );
  }

  const needsSsl = process.env.DB_SSL === 'true' || /neon\.tech$|\.supabase\.(co|com)$/i.test(host);

  return new Pool({
    host,
    port: Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'elearning_db',
    user: process.env.DB_USER || 'postgres',
    password,
    max: Number(process.env.DB_POOL_MAX || (remote ? 5 : 10)),
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: Number(
      process.env.DB_CONNECTION_TIMEOUT_MS || (remote ? 10000 : 2000),
    ),
    ...(needsSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  });
}

const pool = buildPool();

pool.on('connect', () => {
  if (process.env.NODE_ENV !== 'production') {
    console.log('Database connected');
  }
});

pool.on('error', (err) => {
  console.error('Database error:', err.message);
});

const query = (text, params) => pool.query(text, params);
const getClient = () => pool.connect();

module.exports = { query, getClient, pool };
