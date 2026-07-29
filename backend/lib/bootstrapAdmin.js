import bcrypt from 'bcryptjs';
import { pool } from '../db/pool.js';
import { ROLES } from './roles.js';

const SALT_ROUNDS = 12;

/**
 * If there is no SystemAdmin (or legacy Admin) in `staff`, create one from BOOTSTRAP_ADMIN_* env vars.
 */
export async function ensureBootstrapAdmin() {
  const username = process.env.BOOTSTRAP_ADMIN_USERNAME?.trim().toLowerCase();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  const name = process.env.BOOTSTRAP_ADMIN_NAME?.trim() || 'System Administrator';
  const emailRaw = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim();
  const email = emailRaw ? emailRaw.toLowerCase() : null;

  try {
    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS c FROM staff WHERE role IN ('SystemAdmin', 'Admin')`,
    );
    if (rows[0].c > 0) {
      console.log(
        '[bootstrap] System administrator already exists; BOOTSTRAP_ADMIN_* ignored. Reset DB (`docker compose down -v`) to apply new bootstrap credentials.',
      );
      return;
    }

    if (!username || !password) {
      console.warn(
        '[bootstrap] No system administrator exists. Set BOOTSTRAP_ADMIN_USERNAME and BOOTSTRAP_ADMIN_PASSWORD in .env, then restart.',
      );
      return;
    }

    const { rows: orgRows } = await pool.query(`SELECT id FROM organization ORDER BY id LIMIT 1`);
    const organizationId = orgRows[0]?.id;
    if (!organizationId) {
      console.warn('[bootstrap] No organization exists yet; run `npm run init-db` first.');
      return;
    }

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
    await pool.query(
      `INSERT INTO staff (name, role, username, email, password_hash, status, manager_staff_id, organization_id)
       VALUES ($1, $2, $3, $4, $5, 'active', NULL, $6)`,
      [name, ROLES.SYSTEM_ADMIN, username, email, password_hash, organizationId],
    );
    console.log('[bootstrap] Created initial System Administrator from BOOTSTRAP_ADMIN_*.');
  } catch (err) {
    console.error('[bootstrap]', err.message);
  }
}
