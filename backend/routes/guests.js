import path from 'path';
import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireStaffJwt, requirePropertyContext } from '../middleware/requireStaffJwt.js';
import { requireFeature } from '../lib/permissions.js';
import { guestDocumentUpload, unlinkGuestDocument, UPLOADS_ROOT } from '../lib/guestUploads.js';

const router = Router();
router.use(requireStaffJwt, requirePropertyContext, requireFeature('guests'));

const GUEST_COLS = `id, full_name, email, phone, document_id, document_file, document_file_name, notes, created_at`;

function parseBody(req) {
  const b = req.body ?? {};
  return {
    full_name: b.full_name,
    email: b.email,
    phone: b.phone,
    document_id: b.document_id,
    notes: b.notes,
    clear_document: b.clear_document === 'true' || b.clear_document === true,
  };
}

function uploadMiddleware(req, res, next) {
  guestDocumentUpload.single('document')(req, res, (err) => {
    if (!err) return next();
    const msg = err.message || 'Upload failed.';
    return res.status(400).json({ error: 'Validation', message: msg });
  });
}

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT ${GUEST_COLS}
       FROM guest WHERE property_id = $1 ORDER BY full_name ASC`,
      [req.auth.propertyId],
    );
    return res.json({
      guests: rows.map((g) => ({
        ...g,
        has_document: Boolean(g.document_file),
      })),
    });
  } catch (err) {
    console.error('[guests GET]', err);
    return res.status(500).json({ error: 'Server', message: 'Could not load guests.' });
  }
});

router.get('/:id/document', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ error: 'Validation', message: 'Invalid guest id.' });
  }
  try {
    const { rows } = await pool.query(
      `SELECT document_file, document_file_name FROM guest
       WHERE id = $1 AND property_id = $2`,
      [id, req.auth.propertyId],
    );
    const row = rows[0];
    if (!row?.document_file) {
      return res.status(404).json({ error: 'Not found', message: 'No document on file.' });
    }
    const filePath = path.join(UPLOADS_ROOT, path.basename(row.document_file));
    return res.download(filePath, row.document_file_name || path.basename(row.document_file));
  } catch (err) {
    console.error('[guests document GET]', err);
    return res.status(500).json({ error: 'Server', message: 'Could not download document.' });
  }
});

router.post('/', uploadMiddleware, async (req, res) => {
  const { full_name, email, phone, document_id, notes } = parseBody(req);
  const name = typeof full_name === 'string' ? full_name.trim() : '';
  if (!name) {
    if (req.file) unlinkGuestDocument(req.file.filename);
    return res.status(400).json({ error: 'Validation', message: 'Full name is required.' });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO guest (property_id, full_name, email, phone, document_id, document_file, document_file_name, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING ${GUEST_COLS}`,
      [
        req.auth.propertyId,
        name,
        email != null ? String(email).trim() || null : null,
        phone != null ? String(phone).trim() || null : null,
        document_id != null ? String(document_id).trim() || null : null,
        req.file?.filename ?? null,
        req.file?.originalname ?? null,
        notes != null ? String(notes).trim() || null : null,
      ],
    );
    return res.status(201).json({ guest: { ...rows[0], has_document: Boolean(rows[0].document_file) } });
  } catch (err) {
    if (req.file) unlinkGuestDocument(req.file.filename);
    console.error('[guests POST]', err);
    return res.status(500).json({ error: 'Server', message: 'Could not create guest.' });
  }
});

router.patch('/:id', uploadMiddleware, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    if (req.file) unlinkGuestDocument(req.file.filename);
    return res.status(400).json({ error: 'Validation', message: 'Invalid guest id.' });
  }
  const { full_name, email, phone, document_id, notes, clear_document } = parseBody(req);
  const fields = [];
  const vals = [];

  if (full_name !== undefined) {
    const n = typeof full_name === 'string' ? full_name.trim() : '';
    if (!n) {
      if (req.file) unlinkGuestDocument(req.file.filename);
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

  let previousFile = null;
  try {
    if (req.file || clear_document) {
      const { rows: existing } = await pool.query(
        `SELECT document_file FROM guest WHERE id = $1 AND property_id = $2`,
        [id, req.auth.propertyId],
      );
      if (!existing.length) {
        if (req.file) unlinkGuestDocument(req.file.filename);
        return res.status(404).json({ error: 'Not found', message: 'Guest not found.' });
      }
      previousFile = existing[0].document_file;
    }

    if (req.file) {
      fields.push(`document_file = $${fields.length + 1}`);
      vals.push(req.file.filename);
      fields.push(`document_file_name = $${fields.length + 1}`);
      vals.push(req.file.originalname || req.file.filename);
    } else if (clear_document) {
      fields.push(`document_file = $${fields.length + 1}`);
      vals.push(null);
      fields.push(`document_file_name = $${fields.length + 1}`);
      vals.push(null);
    }

    if (!fields.length) {
      if (req.file) unlinkGuestDocument(req.file.filename);
      return res.status(400).json({ error: 'Validation', message: 'No updates provided.' });
    }

    vals.push(id, req.auth.propertyId);
    const { rows } = await pool.query(
      `UPDATE guest SET ${fields.join(', ')}
       WHERE id = $${fields.length + 1} AND property_id = $${fields.length + 2}
       RETURNING ${GUEST_COLS}`,
      vals,
    );
    if (!rows.length) {
      if (req.file) unlinkGuestDocument(req.file.filename);
      return res.status(404).json({ error: 'Not found', message: 'Guest not found.' });
    }

    if ((req.file || clear_document) && previousFile && previousFile !== rows[0].document_file) {
      unlinkGuestDocument(previousFile);
    }

    return res.json({ guest: { ...rows[0], has_document: Boolean(rows[0].document_file) } });
  } catch (err) {
    if (req.file) unlinkGuestDocument(req.file.filename);
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
    const { rows } = await pool.query(
      `DELETE FROM guest WHERE id = $1 AND property_id = $2
       RETURNING document_file`,
      [id, req.auth.propertyId],
    );
    if (rows[0]?.document_file) unlinkGuestDocument(rows[0].document_file);
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
