require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('../src/db/connection');

async function runMigrations() {
  const client = await db.client();

  try {
    await client.query('BEGIN');

    // 1. Create migrations tracking table
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        run_on TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    // 2. Get already executed migrations
    const { rows } = await client.query('SELECT name FROM migrations');
    const executed = new Set(rows.map(r => r.name));

    // 3. Read all migration files
    const migrationsDir = path.join(__dirname, '../migrations');

    const files = fs
      .readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort(); // ensures correct order

    for (const file of files) {
      if (executed.has(file)) {
        console.log(`Skipping ${file}`);
        continue;
      }

      console.log(`Running ${file}...`);

      const sql = fs.readFileSync(
        path.join(migrationsDir, file),
        'utf8'
      );

      await client.query(sql);

      // Mark migration as executed
      await client.query(
        'INSERT INTO migrations (name) VALUES ($1)',
        [file]
      );

      console.log(`Applied ${file}`);
    }

    await client.query('COMMIT');
    console.log('All migrations done');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
  }
}

runMigrations();