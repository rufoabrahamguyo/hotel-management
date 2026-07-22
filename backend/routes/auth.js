import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../db/pool.js';
import { getJwtSecret } from '../lib/jwt.js';
import { requireStaffJwt } from '../middleware/requireStaffJwt.js';
import { resolveAccessibleProperties, staffHasPropertyAccess } from '../lib/tenancy.js';
import { ROLES } from '../lib/roles.js';

const router = Router();
const SALT_ROUNDS = 12;

/** Public org signup. Explicit true enables; explicit false disables; unset → allowed except in production. */
export function isPublicRegisterAllowed() {
  const v = process.env.ALLOW_PUBLIC_REGISTER?.trim().toLowerCase();
  if (v === 'true' || v === '1' || v === 'yes') return true;
  if (v === 'false' || v === '0' || v === 'no') return false;
  return process.env.NODE_ENV !== 'production';
}

function signToken({ id, role, username, organizationId, propertyId }) {
  return jwt.sign(
    {
      sub: String(id),
      role,
      username,
      organizationId,
      propertyId: propertyId ?? undefined,
    },
    getJwtSecret(),
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' },
  );
}

function toUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email || `${row.username}@staff.local`,
    role: row.role,
    username: row.username,
  };
}

/** Whether self-serve org registration is currently enabled. */
router.get('/registration-status', (_req, res) => {
  return res.json({ allowed: isPublicRegisterAllowed() });
});

/**
 * Public self-serve signup: creates a brand-new organization, its first
 * property, and an owner account (SystemAdmin) for that org, all in one
 * transaction. Returns an immediately usable session, same shape as /login.
 * Gated by ALLOW_PUBLIC_REGISTER (off by default in production).
 */
router.post('/register', async (req, res) => {
  if (!isPublicRegisterAllowed()) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Public registration is disabled. Contact an administrator.',
    });
  }

  const { organizationName, propertyName, name, username, email, password } = req.body ?? {};

  const cleanOrgName = typeof organizationName === 'string' ? organizationName.trim() : '';
  const cleanPropertyName = typeof propertyName === 'string' ? propertyName.trim() : '';
  const cleanName = typeof name === 'string' ? name.trim() : '';
  const cleanUsername = typeof username === 'string' ? username.trim().toLowerCase() : '';
  const cleanEmail = typeof email === 'string' && email.trim() ? email.trim().toLowerCase() : null;

  if (!cleanOrgName) {
    return res.status(400).json({ error: 'Validation', message: 'Organization name is required.' });
  }
  if (!cleanPropertyName) {
    return res.status(400).json({ error: 'Validation', message: 'First property name is required.' });
  }
  if (!cleanName) {
    return res.status(400).json({ error: 'Validation', message: 'Your name is required.' });
  }
  if (!cleanUsername || cleanUsername.length < 3 || !/^[a-z0-9._-]+$/.test(cleanUsername)) {
    return res.status(400).json({
      error: 'Validation',
      message: 'Username must be at least 3 characters (letters, numbers, dots, dashes, underscores only).',
    });
  }
  if (!password || typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ error: 'Validation', message: 'Password must be at least 8 characters.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const orgResult = await client.query(
      `INSERT INTO organization (name) VALUES ($1) RETURNING id`,
      [cleanOrgName],
    );
    const organizationId = orgResult.rows[0].id;

    const propResult = await client.query(
      `INSERT INTO property (organization_id, name) VALUES ($1, $2) RETURNING id`,
      [organizationId, cleanPropertyName],
    );
    const propertyId = propResult.rows[0].id;

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
    const staffResult = await client.query(
      `INSERT INTO staff (name, role, username, email, password_hash, status, manager_staff_id, organization_id)
       VALUES ($1, $2, $3, $4, $5, 'active', NULL, $6)
       RETURNING id, name, role, username, email`,
      [cleanName, ROLES.SYSTEM_ADMIN, cleanUsername, cleanEmail, password_hash, organizationId],
    );
    const row = staffResult.rows[0];

    await client.query('COMMIT');

    const token = signToken({
      id: row.id,
      role: row.role,
      username: row.username,
      organizationId,
      propertyId,
    });

    return res.status(201).json({
      token,
      user: toUser(row),
      properties: [{ id: propertyId, name: cleanPropertyName, status: 'active' }],
      propertyId,
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Conflict', message: 'That username is already taken.' });
    }
    console.error('[auth/register]', err);
    return res.status(500).json({ error: 'Server', message: 'Could not create your account.' });
  } finally {
    client.release();
  }
});

