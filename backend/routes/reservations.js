import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireStaffJwt, requirePropertyContext } from '../middleware/requireStaffJwt.js';
import { requireFeature } from '../lib/permissions.js';

const router = Router();
router.use(requireStaffJwt, requirePropertyContext, requireFeature('guests'));

export const RESERVATION_STATUSES = ['upcoming', 'checked_in', 'checked_out', 'cancelled', 'no_show'];

async function overlaps(client, propertyId, roomId, checkIn, checkOut, excludeId) {
  const args = [propertyId, roomId, checkIn, checkOut];
  let sql = `
    SELECT id FROM reservation
    WHERE property_id = $1
      AND room_id = $2
      AND status NOT IN ('cancelled', 'checked_out', 'no_show')
      AND NOT (check_out <= $3::timestamptz OR check_in >= $4::timestamptz)
  `;
  if (excludeId) {
    sql += ` AND id <> $5`;
    args.push(excludeId);
  }
  sql += ` LIMIT 1`;
  const { rows } = await client.query(sql, args);
  return rows.length > 0;
}

function parseTs(v, label) {
  if (!v || typeof v !== 'string') {
    return { error: `${label} must be an ISO datetime string.` };
  }
  const d = Date.parse(v);
  if (!Number.isFinite(d)) {
    return { error: `${label} is not a valid date.` };
  }
  return { ok: true, iso: new Date(d).toISOString() };
}

router.get('/', async (req, res) => {
  const { status, from, to } = req.query;
  try {
    const args = [req.auth.propertyId];
    const where = [`r.property_id = $1`];
    if (status && typeof status === 'string') {
      args.push(status);
      where.push(`r.status = $${args.length}`);
    }
    if (from && typeof from === 'string') {
      const p = parseTs(from, 'from');
      if (p.error) return res.status(400).json({ error: 'Validation', message: p.error });
      args.push(p.iso);
      where.push(`r.check_out >= $${args.length}`);
    }
    if (to && typeof to === 'string') {
      const p = parseTs(to, 'to');
      if (p.error) return res.status(400).json({ error: 'Validation', message: p.error });
      args.push(p.iso);
      where.push(`r.check_in <= $${args.length}`);
    }

    const { rows } = await pool.query(
      `SELECT r.id, r.guest_id, r.room_id, r.check_in, r.check_out, r.status,
              r.adults, r.total_rate, r.notes, r.created_at,
              g.full_name AS guest_name,
              rm.number AS room_number
       FROM reservation r
       INNER JOIN guest g ON g.id = r.guest_id
       INNER JOIN room rm ON rm.id = r.room_id
       WHERE ${where.join(' AND ')}
       ORDER BY r.check_in DESC, r.id DESC`,
      args,
    );
    return res.json({ reservations: rows });
  } catch (err) {
    console.error('[reservations GET]', err);
    return res.status(500).json({ error: 'Server', message: 'Could not load reservations.' });
  }
});

router.post('/', async (req, res) => {
  const { guest_id, room_id, check_in, check_out, adults = 2, total_rate = null, notes = null, status = 'upcoming' } =
    req.body ?? {};
  const gi = Number(guest_id);
  const ri = Number(room_id);
  if (!Number.isFinite(gi) || !Number.isFinite(ri)) {
    return res.status(400).json({ error: 'Validation', message: 'guest_id and room_id are required.' });
  }
  const cIn = parseTs(check_in, 'check_in');
  const cOut = parseTs(check_out, 'check_out');
  if (cIn.error || cOut.error) {
    return res.status(400).json({
      error: 'Validation',
      message: (cIn.error || cOut.error),
    });
  }
  if (new Date(cOut.iso) <= new Date(cIn.iso)) {
    return res.status(400).json({ error: 'Validation', message: 'check_out must be after check_in.' });
  }
  if (!RESERVATION_STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Validation', message: 'Invalid reservation status.' });
  }

  const propertyId = req.auth.propertyId;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const chkGuest = await client.query(`SELECT id FROM guest WHERE id = $1 AND property_id = $2`, [gi, propertyId]);
    if (!chkGuest.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Not found', message: 'Guest not found.' });
    }

    const chkRoom = await client.query(`SELECT id, base_rate FROM room WHERE id = $1 AND property_id = $2`, [ri, propertyId]);
    if (!chkRoom.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Not found', message: 'Room not found.' });
    }

    if (await overlaps(client, propertyId, ri, cIn.iso, cOut.iso, null)) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: 'Conflict',
        message: 'This room already has an active booking overlapping those dates.',
      });
    }

    let rate =
      total_rate == null || total_rate === ''
        ? null
        : Number(total_rate);
    if (!Number.isFinite(rate)) rate = null;
    const nights = Math.max(
      1,
      Math.ceil((new Date(cOut.iso) - new Date(cIn.iso)) / (1000 * 60 * 60 * 24)),
    );
    if (rate == null) {
      rate = Number(chkRoom.rows[0].base_rate || 0) * nights;
    }

    const { rows } = await client.query(
      `INSERT INTO reservation (property_id, guest_id, room_id, check_in, check_out, status, adults, total_rate, notes)
       VALUES ($1, $2, $3, $4::timestamptz, $5::timestamptz, $6, $7, $8, $9)
       RETURNING id`,
      [
        propertyId,
        gi,
        ri,
        cIn.iso,
        cOut.iso,
        status,
        Math.min(Math.max(Number(adults) || 2, 1), 12),
        rate,
        notes == null ? null : String(notes),
      ],
    );
    await client.query('COMMIT');

    const ext = await pool.query(
      `SELECT r.*, g.full_name AS guest_name, rm.number AS room_number
       FROM reservation r
       JOIN guest g ON g.id = r.guest_id
       JOIN room rm ON rm.id = r.room_id
       WHERE r.id = $1`,
      [rows[0].id],
    );
    return res.status(201).json({ reservation: ext.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('[reservations POST]', err);
    return res.status(500).json({ error: 'Server', message: 'Could not create reservation.' });
  } finally {
    client.release();
  }
});

