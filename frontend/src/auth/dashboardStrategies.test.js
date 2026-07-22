import { describe, it, expect } from 'vitest';
import {
  resolveOverviewTitle,
  ROLE_DASHBOARD_STRATEGY,
} from '../pages/dashboardStrategies';
import { ROLE } from './roles';
import { buildRealtimeCards } from '../pages/dashboardMetricCards';

describe('dashboardStrategies', () => {
  it('covers every ROLE', () => {
    for (const role of Object.values(ROLE)) {
      expect(ROLE_DASHBOARD_STRATEGY[role], role).toBeDefined();
    }
  });

  it('resolves overview title for receptionist', () => {
    expect(resolveOverviewTitle(ROLE.RECEPTIONIST)).toMatch(/arrivals/i);
  });

  it('falls back for unknown role', () => {
    expect(resolveOverviewTitle('CustomRole')).toBe('Operations overview');
  });
});

describe('buildRealtimeCards', () => {
  const sample = {
    totalRooms: 10,
    vacantRooms: 3,
    occupiedRooms: 5,
    dirtyRooms: 1,
    cleaningRooms: 1,
    inspectingRooms: 0,
    maintenanceRooms: 0,
    inHouseGuests: 8,
    arrivalsDueToday: 2,
    departuresDueToday: 1,
    upcomingBookings: 4,
    revenuePipeline: 1200,
  };

  it('returns receptionist cards with arrival metrics', () => {
    const cards = buildRealtimeCards(ROLE.RECEPTIONIST, sample);
    expect(cards.some((c) => c.key === 'arr')).toBe(true);
    expect(cards.find((c) => c.key === 'arr').metric).toBe('2');
  });

  it('returns empty for unknown role', () => {
    expect(buildRealtimeCards('Unknown', sample)).toEqual([]);
  });
});
