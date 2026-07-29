import express from 'express';
import cors from 'cors';
import adminStaffRoutes from './routes/adminStaff.js';
import authRoutes from './routes/auth.js';
import guestRoutes from './routes/guests.js';
import roomRoutes from './routes/rooms.js';
import reservationRoutes from './routes/reservations.js';
import reportRoutes from './routes/reports.js';
import hotelSettingsRoutes from './routes/settings.js';
import propertyRoutes from './routes/properties.js';

/** Build the Express app (no listen) so tests can mount it with supertest. */
export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: process.env.CORS_ORIGIN?.split(',') ?? true,
      credentials: true,
    }),
  );
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/admin/staff', adminStaffRoutes);
  app.use('/api/guests', guestRoutes);
  app.use('/api/rooms', roomRoutes);
  app.use('/api/reservations', reservationRoutes);
  app.use('/api/reports', reportRoutes);
  app.use('/api/settings', hotelSettingsRoutes);
  app.use('/api/properties', propertyRoutes);

  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  return app;
}