router.patch('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ error: 'Validation', message: 'Invalid reservation id.' });
  }

  const { guest_id, room_id, check_in, check_out, adults, total_rate, notes, status } = req.body ?? {};
  const propertyId = req.auth.propertyId;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: curRows } = await client.query(
      `SELECT * FROM reservation WHERE id = $1 AND property_id = $2 FOR UPDATE`,
      [id, propertyId],
    );
    if (!curRows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Not found', message: 'Reservation not found.' });
    }
    const cur = curRows[0];
    const nextGi = guest_id !== undefined ? Number(guest_id) : Number(cur.guest_id);
    const nextRi = room_id !== undefined ? Number(room_id) : Number(cur.room_id);
    let nextIn = cur.check_in instanceof Date ? cur.check_in.toISOString() : new Date(cur.check_in).toISOString();
    let nextOut =
      cur.check_out instanceof Date ? cur.check_out.toISOString() : new Date(cur.check_out).toISOString();

    if (check_in !== undefined) {
      const p = parseTs(check_in, 'check_in');
      if (p.error) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Validation', message: p.error });
      }
      nextIn = p.iso;
    }
    if (check_out !== undefined) {
      const p = parseTs(check_out, 'check_out');
      if (p.error) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Validation', message: p.error });
      }
      nextOut = p.iso;
    }

    const nextStat = status !== undefined ? String(status) : cur.status;

    if (guest_id !== undefined) {
      if (!Number.isFinite(nextGi)) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Validation', message: 'Invalid guest_id.' });
      }
      const chk = await client.query(`SELECT id FROM guest WHERE id = $1 AND property_id = $2`, [nextGi, propertyId]);
      if (!chk.rows.length) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Not found', message: 'Guest not found.' });
      }
    }

    if (room_id !== undefined) {
      if (!Number.isFinite(nextRi)) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Validation', message: 'Invalid room_id.' });
      }
      const chk = await client.query(`SELECT id FROM room WHERE id = $1 AND property_id = $2`, [nextRi, propertyId]);
      if (!chk.rows.length) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Not found', message: 'Room not found.' });
      }
    }

    if (new Date(nextOut) <= new Date(nextIn)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Validation', message: 'check_out must be after check_in.' });
    }

    if (status !== undefined && !RESERVATION_STATUSES.includes(nextStat)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Validation', message: 'Invalid status.' });
    }

    const overlapsNeeded = !['cancelled', 'checked_out', 'no_show'].includes(nextStat);

    if (overlapsNeeded && (await overlaps(client, propertyId, nextRi, nextIn, nextOut, id))) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: 'Conflict',
        message: 'This room already has an active booking overlapping those dates.',
      });
    }

    const fields = [
      `guest_id = $1`,
      `room_id = $2`,
      `check_in = $3::timestamptz`,
      `check_out = $4::timestamptz`,
      `status = $5`,
    ];
    const vals = [nextGi, nextRi, nextIn, nextOut, nextStat];
    let idx = vals.length;

    if (adults !== undefined) {
      idx += 1;
      fields.push(`adults = $${idx}`);
      vals.push(Math.min(Math.max(Number(adults) || 2, 1), 12));
    }
    if (total_rate !== undefined) {
      idx += 1;
      fields.push(`total_rate = $${idx}`);
      vals.push(total_rate === '' ? null : Number(total_rate));
    }
    if (notes !== undefined) {
      idx += 1;
      fields.push(`notes = $${idx}`);
      vals.push(notes === '' ? null : String(notes));
    }
    vals.push(id, propertyId);
    const { rows } = await client.query(
      `UPDATE reservation SET ${fields.join(', ')}
       WHERE id = $${vals.length - 1} AND property_id = $${vals.length}
       RETURNING *`,
      vals,
    );
    const row = rows[0];

    if (cur.status !== 'checked_in' && row.status === 'checked_in') {
      await client.query(`UPDATE room SET status = 'occupied' WHERE id = $1`, [Number(row.room_id)]);
    }
    if (cur.status !== 'checked_out' && row.status === 'checked_out') {
      await client.query(`UPDATE room SET status = 'dirty' WHERE id = $1`, [Number(row.room_id)]);
    }

    await client.query('COMMIT');

    const ext = await pool.query(
      `SELECT r.*, g.full_name AS guest_name, rm.number AS room_number
       FROM reservation r
       JOIN guest g ON g.id = r.guest_id
       JOIN room rm ON rm.id = r.room_id
       WHERE r.id = $1`,
      [id],
    );
    return res.json({ reservation: ext.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('[reservations PATCH]', err);
    return res.status(500).json({ error: 'Server', message: 'Could not update reservation.' });
  } finally {
    client.release();
  }
});

router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ error: 'Validation', message: 'Invalid reservation id.' });
  }
  try {
    await pool.query(`DELETE FROM reservation WHERE id = $1 AND property_id = $2`, [id, req.auth.propertyId]);
    return res.status(204).send();
  } catch (err) {
    console.error('[reservations DELETE]', err);
    return res.status(500).json({ error: 'Server', message: 'Could not delete reservation.' });
  }
});

export default router;
