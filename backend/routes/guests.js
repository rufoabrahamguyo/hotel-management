import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireStaffJwt, requirePropertyContext } from '../middleware/requireStaffJwt.js';
import { requireFeature } from '../lib/permissions.js';

const router = Router();
router.use(requireStaffJwt, requirePropertyContext, requireFeature('guests'));

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, full_name, email, phone, document_id, notes, created_at
       FROM guest WHERE property_id = $1 ORDER BY full_name ASC`,
      [req.auth.propertyId],
    );
    return res.json({ guests: rows });
  } catch (err) {
    console.error('[guests GET]', err);
    return res.status(500).json({ error: 'Server', message: 'Could not load guests.' });
  }
});

router.post('/', async (req, res) => {
  const { full_name, email, phone, document_id, notes } = req.body ?? {};
  const name = typeof full_name === 'string' ? full_name.trim() : '';
  if (!name) {
    return res.status(400).json({ error: 'Validation', message: 'Full name is required.' });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO guest (property_id, full_name, email, phone, document_id, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, full_name, email, phone, document_id, notes, created_at`,
      [
        req.auth.propertyId,
        name,
        email != null ? String(email).trim() || null : null,
        phone != null ? String(phone).trim() || null : null,
        document_id != null ? String(document_id).trim() || null : null,
        notes != null ? String(notes).trim() || null : null,
      ],
    );
    return res.status(201).json({ guest: rows[0] });
  } catch (err) {
    console.error('[guests POST]', err);
    return res.status(500).json({ error: 'Server', message: 'Could not create guest.' });
  }
});

router.patch('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ error: 'Validation', message: 'Invalid guest id.' });
  }
  const { full_name, email, phone, document_id, notes } = req.body ?? {};
  const fields = [];
  const vals = [];
  if (full_name !== undefined) {
    const n = typeof full_name === 'string' ? full_name.trim() : '';
    if (!n) {
      return res.status(400).json({ error: 'Validation', message: 'full_name cannot be empty.' });
    }
    fields.push(`full_name = $${fields.length + 1}`);
    vals.push(n);
  }
  if (email !== undefined) {
    fields.push(`email = $${fields.length + 1}`);
    vals.push(email === '' || email === null ? null : String(email).trim());
  }
  if (phone !== undefined) {
    fields.push(`phone = $${fields.length + 1}`);
    vals.push(phone === '' || phone === null ? null : String(phone).trim());
  }
  if (document_id !== undefined) {
    fields.push(`document_id = $${fields.length + 1}`);
    vals.push(document_id === '' || document_id === null ? null : String(document_id).trim());
  }
  if (notes !== undefined) {
    fields.push(`notes = $${fields.length + 1}`);
    vals.push(notes === '' || notes === null ? null : String(notes).trim());
  }
  if (!fields.length) {
    return res.status(400).json({ error: 'Validation', message: 'No updates provided.' });
  }
  vals.push(id, req.auth.propertyId);
  try {
    const { rows } = await pool.query(
      `UPDATE guest SET ${fields.join(', ')}
       WHERE id = $${fields.length + 1} AND property_id = $${fields.length + 2}
       RETURNING id, full_name, email, phone, document_id, notes, created_at`,
      vals,
    );
    if (!rows.length) {
      return res.status(404).json({ error: 'Not found', message: 'Guest not found.' });
    }
    return res.json({ guest: rows[0] });
  } catch (err) {
    console.error('[guests PATCH]', err);
    return res.status(500).json({ error: 'Server', message: 'Could not update guest.' });
  }
});

router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ error: 'Validation', message: 'Invalid guest id.' });
  }
  try {
    await pool.query(`DELETE FROM guest WHERE id = $1 AND property_id = $2`, [id, req.auth.propertyId]);
    return res.status(204).send();
  } catch (err) {
    if (err.code === '23503') {
      return res.status(409).json({
        error: 'Conflict',
        message: 'This guest still has reservations. Cancel or checkout stays first.',
      });
    }
    console.error('[guests DELETE]', err);
    return res.status(500).json({ error: 'Server', message: 'Could not delete guest.' });
  }
});

export default router;
