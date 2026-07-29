/**
 * Presentation / demo seed - idempotent.
 *
 * Requires schema + migrations applied and a running Postgres.
 * Prefer Docker Compose Postgres, then:
 *
 *   npm run seed:demo
 *
 * Demo password for all seeded staff: Demo1234!
 * Bootstrap SystemAdmin (from BOOTSTRAP_ADMIN_*) is left as-is.
 */
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import pg from 'pg';
import { ROLES } from '../lib/roles.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.join(__dirname, '..');
const repoRoot = path.join(backendRoot, '..');

dotenv.config({ path: path.join(backendRoot, '.env') });
// Root Compose `.env` wins for POSTGRES_* so seed hits the mapped host port.
dotenv.config({ path: path.join(repoRoot, '.env'), override: true });

const { Pool } = pg;
const SALT_ROUNDS = 10;
const DEMO_PASSWORD = 'Demo1234!';
const DEMO_MARKER = '[demo-seed]';

const ORG_NAME = 'Hotely Hospitality Group';
const PROPERTY_NAME = 'Addis Riviera Hotel';

const ROOMS = [
  { number: '101', floor: 1, type: 'Standard', status: 'occupied', base_rate: 129, note: 'Guest in-house - do not disturb till 10:00' },
  { number: '102', floor: 1, type: 'Standard', status: 'vacant', base_rate: 129, note: 'Ready for assignment' },
  { number: '103', floor: 1, type: 'Deluxe', status: 'occupied', base_rate: 159, note: 'Extra towels requested' },
  { number: '104', floor: 1, type: 'Deluxe', status: 'vacant', base_rate: 159, note: 'Inspected and cleared' },
  { number: '105', floor: 1, type: 'Suite', status: 'vacant', base_rate: 229, note: 'Welcome amenities set' },
  { number: '106', floor: 2, type: 'Standard', status: 'dirty', base_rate: 129, note: 'Checkout - linens + bathroom' },
  { number: '107', floor: 2, type: 'Standard', status: 'cleaning', base_rate: 129, note: 'In progress' },
  { number: '108', floor: 2, type: 'Deluxe', status: 'vacant', base_rate: 159, note: 'Ready for assignment' },
  { number: '109', floor: 2, type: 'Deluxe', status: 'inspecting', base_rate: 159, note: 'Ready for FO check' },
  { number: '110', floor: 2, type: 'Suite', status: 'maintenance', base_rate: 229, note: 'AC unit - awaiting parts' },
  { number: '201', floor: 3, type: 'Standard', status: 'upcoming_placeholder', base_rate: 139, note: 'Hold for arrival today' },
  { number: '202', floor: 3, type: 'Standard', status: 'vacant', base_rate: 139, note: 'Ready for assignment' },
  { number: '203', floor: 3, type: 'Executive', status: 'occupied', base_rate: 199, note: 'Late checkout approved' },
];

const GUESTS = [
  { full_name: 'Amina Bekele', email: 'amina.bekele@example.com', phone: '+254712000101', document_id: 'KE-1001' },
  { full_name: 'Daniel Haile', email: 'daniel.haile@example.com', phone: '+254722000102', document_id: 'KE-1002' },
  { full_name: 'Sara Mengistu', email: 'sara.m@example.com', phone: '+254733000103', document_id: 'KE-1003' },
  { full_name: 'Yohannes Tadesse', email: 'y.tadesse@example.com', phone: '+254700000104', document_id: 'KE-1004' },
  { full_name: 'Helen Assefa', email: 'helen.assefa@example.com', phone: '+254711000105', document_id: 'KE-1005' },
  { full_name: 'Michael Okonkwo', email: 'm.okonkwo@example.com', phone: '+254720000106', document_id: 'KE-1006' },
  { full_name: 'Fatima Noor', email: 'fatima.noor@example.com', phone: '+254710000107', document_id: 'KE-1007' },
  { full_name: 'James Carter', email: 'j.carter@example.com', phone: '+254701000108', document_id: 'KE-1008' },
];

