import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../db/pool.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('Set DATABASE_URL in backend/.env');
    process.exit(1);
  }
  const sqlPath = path.join(__dirname, '..', 'db', 'schema.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  await pool.query(sql);

  const migratePath = path.join(__dirname, '..', 'db', 'migrate_legacy_roles.sql');
  const migrateSql = fs.readFileSync(migratePath, 'utf8');
  await pool.query(migrateSql);

  const pmsPath = path.join(__dirname, '..', 'db', 'migrate_pms_tables.sql');
  const pmsSql = fs.readFileSync(pmsPath, 'utf8');
  await pool.query(pmsSql);

  const multitenantPath = path.join(__dirname, '..', 'db', 'migrate_multitenant.sql');
  const multitenantSql = fs.readFileSync(multitenantPath, 'utf8');
  await pool.query(multitenantSql);

  console.log('Schema + legacy + PMS + multitenant migrations applied.');
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
