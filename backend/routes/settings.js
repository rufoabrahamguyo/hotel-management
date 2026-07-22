import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireStaffJwt, requirePropertyContext } from '../middleware/requireStaffJwt.js';
import { canWriteSettings } from '../lib/roles.js';
import { requireFeature } from '../lib/permissions.js';

const router = Router();
router.use(requireStaffJwt, requirePropertyContext, requireFeature('settings'));

function requireSettingsWrite(req, res, next) {
  if (!canWriteSettings(req.auth.role)) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Only a system administrator or general manager can update property settings.',
    });
  }
  next();
}

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name AS property_name, timezone, default_check_in, default_check_out, updated_at
       FROM property WHERE id = $1 AND organization_id = $2`,
      [req.auth.propertyId, req.auth.organizationId],
    );
    if (!rows.length) {
      return res.status(404).json({ error: 'Not found', message: 'Property not found.' });
    }
    return res.json({ settings: rows[0] });
  } catch (err) {
    console.error('[settings GET]', err);
    return res.status(500).json({ error: 'Server', message: 'Could not load settings.' });
  }
});

router.put('/', requireSettingsWrite, async (req, res) => {
  const { property_name, timezone, default_check_in, default_check_out } = req.body ?? {};
  try {
    const { rows } = await pool.query(
      `UPDATE property SET
         name = COALESCE(NULLIF(trim($1::text), ''), name),
         timezone = COALESCE(NULLIF(trim($2::text), ''), timezone),
         default_check_in = COALESCE(NULLIF(trim($3::text), ''), default_check_in),
         default_check_out = COALESCE(NULLIF(trim($4::text), ''), default_check_out),
         updated_at = NOW()
       WHERE id = $5 AND organization_id = $6
       RETURNING id, name AS property_name, timezone, default_check_in, default_check_out, updated_at`,
      [
        property_name != null ? String(property_name) : null,
        timezone != null ? String(timezone) : null,
        default_check_in != null ? String(default_check_in) : null,
        default_check_out != null ? String(default_check_out) : null,
        req.auth.propertyId,
        req.auth.organizationId,
      ],
    );
    if (!rows.length) {
      return res.status(404).json({ error: 'Not found', message: 'Property not found.' });
    }
    return res.json({ settings: rows[0] });
  } catch (err) {
    console.error('[settings PUT]', err);
    return res.status(500).json({ error: 'Server', message: 'Could not save settings.' });
  }
});

export default router;
