import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../db/pool.js';
import { requireStaffJwt, requireUserManagement } from '../middleware/requireStaffJwt.js';
import {
  ROLES,
  creatableRolesForActor,
  canChangeStatus,
  canDeleteTarget,
  listStaffVisibility,
} from '../lib/roles.js';
import { resolveAccessibleProperties } from '../lib/tenancy.js';

const router = Router();
const SALT_ROUNDS = 12;

router.use(requireStaffJwt, requireUserManagement);

router.get('/creatable-roles', async (req, res) => {
  const roles = creatableRolesForActor(req.auth.role).sort((a, b) => a.localeCompare(b));
  return res.json({ roles });
});

router.get('/', async (req, res) => {
  try {
    const { where, params } = listStaffVisibility(req.auth.role, req.auth.staffId);
    const orgParamIdx = params.length + 1;
    const { rows } = await pool.query(
      `SELECT s.id, s.name, s.role, s.username, s.email, s.status, s.manager_staff_id, s.created_at,
              COALESCE(array_agg(sp.property_id) FILTER (WHERE sp.property_id IS NOT NULL), '{}') AS property_ids
       FROM staff s
       LEFT JOIN staff_property sp ON sp.staff_id = s.id
       WHERE s.organization_id = $${orgParamIdx} AND (${where})
       GROUP BY s.id
       ORDER BY s.id ASC`,
      [...params, req.auth.organizationId],
    );
    return res.json({ staff: rows });
  } catch (err) {
    console.error('[admin/staff GET]', err);
    return res.status(500).json({ error: 'Server', message: 'Could not list staff.' });
  }
});

router.post('/', async (req, res) => {
  const { name, role, username, password, property_ids } = req.body ?? {};
  const allowedRoles = creatableRolesForActor(req.auth.role);

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Validation', message: 'Name is required.' });
  }
  if (!role || typeof role !== 'string' || !allowedRoles.includes(role)) {
    return res.status(403).json({
      error: 'Forbidden',
      message: allowedRoles.length
        ? `You may only create: ${allowedRoles.join(', ')}.`
        : 'You cannot create staff accounts.',
    });
  }
  if (!username || typeof username !== 'string' || !username.trim()) {
    return res.status(400).json({ error: 'Validation', message: 'Username is required.' });
  }
  if (!password || typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({
      error: 'Validation',
      message: 'Password must be at least 8 characters.',
    });
  }

  let propertyIds = Array.isArray(property_ids)
    ? [...new Set(property_ids.map(Number).filter(Number.isFinite))]
    : [];

  if (role === ROLES.SYSTEM_ADMIN) {
    propertyIds = [];
  } else {
    if (!propertyIds.length) {
      return res.status(400).json({ error: 'Validation', message: 'Assign at least one property.' });
    }
    const accessible = await resolveAccessibleProperties({
      staffId: req.auth.staffId,
      role: req.auth.role,
      organizationId: req.auth.organizationId,
    });
    const accessibleIds = new Set(accessible.map((p) => p.id));
    if (propertyIds.some((id) => !accessibleIds.has(id))) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You cannot grant access to a property you do not manage.',
      });
    }
  }

  const cleanUser = username.trim().toLowerCase();
  const cleanName = name.trim();
  const mgrId = Number(req.auth.staffId);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    const result = await client.query(
      `INSERT INTO staff (name, role, username, password_hash, status, manager_staff_id, organization_id)
       VALUES ($1, $2, $3, $4, 'active', $5, $6)
       RETURNING id, name, role, username, email, status, manager_staff_id, created_at`,
      [cleanName, role, cleanUser, password_hash, mgrId, req.auth.organizationId],
    );
    const row = result.rows[0];

    if (propertyIds.length) {
      const values = propertyIds.map((_, i) => `($1, $${i + 2})`).join(', ');
      await client.query(
        `INSERT INTO staff_property (staff_id, property_id) VALUES ${values}`,
        [row.id, ...propertyIds],
      );
    }

    await client.query('COMMIT');
    return res.status(201).json({
      staff: {
        id: row.id,
        name: row.name,
        role: row.role,
        username: row.username,
        email: row.email,
        status: row.status,
        manager_staff_id: row.manager_staff_id,
        created_at: row.created_at,
        property_ids: propertyIds,
      },
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    if (err.code === '23505') {
      return res.status(409).json({
        error: 'Conflict',
        message: 'That username is already taken.',
      });
    }
    console.error('[admin/staff POST]', err);
    return res.status(500).json({ error: 'Server', message: 'Could not create staff member.' });
  } finally {
    client.release();
  }
});

