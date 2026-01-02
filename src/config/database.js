const { Pool } = require('pg');
const config = require('./index');
const logger = require('./logger');

// Create PostgreSQL connection pool
const pool = new Pool({
  connectionString: config.database.url,
  ssl: config.env === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test database connection
pool.on('connect', () => {
  logger.info('Database connection established');
});

pool.on('error', (err) => {
  logger.error('Unexpected database error', { error: err.message });
});

// Query wrapper with logging
const query = async (text, params) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.debug('Executed query', { text, duration, rows: result.rowCount });
    return result;
  } catch (error) {
    logger.error('Database query error', { text, error: error.message });
    throw error;
  }
};

// Transaction wrapper
const transaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Get a client from the pool for transactions
const getClient = async () => {
  return await pool.connect();
};

module.exports = {
  query,
  transaction,
  getClient,
  pool,
};
