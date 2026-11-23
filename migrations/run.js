require('../server/loadEnv');
const fs = require('fs');
const path = require('path');
const { pool } = require('../server/config/database');

async function runMigrations() {
  const client = await pool.connect();
  try {
    console.log('🚀 Running migrations...\n');

    const migrationsDir = path.join(__dirname);
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf-8');
      console.log(`  Running: ${file}`);
      await client.query(sql);
      console.log(`  ✅ Done: ${file}\n`);
    }

    console.log('✅ All migrations completed successfully!');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations();
