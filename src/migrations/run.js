const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function runMigrations() {
  const migrationsDir = path.join(__dirname, '../../migrations');
  
  try {
    console.log('Starting database migrations...\n');

    // Get all SQL files in the migrations directory
    const files = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    if (files.length === 0) {
      console.log('No migration files found.');
      return;
    }

    // Run each migration file
    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      console.log(`Running migration: ${file}`);
      
      try {
        await pool.query(sql);
        console.log(`✓ ${file} completed successfully\n`);
      } catch (error) {
        console.error(`✗ ${file} failed:`);
        console.error(error.message);
        console.error('\nMigration aborted.\n');
        throw error;
      }
    }

    console.log('All migrations completed successfully!');
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run migrations
runMigrations();