/** Relative to "today" at noon local - status + room mapping after guests/rooms exist. */
const RESERVATIONS = [
  { guest: 'Amina Bekele', room: '101', status: 'checked_in', inDays: -1, outDays: 2, adults: 2, rate: 258 },
  { guest: 'Daniel Haile', room: '103', status: 'checked_in', inDays: -2, outDays: 1, adults: 1, rate: 477 },
  { guest: 'Sara Mengistu', room: '203', status: 'checked_in', inDays: 0, outDays: 3, adults: 2, rate: 597 },
  { guest: 'Yohannes Tadesse', room: '201', status: 'upcoming', inDays: 0, outDays: 2, adults: 2, rate: 278 },
  { guest: 'Helen Assefa', room: '105', status: 'upcoming', inDays: 1, outDays: 4, adults: 2, rate: 687 },
  { guest: 'Michael Okonkwo', room: '108', status: 'upcoming', inDays: 2, outDays: 5, adults: 1, rate: 477 },
  { guest: 'Fatima Noor', room: '106', status: 'checked_out', inDays: -3, outDays: -1, adults: 2, rate: 258 },
  { guest: 'James Carter', room: '104', status: 'checked_out', inDays: -5, outDays: -2, adults: 2, rate: 477 },
];

const STAFF = [
  { username: 'gm', name: 'Maxwell Githinji', role: ROLES.GENERAL_MANAGER, email: 'gm@hotely.demo' },
  { username: 'fom', name: 'Adede Nkosi', role: ROLES.FRONT_OFFICE_MANAGER, email: 'fom@hotely.demo' },
  { username: 'reception', name: 'Rufo Abraham', role: ROLES.RECEPTIONIST, email: 'reception@hotely.demo' },
  { username: 'hkmanager', name: 'Hadassah Mumbi', role: ROLES.HOUSEKEEPING_MANAGER, email: 'hk.mgr@hotely.demo' },
  { username: 'house', name: 'Yvonne Karimi', role: ROLES.HOUSEKEEPING, email: 'house@hotely.demo' },
  { username: 'maint', name: 'Abebe Kebede', role: ROLES.MAINTENANCE, email: 'maint@hotely.demo' },
  { username: 'revenue', name: 'Selamawit Berhanu', role: ROLES.REVENUE_MANAGER, email: 'revenue@hotely.demo' },
  { username: 'accountant', name: 'Tewodros Abebe', role: ROLES.ACCOUNTANT, email: 'accountant@hotely.demo' },
];

