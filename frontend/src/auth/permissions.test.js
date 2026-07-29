import { describe, it, expect } from 'vitest';
import {
  canAccessRoute,
  canUseFeature,
  getAllowedSidebarPaths,
  ROLE_ROUTE_KEYS,
  ROUTE_PATHS,
} from './permissions';
import { ROLE, normalizeRole, canManageStaff, hasPropertyWideAccess } from './roles';

describe('normalizeRole', () => {
  it('maps legacy Admin to SystemAdmin', () => {
    expect(normalizeRole('Admin')).toBe(ROLE.SYSTEM_ADMIN);
  });

  it('returns null for empty role', () => {
    expect(normalizeRole('')).toBeNull();
    expect(normalizeRole('   ')).toBeNull();
  });

  it('passes through known roles', () => {
    expect(normalizeRole(ROLE.RECEPTIONIST)).toBe(ROLE.RECEPTIONIST);
  });
});

describe('canManageStaff / hasPropertyWideAccess', () => {
  it('allows managers who provision staff', () => {
    expect(canManageStaff(ROLE.SYSTEM_ADMIN)).toBe(true);
    expect(canManageStaff(ROLE.FRONT_OFFICE_MANAGER)).toBe(true);
    expect(canManageStaff(ROLE.RECEPTIONIST)).toBe(false);
  });

  it('limits property-wide access to SystemAdmin', () => {
    expect(hasPropertyWideAccess(ROLE.SYSTEM_ADMIN)).toBe(true);
    expect(hasPropertyWideAccess(ROLE.GENERAL_MANAGER)).toBe(false);
  });
});

describe('ROLE_ROUTE_KEYS coverage', () => {
  it('defines route keys for every ROLE', () => {
    for (const role of Object.values(ROLE)) {
      expect(ROLE_ROUTE_KEYS[role], `missing keys for ${role}`).toBeDefined();
      expect(ROLE_ROUTE_KEYS[role].length).toBeGreaterThan(0);
    }
  });

  it('only SystemAdmin and GeneralManager may open settings', () => {
    for (const role of Object.values(ROLE)) {
      const hasSettings = ROLE_ROUTE_KEYS[role].includes('settings');
      const expected = role === ROLE.SYSTEM_ADMIN || role === ROLE.GENERAL_MANAGER;
      expect(hasSettings, role).toBe(expected);
    }
  });
});

describe('canAccessRoute (table-driven)', () => {
  const cases = [
    [ROLE.RECEPTIONIST, '/guests', true],
    [ROLE.RECEPTIONIST, '/rooms', false],
    [ROLE.RECEPTIONIST, '/settings', false],
    [ROLE.RECEPTIONIST, '/admin/staff', false],
    [ROLE.HOUSEKEEPING, '/rooms', true],
    [ROLE.HOUSEKEEPING, '/guests', false],
    [ROLE.HOUSEKEEPING, '/reports', false],
    [ROLE.REVENUE_MANAGER, '/reports', true],
    [ROLE.REVENUE_MANAGER, '/guests', false],
    [ROLE.ACCOUNTANT, '/reports', true],
    [ROLE.ACCOUNTANT, '/rooms', false],
    [ROLE.FRONT_OFFICE_MANAGER, '/guests', true],
    [ROLE.FRONT_OFFICE_MANAGER, '/rooms', true],
    [ROLE.FRONT_OFFICE_MANAGER, '/reports', false],
    [ROLE.GENERAL_MANAGER, '/settings', true],
    [ROLE.GENERAL_MANAGER, '/admin/properties', false],
    [ROLE.GENERAL_MANAGER, '/admin/staff', true],
    [ROLE.SYSTEM_ADMIN, '/admin/properties', true],
    [ROLE.SYSTEM_ADMIN, '/settings', true],
    [ROLE.MAINTENANCE, '/rooms', true],
    [ROLE.MAINTENANCE_MANAGER, '/rooms', true],
    [ROLE.HOUSEKEEPING_MANAGER, '/rooms', true],
  ];

  it.each(cases)('%s access to %s → %s', (role, path, expected) => {
    expect(canAccessRoute(path, { role })).toBe(expected);
  });

  it('allows nested paths under an allowed route', () => {
    expect(canAccessRoute('/guests/123', { role: ROLE.RECEPTIONIST })).toBe(true);
  });

  it('limits user with no role to dashboard only', () => {
    expect(canAccessRoute('/dashboard', { role: '' })).toBe(true);
    expect(canAccessRoute('/rooms', { role: '' })).toBe(false);
  });

  it('treats / as dashboard', () => {
    expect(canAccessRoute('/', { role: ROLE.RECEPTIONIST })).toBe(true);
  });
});

describe('getAllowedSidebarPaths', () => {
  it('maps route keys to paths for receptionist', () => {
    const paths = getAllowedSidebarPaths({ role: ROLE.RECEPTIONIST });
    expect(paths).toEqual([ROUTE_PATHS.dashboard, ROUTE_PATHS.guests]);
  });
});

describe('canUseFeature', () => {
  it('shows arrivals widget for receptionist only among desk roles', () => {
    expect(canUseFeature('arrivals', { role: ROLE.RECEPTIONIST })).toBe(true);
    expect(canUseFeature('revenue', { role: ROLE.RECEPTIONIST })).toBe(false);
  });

  it('does not show housekeeping rail for system admin', () => {
    expect(canUseFeature('housekeeping', { role: ROLE.SYSTEM_ADMIN })).toBe(false);
  });

  it('shows housekeeping for housekeeping roles', () => {
    expect(canUseFeature('housekeeping', { role: ROLE.HOUSEKEEPING })).toBe(true);
    expect(canUseFeature('housekeeping', { role: ROLE.HOUSEKEEPING_MANAGER })).toBe(true);
  });

  it('returns false without a role', () => {
    expect(canUseFeature('arrivals', { role: '' })).toBe(false);
  });
});
