/** Staff roles stored in DB and returned on login as user.role */

export const ROLE = {
  SYSTEM_ADMIN: 'SystemAdmin',
  GENERAL_MANAGER: 'GeneralManager',
  FRONT_OFFICE_MANAGER: 'FrontOfficeManager',
  HOUSEKEEPING_MANAGER: 'HousekeepingManager',
  REVENUE_MANAGER: 'RevenueManager',
  MAINTENANCE_MANAGER: 'MaintenanceManager',
  ACCOUNTANT: 'Accountant',
  RECEPTIONIST: 'Receptionist',
  HOUSEKEEPING: 'Housekeeping',
  MAINTENANCE: 'Maintenance',
};

const LEGACY_ADMIN = 'Admin';

export function normalizeRole(role) {
  const r = String(role).trim();
  if (!r) return null;
  if (r === LEGACY_ADMIN) return ROLE.SYSTEM_ADMIN;
  const known = Object.values(ROLE);
  if (known.includes(r)) return r;
  /** Custom role strings from DB still show in UI / tabs. */
  return r;
}

export function canManageStaff(role) {
  const r = normalizeRole(role);
  return (
    r === ROLE.SYSTEM_ADMIN ||
    r === ROLE.GENERAL_MANAGER ||
    r === ROLE.FRONT_OFFICE_MANAGER ||
    r === ROLE.HOUSEKEEPING_MANAGER ||
    r === ROLE.MAINTENANCE_MANAGER
  );
}

/** Roles with org-wide property visibility (SystemAdmin). */
export function hasPropertyWideAccess(role) {
  return normalizeRole(role) === ROLE.SYSTEM_ADMIN;
}

export const ROLE_DESCRIPTIONS = {
  [ROLE.SYSTEM_ADMIN]: 'IT / platform administrator - bootstrap & identity root',
  [ROLE.GENERAL_MANAGER]: 'Hotel general manager - creates department managers',
  [ROLE.FRONT_OFFICE_MANAGER]: 'Creates front desk (receptionist) accounts',
  [ROLE.HOUSEKEEPING_MANAGER]: 'Creates housekeeping room staff accounts',
  [ROLE.REVENUE_MANAGER]: 'Revenue reporting & pricing (no line-staff provisioning)',
  [ROLE.MAINTENANCE_MANAGER]: 'Creates maintenance accounts',
  [ROLE.ACCOUNTANT]: 'Financial reporting & controls',
  [ROLE.RECEPTIONIST]: 'Check-in / check-out and reservations',
  [ROLE.HOUSEKEEPING]: 'Room cleaning status',
  [ROLE.MAINTENANCE]: 'Repairs & room readiness',
};
