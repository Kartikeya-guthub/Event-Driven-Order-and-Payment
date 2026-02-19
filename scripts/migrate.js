require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('../src/db/connection');

async function runMigrations() {
  const client = await db.client();
  try {
    const filePath = path.join(__dirname, '../migrations/001_init.sql');
    const sql = fs.readFileSync(filePath, 'utf8');

    console.log('Running migration 001_init.sql...');

    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');

    console.log('Migration applied successfully');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
  }
}

runMigrations();
