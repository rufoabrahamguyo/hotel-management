import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireStaffJwt, requirePropertyContext } from '../middleware/requireStaffJwt.js';
import { requireFeature } from '../lib/permissions.js';

const router = Router();
router.use(requireStaffJwt, requirePropertyContext, requireFeature('rooms'));

export const ROOM_STATUSES = ['vacant', 'occupied', 'dirty', 'cleaning', 'inspecting', 'maintenance'];

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, number, floor, type, status, housekeeping_note, base_rate, created_at
       FROM room WHERE property_id = $1 ORDER BY floor ASC, number ASC`,
      [req.auth.propertyId],
    );
    return res.json({ rooms: rows });
  } catch (err) {
    console.error('[rooms GET]', err);
    return res.status(500).json({ error: 'Server', message: 'Could not load rooms.' });
  }
});

router.post('/', async (req, res) => {
  const { number, floor = 1, type = 'Standard', status = 'vacant', housekeeping_note = null, base_rate = 129 } = req.body ?? {};
  const num = typeof number === 'string' ? number.trim() : '';
  if (!num) {
    return res.status(400).json({ error: 'Validation', message: 'Room number is required.' });
  }
  if (!ROOM_STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Validation', message: `status must be one of: ${ROOM_STATUSES.join(', ')}.` });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO room (property_id, number, floor, type, status, housekeeping_note, base_rate)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, number, floor, type, status, housekeeping_note, base_rate, created_at`,
      [req.auth.propertyId, num, Number(floor) || 1, String(type || 'Standard').slice(0, 100), status, housekeeping_note, Number(base_rate) || 0],
    );
    return res.status(201).json({ room: rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Conflict', message: 'That room number already exists.' });
    }
    console.error('[rooms POST]', err);
    return res.status(500).json({ error: 'Server', message: 'Could not create room.' });
  }
});

router.patch('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ error: 'Validation', message: 'Invalid room id.' });
  }
  const { number, floor, type, status, housekeeping_note, base_rate } = req.body ?? {};
  try {
    const { rows: curRows } = await pool.query(`SELECT id FROM room WHERE id = $1 AND property_id = $2`, [id, req.auth.propertyId]);
    if (curRows.length === 0) {
      return res.status(404).json({ error: 'Not found', message: 'Room not found.' });
    }

    const fields = [];
    const vals = [];
    function add(col, val) {
      fields.push(`${col} = $${fields.length + 1}`);
      vals.push(val);
    }
    if (number !== undefined && String(number).trim()) add('number', String(number).trim());
    if (floor !== undefined) add('floor', Number(floor) || 1);
    if (type !== undefined) add('type', String(type || 'Standard').slice(0, 100));
    if (status !== undefined) {
      if (!ROOM_STATUSES.includes(status)) {
        return res.status(400).json({ error: 'Validation', message: `Invalid status.` });
      }
      add('status', status);
    }
    if (housekeeping_note !== undefined) add('housekeeping_note', housekeeping_note === '' ? null : housekeeping_note);
    if (base_rate !== undefined) add('base_rate', Number(base_rate) || 0);

    if (!fields.length) {
      return res.status(400).json({ error: 'Validation', message: 'No updates provided.' });
    }
    vals.push(id, req.auth.propertyId);
    const { rows } = await pool.query(
      `UPDATE room SET ${fields.join(', ')}
       WHERE id = $${fields.length + 1} AND property_id = $${fields.length + 2}
       RETURNING id, number, floor, type, status, housekeeping_note, base_rate, created_at`,
      vals,
    );
    return res.json({ room: rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Conflict', message: 'That room number is already taken.' });
    }
    console.error('[rooms PATCH]', err);
    return res.status(500).json({ error: 'Server', message: 'Could not update room.' });
  }
});

router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ error: 'Validation', message: 'Invalid room id.' });
  }
  try {
    await pool.query(`DELETE FROM room WHERE id = $1 AND property_id = $2`, [id, req.auth.propertyId]);
    return res.status(204).send();
  } catch (err) {
    if (err.code === '23503') {
      return res.status(409).json({
        error: 'Conflict',
        message: 'Remove or cancel reservations linked to this room first.',
      });
    }
    console.error('[rooms DELETE]', err);
    return res.status(500).json({ error: 'Server', message: 'Could not delete room.' });
  }
});

export default router;
