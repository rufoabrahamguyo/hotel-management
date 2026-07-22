import { normalizeRole, ROLE } from './roles';

/** Route keys → paths (must match App.jsx + sidebarNav). */
export const ROUTE_PATHS = {
  dashboard: '/dashboard',
  guests: '/guests',
  rooms: '/rooms',
  reports: '/reports',
  staff: '/admin/staff',
  properties: '/admin/properties',
  settings: '/settings',
};

/** Which workspace routes each role may open. Exported for tests / BE alignment docs. */
export const ROLE_ROUTE_KEYS = {
  [ROLE.SYSTEM_ADMIN]: ['dashboard', 'guests', 'rooms', 'reports', 'staff', 'properties', 'settings'],
  [ROLE.GENERAL_MANAGER]: ['dashboard', 'guests', 'rooms', 'reports', 'staff', 'settings'],
  [ROLE.FRONT_OFFICE_MANAGER]: ['dashboard', 'guests', 'rooms'],
  [ROLE.RECEPTIONIST]: ['dashboard', 'guests'],
  [ROLE.HOUSEKEEPING_MANAGER]: ['dashboard', 'rooms'],
  [ROLE.HOUSEKEEPING]: ['dashboard', 'rooms'],
  [ROLE.MAINTENANCE_MANAGER]: ['dashboard', 'rooms'],
  [ROLE.MAINTENANCE]: ['dashboard', 'rooms'],
  [ROLE.REVENUE_MANAGER]: ['dashboard', 'reports'],
  [ROLE.ACCOUNTANT]: ['dashboard', 'reports'],
};

function hasAssignableRole(user) {
  const raw = user?.role;
  return raw != null && String(raw).trim() !== '';
}

function allowedRouteKeys(user) {
  if (!hasAssignableRole(user)) return ['dashboard'];
  const role = normalizeRole(user.role);
  if (!role) return ['dashboard'];
  return ROLE_ROUTE_KEYS[role] ?? ['dashboard'];
}

export function canAccessRoute(pathname, user) {
  const keys = allowedRouteKeys(user);
  const allowed = keys.map((k) => ROUTE_PATHS[k]);
  if (pathname === '/' || pathname === '') return keys.includes('dashboard');
  return allowed.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function getAllowedSidebarPaths(user) {
  return allowedRouteKeys(user).map((k) => ROUTE_PATHS[k]);
}

/**
 * Dashboard feature flags — used by SummaryRail and other widgets.
 * Keep each role to the ops they actually own (no catch-all for SystemAdmin).
 * @typedef {'revenue'|'occupancy'|'arrivals'|'departures'|'housekeeping'|'maintenance'|'staff'} DashboardFeature
 */
const ROLE_DASHBOARD_FEATURES = {
  [ROLE.SYSTEM_ADMIN]: ['occupancy', 'revenue', 'staff'],
  [ROLE.GENERAL_MANAGER]: ['revenue', 'occupancy', 'arrivals', 'departures'],
  [ROLE.FRONT_OFFICE_MANAGER]: ['occupancy', 'arrivals', 'departures'],
  [ROLE.RECEPTIONIST]: ['arrivals', 'departures'],
  [ROLE.HOUSEKEEPING_MANAGER]: ['housekeeping', 'occupancy'],
  [ROLE.HOUSEKEEPING]: ['housekeeping'],
  [ROLE.MAINTENANCE_MANAGER]: ['maintenance', 'occupancy'],
  [ROLE.MAINTENANCE]: ['maintenance'],
  [ROLE.REVENUE_MANAGER]: ['revenue', 'occupancy', 'arrivals'],
  [ROLE.ACCOUNTANT]: ['revenue', 'occupancy'],
};

export function canUseFeature(feature, user) {
  if (!hasAssignableRole(user)) return false;
  const role = normalizeRole(user.role);
  if (!role) return false;
  const features = ROLE_DASHBOARD_FEATURES[role] ?? [];
  return features.includes(feature);
}