router.patch('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id < 1) {
    return res.status(400).json({ error: 'Validation', message: 'Invalid staff id.' });
  }

  const { status } = req.body ?? {};
  if (status !== 'active' && status !== 'suspended') {
    return res.status(400).json({ error: 'Validation', message: 'status must be active or suspended.' });
  }

  try {
    const { rows: targetRows } = await pool.query(
      `SELECT id, role, username, manager_staff_id, status FROM staff WHERE id = $1 AND organization_id = $2`,
      [id, req.auth.organizationId],
    );
    if (targetRows.length === 0) {
      return res.status(404).json({ error: 'Not found', message: 'No such staff member.' });
    }
    const target = targetRows[0];

    if (!canChangeStatus(req.auth.role, req.auth.staffId, target)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You cannot change the status of this staff member.',
      });
    }

    if (target.role === ROLES.SYSTEM_ADMIN && status === 'suspended') {
      const { rows: cnt } = await pool.query(
        `SELECT COUNT(*)::int AS c FROM staff
         WHERE role IN ('SystemAdmin', 'Admin') AND status = 'active' AND organization_id = $1`,
        [req.auth.organizationId],
      );
      if (cnt[0].c <= 1) {
        return res.status(400).json({
          error: 'Validation',
          message: 'Cannot suspend the only active system administrator.',
        });
      }
    }

    await pool.query(`UPDATE staff SET status = $1 WHERE id = $2`, [status, id]);
    return res.json({ ok: true, id, status });
  } catch (err) {
    console.error('[admin/staff PATCH]', err);
    return res.status(500).json({ error: 'Server', message: 'Could not update staff status.' });
  }
});

router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id < 1) {
    return res.status(400).json({ error: 'Validation', message: 'Invalid staff id.' });
  }

  if (id === req.auth.staffId) {
    return res.status(400).json({ error: 'Validation', message: 'You cannot remove your own account while signed in.' });
  }

  try {
    const { rows: targetRows } = await pool.query(
      `SELECT id, role, manager_staff_id FROM staff WHERE id = $1 AND organization_id = $2`,
      [id, req.auth.organizationId],
    );
    if (targetRows.length === 0) {
      return res.status(404).json({ error: 'Not found', message: 'No such staff member.' });
    }

    const target = targetRows[0];

    if (!canDeleteTarget(req.auth.role, req.auth.staffId, target)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You cannot remove this staff member.',
      });
    }

    if (target.role === ROLES.SYSTEM_ADMIN || target.role === 'Admin') {
      const { rows: countRows } = await pool.query(
        `SELECT COUNT(*)::int AS c FROM staff
         WHERE role IN ('SystemAdmin', 'Admin') AND organization_id = $1`,
        [req.auth.organizationId],
      );
      if (countRows[0].c <= 1) {
        return res.status(400).json({
          error: 'Validation',
          message: 'Cannot delete the only system administrator.',
        });
      }
    }

    await pool.query(`DELETE FROM staff WHERE id = $1`, [id]);
    return res.status(204).send();
  } catch (err) {
    console.error('[admin/staff DELETE]', err);
    return res.status(500).json({ error: 'Server', message: 'Could not remove staff member.' });
  }
});

export default router;