function resolveDatabaseUrl() {
  // Prefer Compose credentials from root `.env` (correct host port, e.g. 5435).
  const user = process.env.POSTGRES_USER?.trim();
  const password = process.env.POSTGRES_PASSWORD;
  if (user && password) {
    const db = process.env.POSTGRES_DB?.trim() || 'hotel';
    const port = process.env.POSTGRES_PORT?.trim() || '5432';
    return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@localhost:${port}/${db}`;
  }

  if (process.env.DATABASE_URL?.trim()) return process.env.DATABASE_URL.trim();

  return 'postgresql://hotel:hotel@localhost:5432/hotel';
}

function dayAt(offsetDays, hour = 15) {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  d.setDate(d.getDate() + offsetDays);
  return d;
}

async function main() {
  const databaseUrl = resolveDatabaseUrl();
  const pool = new Pool({ connectionString: databaseUrl, max: 5 });

  try {
    await pool.query('SELECT 1');
  } catch (err) {
    console.error('Cannot connect to Postgres. Is Docker up?');
    console.error(`Tried: ${databaseUrl.replace(/:[^:@/]+@/, ':***@')}`);
    console.error(err.message);
    process.exit(1);
  }

  const client = await pool.connect();
  try {
    const { rows: existing } = await client.query(
      `SELECT COUNT(*)::int AS c FROM guest WHERE notes = $1`,
      [DEMO_MARKER],
    );
    if (existing[0].c > 0) {
      // Refresh demo staff display names if the seed list changed.
      for (const s of STAFF) {
        await client.query(`UPDATE staff SET name = $1, email = $2 WHERE username = $3`, [
          s.name,
          s.email,
          s.username,
        ]);
      }
      // Refresh demo guest contact details (e.g. phone country code).
      for (const g of GUESTS) {
        await client.query(
          `UPDATE guest SET phone = $1, document_id = $2, email = $3
           WHERE full_name = $4 AND notes = $5`,
          [g.phone, g.document_id, g.email, g.full_name, DEMO_MARKER],
        );
      }
      // Refresh room notes (e.g. remove typographic dashes).
      for (const room of ROOMS) {
        const status = room.status === 'upcoming_placeholder' ? 'vacant' : room.status;
        await client.query(
          `UPDATE room SET housekeeping_note = $1, status = $2
           WHERE number = $3 AND property_id = (
             SELECT id FROM property ORDER BY id LIMIT 1
           )`,
          [room.note, status, room.number],
        );
      }
      console.log('Demo seed already present. Staff, guests, and room notes refreshed.');
      console.log(`Login tip: reception / ${DEMO_PASSWORD}  (or your BOOTSTRAP_ADMIN_*)`);
      return;
    }

    await client.query('BEGIN');

    let orgId;
    const { rows: orgs } = await client.query(`SELECT id, name FROM organization ORDER BY id LIMIT 1`);
    if (orgs[0]) {
      orgId = orgs[0].id;
      await client.query(`UPDATE organization SET name = $1 WHERE id = $2`, [ORG_NAME, orgId]);
    } else {
      const { rows } = await client.query(
        `INSERT INTO organization (name) VALUES ($1) RETURNING id`,
        [ORG_NAME],
      );
      orgId = rows[0].id;
    }

    let propertyId;
    const { rows: props } = await client.query(
      `SELECT id FROM property WHERE organization_id = $1 ORDER BY id LIMIT 1`,
      [orgId],
    );
    if (props[0]) {
      propertyId = props[0].id;
      await client.query(
        `UPDATE property
         SET name = $1, timezone = 'Africa/Addis_Ababa',
             default_check_in = '15:00', default_check_out = '11:00',
             status = 'active', updated_at = NOW()
         WHERE id = $2`,
        [PROPERTY_NAME, propertyId],
      );
    } else {
      const { rows } = await client.query(
        `INSERT INTO property (organization_id, name, timezone, default_check_in, default_check_out)
         VALUES ($1, $2, 'Africa/Addis_Ababa', '15:00', '11:00')
         RETURNING id`,
        [orgId, PROPERTY_NAME],
      );
      propertyId = rows[0].id;
    }

    // Ensure bootstrap admin (if any) is on this org.
    await client.query(
      `UPDATE staff SET organization_id = $1
       WHERE role IN ('SystemAdmin', 'Admin') AND organization_id IS DISTINCT FROM $1`,
      [orgId],
    );

    const roomIds = {};
    for (const room of ROOMS) {
      const status = room.status === 'upcoming_placeholder' ? 'vacant' : room.status;
      const { rows: found } = await client.query(
        `SELECT id FROM room WHERE property_id = $1 AND number = $2`,
        [propertyId, room.number],
      );
      if (found[0]) {
        roomIds[room.number] = found[0].id;
        await client.query(
          `UPDATE room SET floor = $1, type = $2, status = $3, housekeeping_note = $4, base_rate = $5
           WHERE id = $6`,
          [room.floor, room.type, status, room.note, room.base_rate, found[0].id],
        );
      } else {
        const { rows } = await client.query(
          `INSERT INTO room (property_id, number, floor, type, status, housekeeping_note, base_rate)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING id`,
          [propertyId, room.number, room.floor, room.type, status, room.note, room.base_rate],
        );
        roomIds[room.number] = rows[0].id;
      }
    }

    const guestIds = {};
    for (const g of GUESTS) {
      const { rows } = await client.query(
        `INSERT INTO guest (property_id, full_name, email, phone, document_id, notes)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [propertyId, g.full_name, g.email, g.phone, g.document_id, DEMO_MARKER],
      );
      guestIds[g.full_name] = rows[0].id;
    }

    for (const r of RESERVATIONS) {
      const guestId = guestIds[r.guest];
      const roomId = roomIds[r.room];
      if (!guestId || !roomId) continue;
      await client.query(
        `INSERT INTO reservation
           (property_id, guest_id, room_id, check_in, check_out, status, adults, total_rate, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          propertyId,
          guestId,
          roomId,
          dayAt(r.inDays, 15),
          dayAt(r.outDays, 11),
          r.status,
          r.adults,
          r.rate,
          DEMO_MARKER,
        ],
      );
    }

    // Align occupied rooms with checked-in stays.
    for (const r of RESERVATIONS) {
      if (r.status !== 'checked_in') continue;
      await client.query(`UPDATE room SET status = 'occupied' WHERE id = $1`, [roomIds[r.room]]);
    }

    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, SALT_ROUNDS);

    const { rows: adminRows } = await client.query(
      `SELECT id FROM staff
       WHERE organization_id = $1 AND role IN ('SystemAdmin', 'Admin')
       ORDER BY id LIMIT 1`,
      [orgId],
    );
    const adminId = adminRows[0]?.id ?? null;

    let gmId = null;
    for (const s of STAFF) {
      const { rows: existingStaff } = await client.query(
        `SELECT id FROM staff WHERE username = $1`,
        [s.username],
      );
      if (existingStaff[0]) {
        if (s.role === ROLES.GENERAL_MANAGER) gmId = existingStaff[0].id;
        await client.query(`UPDATE staff SET name = $1, email = $2 WHERE id = $3`, [
          s.name,
          s.email,
          existingStaff[0].id,
        ]);
        await client.query(
          `INSERT INTO staff_property (staff_id, property_id) VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [existingStaff[0].id, propertyId],
        );
        continue;
      }

      const managerId =
        s.role === ROLES.GENERAL_MANAGER
          ? adminId
          : s.role === ROLES.RECEPTIONIST || s.role === ROLES.FRONT_OFFICE_MANAGER
            ? gmId || adminId
            : gmId || adminId;

      const { rows } = await client.query(
        `INSERT INTO staff
           (name, role, username, email, password_hash, status, manager_staff_id, organization_id)
         VALUES ($1, $2, $3, $4, $5, 'active', $6, $7)
         RETURNING id`,
        [s.name, s.role, s.username, s.email, passwordHash, managerId, orgId],
      );
      const staffId = rows[0].id;
      if (s.role === ROLES.GENERAL_MANAGER) gmId = staffId;

      await client.query(
        `INSERT INTO staff_property (staff_id, property_id) VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [staffId, propertyId],
      );
    }

    // Two-pass: ensure FOM reports to GM, receptionist to FOM when both exist.
    const { rows: gmStaff } = await client.query(
      `SELECT id FROM staff WHERE organization_id = $1 AND username = 'gm'`,
      [orgId],
    );
    const { rows: fomStaff } = await client.query(
      `SELECT id FROM staff WHERE organization_id = $1 AND username = 'fom'`,
      [orgId],
    );
    if (gmStaff[0]) {
      await client.query(
        `UPDATE staff SET manager_staff_id = $1
         WHERE organization_id = $2 AND username IN ('fom', 'hkmanager', 'revenue', 'accountant', 'maint')`,
        [gmStaff[0].id, orgId],
      );
    }
    if (fomStaff[0]) {
      await client.query(
        `UPDATE staff SET manager_staff_id = $1
         WHERE organization_id = $2 AND username = 'reception'`,
        [fomStaff[0].id, orgId],
      );
    }
    const { rows: hkm } = await client.query(
      `SELECT id FROM staff WHERE organization_id = $1 AND username = 'hkmanager'`,
      [orgId],
    );
    if (hkm[0]) {
      await client.query(
        `UPDATE staff SET manager_staff_id = $1
         WHERE organization_id = $2 AND username = 'house'`,
        [hkm[0].id, orgId],
      );
    }

    await client.query('COMMIT');

    console.log('Demo seed applied.');
    console.log(`  Organization: ${ORG_NAME}`);
    console.log(`  Property:     ${PROPERTY_NAME}`);
    console.log(`  Rooms:        ${ROOMS.length}`);
    console.log(`  Guests:       ${GUESTS.length}`);
    console.log(`  Reservations: ${RESERVATIONS.length}`);
    console.log(`  Staff:        ${STAFF.map((s) => s.username).join(', ')}`);
    console.log(`  Password:     ${DEMO_PASSWORD}`);
    console.log('  Also use your BOOTSTRAP_ADMIN_USERNAME / BOOTSTRAP_ADMIN_PASSWORD for SystemAdmin.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed failed:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
