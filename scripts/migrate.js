require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('../src/db/connection');

async function runMigrations() {
  const file = path.join(__dirname, '../migrations/001_init.sql');
  const sql = fs.readFileSync(file, 'utf8');

  try {
    await pool.query(sql);
    console.log('Migration applied successfully');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await pool.end();
  }
}

runMigrations();