/**
 * Sign in with email or username (same field as the frontend input).
 * If the staff member has access to exactly one property, the returned token
 * is immediately usable. Otherwise the frontend must call /select-property
 * (with one of the returned `properties`) before hitting property-scoped routes.
 */
router.post('/login', async (req, res) => {
  const { email, password } = req.body ?? {};
  const key = typeof email === 'string' ? email.trim().toLowerCase() : '';

  if (!key || !password) {
    return res.status(400).json({ error: 'Validation', message: 'Email/username and password are required.' });
  }

  try {
    const { rows } = await pool.query(
      `SELECT id, name, role, username, email, password_hash, status, organization_id
       FROM staff
       WHERE lower(username) = $1
          OR lower(coalesce(email, '')) = $1
       LIMIT 1`,
      [key],
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Invalid credentials.' });
    }

    const row = rows[0];

    if (row.status === 'suspended') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'This account is suspended. Contact your manager or system administrator.',
      });
    }

    const ok = await bcrypt.compare(password, row.password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Invalid credentials.' });
    }

    const properties = await resolveAccessibleProperties({
      staffId: row.id,
      role: row.role,
      organizationId: row.organization_id,
    });
    const propertyId = properties.length === 1 ? properties[0].id : null;

    const token = signToken({
      id: row.id,
      role: row.role,
      username: row.username,
      organizationId: row.organization_id,
      propertyId,
    });

    return res.json({
      token,
      user: toUser(row),
      properties,
      propertyId,
    });
  } catch (err) {
    console.error('[auth/login]', err);
    return res.status(500).json({ error: 'Server', message: 'Sign-in failed.' });
  }
});

/** Properties the signed-in staff member may assign or switch to (same rules as login). */
router.get('/properties', requireStaffJwt, async (req, res) => {
  try {
    const properties = await resolveAccessibleProperties({
      staffId: req.auth.staffId,
      role: req.auth.role,
      organizationId: req.auth.organizationId,
    });
    return res.json({ properties });
  } catch (err) {
    console.error('[auth/properties]', err);
    return res.status(500).json({ error: 'Server', message: 'Could not load properties.' });
  }
});

/**
 * Switch the active property for the current session (also used right after
 * login when a staff member has access to more than one property).
 */
router.post('/select-property', requireStaffJwt, async (req, res) => {
  const propertyId = Number(req.body?.propertyId);
  if (!Number.isFinite(propertyId)) {
    return res.status(400).json({ error: 'Validation', message: 'propertyId is required.' });
  }

  try {
    const allowed = await staffHasPropertyAccess({
      staffId: req.auth.staffId,
      role: req.auth.role,
      organizationId: req.auth.organizationId,
      propertyId,
    });
    if (!allowed) {
      return res.status(403).json({ error: 'Forbidden', message: 'You do not have access to that property.' });
    }

    const { rows } = await pool.query(
      `SELECT id, name, role, username, email, organization_id FROM staff WHERE id = $1`,
      [req.auth.staffId],
    );
    if (!rows.length) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Invalid session.' });
    }
    const row = rows[0];

    const properties = await resolveAccessibleProperties({
      staffId: row.id,
      role: row.role,
      organizationId: row.organization_id,
    });

    const token = signToken({
      id: row.id,
      role: row.role,
      username: row.username,
      organizationId: row.organization_id,
      propertyId,
    });

    return res.json({ token, user: toUser(row), properties, propertyId });
  } catch (err) {
    console.error('[auth/select-property]', err);
    return res.status(500).json({ error: 'Server', message: 'Could not switch property.' });
  }
});

export default router;
