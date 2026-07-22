import { getAllowedSidebarPaths } from '../auth/permissions';

/** Navigation entries (paths must match routers). Icons resolved in shell. */
export const SIDEBAR_DEFS = [
  { path: '/dashboard', label: 'Overview', icon: 'dashboard' },
  { path: '/guests', label: 'Guests & arrivals', icon: 'guests' },
  { path: '/rooms', label: 'Rooms', icon: 'rooms' },
  { path: '/reports', label: 'Reports', icon: 'reports' },
  { path: '/admin/staff', label: 'Staff accounts', icon: 'staff' },
  { path: '/admin/properties', label: 'Properties', icon: 'properties' },
  { path: '/settings', label: 'Settings', icon: 'settings' },
];

/** Sidebar items filtered by role — each role only sees workspaces they can access. */
export function getSidebarDefsForUser(user) {
  const allowed = new Set(getAllowedSidebarPaths(user));
  return SIDEBAR_DEFS.filter((d) => allowed.has(d.path));
}
