import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireStaffJwt } from '../middleware/requireStaffJwt.js';
import { ROLES } from '../lib/roles.js';

const router = Router();
router.use(requireStaffJwt);

function requireSystemAdmin(req, res, next) {
  if (req.auth.role !== ROLES.SYSTEM_ADMIN) {
    return res.status(403).json({ error: 'Forbidden', message: 'Only a system administrator can manage properties.' });
  }
  next();
}

router.get('/', requireSystemAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, timezone, default_check_in, default_check_out, status, created_at, updated_at
       FROM property WHERE organization_id = $1 ORDER BY name ASC`,
      [req.auth.organizationId],
    );
    return res.json({ properties: rows });
  } catch (err) {
    console.error('[properties GET]', err);
    return res.status(500).json({ error: 'Server', message: 'Could not load properties.' });
  }
});

router.post('/', requireSystemAdmin, async (req, res) => {
  const { name, timezone = 'Africa/Addis_Ababa', default_check_in = '15:00', default_check_out = '11:00' } = req.body ?? {};
  const cleanName = typeof name === 'string' ? name.trim() : '';
  if (!cleanName) {
    return res.status(400).json({ error: 'Validation', message: 'Property name is required.' });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO property (organization_id, name, timezone, default_check_in, default_check_out)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, timezone, default_check_in, default_check_out, status, created_at, updated_at`,
      [req.auth.organizationId, cleanName, String(timezone), String(default_check_in), String(default_check_out)],
    );
    return res.status(201).json({ property: rows[0] });
  } catch (err) {
    console.error('[properties POST]', err);
    return res.status(500).json({ error: 'Server', message: 'Could not create property.' });
  }
});

router.patch('/:id', requireSystemAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ error: 'Validation', message: 'Invalid property id.' });
  }
  const { name, timezone, default_check_in, default_check_out, status } = req.body ?? {};
  if (status !== undefined && status !== 'active' && status !== 'archived') {
    return res.status(400).json({ error: 'Validation', message: 'status must be active or archived.' });
  }

  const fields = [];
  const vals = [];
  function add(col, val) {
    fields.push(`${col} = $${fields.length + 1}`);
    vals.push(val);
  }
  if (name !== undefined && String(name).trim()) add('name', String(name).trim());
  if (timezone !== undefined && String(timezone).trim()) add('timezone', String(timezone).trim());
  if (default_check_in !== undefined && String(default_check_in).trim()) add('default_check_in', String(default_check_in).trim());
  if (default_check_out !== undefined && String(default_check_out).trim()) add('default_check_out', String(default_check_out).trim());
  if (status !== undefined) add('status', status);

  if (!fields.length) {
    return res.status(400).json({ error: 'Validation', message: 'No updates provided.' });
  }
  fields.push(`updated_at = NOW()`);
  vals.push(id, req.auth.organizationId);

  try {
    const { rows } = await pool.query(
      `UPDATE property SET ${fields.join(', ')}
       WHERE id = $${vals.length - 1} AND organization_id = $${vals.length}
       RETURNING id, name, timezone, default_check_in, default_check_out, status, created_at, updated_at`,
      vals,
    );
    if (!rows.length) {
      return res.status(404).json({ error: 'Not found', message: 'Property not found.' });
    }
    return res.json({ property: rows[0] });
  } catch (err) {
    console.error('[properties PATCH]', err);
    return res.status(500).json({ error: 'Server', message: 'Could not update property.' });
  }
});

export default router;
