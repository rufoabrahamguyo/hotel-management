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

/** Short labels for UI (sidebar, tags, selects). */
export const ROLE_LABELS = {
  [ROLE.SYSTEM_ADMIN]: 'System admin',
  [ROLE.GENERAL_MANAGER]: 'General manager',
  [ROLE.FRONT_OFFICE_MANAGER]: 'Front office manager',
  [ROLE.HOUSEKEEPING_MANAGER]: 'Housekeeping manager',
  [ROLE.REVENUE_MANAGER]: 'Revenue manager',
  [ROLE.MAINTENANCE_MANAGER]: 'Maintenance manager',
  [ROLE.ACCOUNTANT]: 'Accountant',
  [ROLE.RECEPTIONIST]: 'Receptionist',
  [ROLE.HOUSEKEEPING]: 'Housekeeping',
  [ROLE.MAINTENANCE]: 'Maintenance',
};

export function roleLabel(role) {
  const r = normalizeRole(role);
  if (!r) return '';
  return ROLE_LABELS[r] || String(role).replace(/([a-z])([A-Z])/g, '$1 $2');
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
  [ROLE.SYSTEM_ADMIN]: 'Manages properties and all staff',
  [ROLE.GENERAL_MANAGER]: 'Runs the property and managers',
  [ROLE.FRONT_OFFICE_MANAGER]: 'Manages reception staff',
  [ROLE.HOUSEKEEPING_MANAGER]: 'Manages housekeeping staff',
  [ROLE.REVENUE_MANAGER]: 'Views occupancy and revenue',
  [ROLE.MAINTENANCE_MANAGER]: 'Manages maintenance staff',
  [ROLE.ACCOUNTANT]: 'Views financial reports',
  [ROLE.RECEPTIONIST]: 'Guests, check-in and check-out',
  [ROLE.HOUSEKEEPING]: 'Updates room cleaning status',
  [ROLE.MAINTENANCE]: 'Updates maintenance status',
};
