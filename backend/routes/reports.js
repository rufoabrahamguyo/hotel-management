import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireStaffJwt, requirePropertyContext } from '../middleware/requireStaffJwt.js';

const router = Router();
/** Ops KPIs for dashboard / rail - any signed-in staff with a property may read. */
router.use(requireStaffJwt, requirePropertyContext);

router.get('/summary', async (req, res) => {
  const propertyId = req.auth.propertyId;
  try {
    const [
      roomsByStatus,
      resByStatus,
      revRow,
      inHouseCount,
      arrivalsRow,
      checkoutRow,
      roomBuckets,
      todayFlowRow,
      upcomingBookingsRow,
    ] = await Promise.all([
      pool.query(`SELECT status, COUNT(*)::int AS count FROM room WHERE property_id = $1 GROUP BY status ORDER BY status`, [propertyId]),
      pool.query(`SELECT status, COUNT(*)::int AS count FROM reservation WHERE property_id = $1 GROUP BY status ORDER BY status`, [propertyId]),
      pool.query(
        `SELECT COALESCE(SUM(total_rate), 0)::float8 AS revenue
         FROM reservation WHERE property_id = $1 AND status IN ('checked_in','checked_out','upcoming')`,
        [propertyId],
      ),
      pool.query(`SELECT COUNT(*)::int AS n FROM reservation WHERE property_id = $1 AND status = 'checked_in'`, [propertyId]),
      pool.query(`
        SELECT COUNT(*)::int AS n FROM reservation
        WHERE property_id = $1
          AND status IN ('upcoming','checked_in')
          AND check_in <= NOW() + interval '36 hours'
          AND check_out >= NOW() - interval '12 hours'`, [propertyId]),
      pool.query(`
        SELECT COUNT(*)::int AS n FROM reservation
        WHERE property_id = $1 AND status = 'checked_in' AND check_out::date <= (NOW() AT TIME ZONE 'UTC')::date + 1`, [propertyId]),
      pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE status = 'vacant')::int AS vacant,
          COUNT(*) FILTER (WHERE status = 'occupied')::int AS occupied,
          COUNT(*) FILTER (WHERE status = 'dirty')::int AS dirty,
          COUNT(*) FILTER (WHERE status = 'cleaning')::int AS cleaning,
          COUNT(*) FILTER (WHERE status = 'inspecting')::int AS inspecting,
          COUNT(*) FILTER (WHERE status = 'maintenance')::int AS maintenance,
          COUNT(*)::int AS total
        FROM room WHERE property_id = $1`, [propertyId]),
      pool.query(`
        SELECT
          COUNT(*) FILTER (
            WHERE status IN ('upcoming', 'checked_in')
              AND check_in::date = CURRENT_DATE
          )::int AS arrivals_due_today,
          COUNT(*) FILTER (
            WHERE status = 'checked_in'
              AND check_out::date = CURRENT_DATE
          )::int AS departures_due_today
        FROM reservation WHERE property_id = $1`, [propertyId]),
      pool.query(`SELECT COUNT(*)::int AS n FROM reservation WHERE property_id = $1 AND status = 'upcoming'`, [propertyId]),
    ]);

    const b = roomBuckets.rows[0] ?? {};
    const t = todayFlowRow.rows[0] ?? {};

    return res.json({
      roomsByStatus: roomsByStatus.rows,
      reservationsByStatus: resByStatus.rows,
      revenuePipeline: Number(revRow.rows[0]?.revenue ?? 0),
      inHouseGuests: inHouseCount.rows[0]?.n ?? 0,
      arrivalsSoon: arrivalsRow.rows[0]?.n ?? 0,
      departuresTomorrow: checkoutRow.rows[0]?.n ?? 0,
      totalRooms: b.total ?? 0,
      vacantRooms: b.vacant ?? 0,
      occupiedRooms: b.occupied ?? 0,
      dirtyRooms: b.dirty ?? 0,
      cleaningRooms: b.cleaning ?? 0,
      inspectingRooms: b.inspecting ?? 0,
      maintenanceRooms: b.maintenance ?? 0,
      turnoverRooms: (b.dirty ?? 0) + (b.cleaning ?? 0) + (b.inspecting ?? 0),
      arrivalsDueToday: t.arrivals_due_today ?? 0,
      departuresDueToday: t.departures_due_today ?? 0,
      upcomingBookings: upcomingBookingsRow.rows[0]?.n ?? 0,
    });
  } catch (err) {
    console.error('[reports]', err);
    return res.status(500).json({ error: 'Server', message: 'Could not build report summary.' });
  }
});

export default router;
