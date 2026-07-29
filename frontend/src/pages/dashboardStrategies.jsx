import {
  UserOutlined,
  HomeOutlined,
  BarChartOutlined,
  TeamOutlined,
  BankOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { ROLE } from '../auth/roles';

/**
 * Role → dashboard chrome (title, primary CTA, quick links).
 * Add a role by extending this map (Open/Closed).
 */
export const ROLE_DASHBOARD_STRATEGY = {
  [ROLE.SYSTEM_ADMIN]: {
    title: 'System overview',
    primary: { href: '/admin/staff', label: 'Manage staff', iconType: 'staff' },
    quickActions: [
      { href: '/admin/staff', label: 'Staff', iconType: 'staff' },
      { href: '/admin/properties', label: 'Properties', iconType: 'bank' },
      { href: '/rooms', label: 'Rooms', iconType: 'home' },
      { href: '/settings', label: 'Settings', iconType: 'settings' },
    ],
  },
  [ROLE.GENERAL_MANAGER]: {
    title: 'Property snapshot',
    primary: { href: '/guests', label: 'Guests & arrivals', iconType: 'user' },
    quickActions: [
      { href: '/guests', label: 'Guests', iconType: 'user' },
      { href: '/rooms', label: 'Rooms', iconType: 'home' },
      { href: '/reports', label: 'Reports', iconType: 'reports' },
      { href: '/admin/staff', label: 'Staff', iconType: 'staff' },
    ],
  },
  [ROLE.FRONT_OFFICE_MANAGER]: {
    title: 'Front desk operations',
    primary: { href: '/guests', label: 'Guests & arrivals', iconType: 'user' },
    quickActions: [
      { href: '/guests', label: 'Arrivals', iconType: 'user' },
      { href: '/rooms', label: 'Rooms', iconType: 'home' },
    ],
  },
  [ROLE.RECEPTIONIST]: {
    title: "Today's arrivals & departures",
    primary: { href: '/guests', label: 'Guests & arrivals', iconType: 'user' },
    quickActions: [{ href: '/guests', label: 'Check-in / out', iconType: 'user' }],
  },
  [ROLE.HOUSEKEEPING_MANAGER]: {
    title: 'Housekeeping operations',
    primary: { href: '/rooms', label: 'Open rooms', iconType: 'home' },
    quickActions: [{ href: '/rooms', label: 'Cleaning queue', iconType: 'home' }],
  },
  [ROLE.HOUSEKEEPING]: {
    title: 'My cleaning queue',
    primary: { href: '/rooms', label: 'Open rooms', iconType: 'home' },
    quickActions: [{ href: '/rooms', label: 'Cleaning queue', iconType: 'home' }],
  },
  [ROLE.MAINTENANCE_MANAGER]: {
    title: 'Engineering overview',
    primary: { href: '/rooms', label: 'Open rooms', iconType: 'home' },
    quickActions: [{ href: '/rooms', label: 'Maintenance holds', iconType: 'home' }],
  },
  [ROLE.MAINTENANCE]: {
    title: 'Maintenance holds',
    primary: { href: '/rooms', label: 'Open rooms', iconType: 'home' },
    quickActions: [{ href: '/rooms', label: 'Maintenance holds', iconType: 'home' }],
  },
  [ROLE.REVENUE_MANAGER]: {
    title: 'Revenue dashboard',
    primary: { href: '/reports', label: 'Open reports', iconType: 'reports' },
    quickActions: [{ href: '/reports', label: 'Reports', iconType: 'reports' }],
  },
  [ROLE.ACCOUNTANT]: {
    title: 'Financial snapshot',
    primary: { href: '/reports', label: 'Open reports', iconType: 'reports' },
    quickActions: [{ href: '/reports', label: 'Reports', iconType: 'reports' }],
  },
};

const ICONS = {
  user: <UserOutlined />,
  home: <HomeOutlined />,
  reports: <BarChartOutlined />,
  staff: <TeamOutlined />,
  bank: <BankOutlined />,
  settings: <SettingOutlined />,
};

const DEFAULT_STRATEGY = {
  title: 'Operations overview',
  primary: { href: '/guests', label: 'Guests & arrivals', iconType: 'user' },
  quickActions: [],
};

export function getDashboardStrategy(role) {
  return ROLE_DASHBOARD_STRATEGY[role] ?? DEFAULT_STRATEGY;
}

export function resolvePrimaryAction(role) {
  const s = getDashboardStrategy(role);
  return {
    href: s.primary.href,
    label: s.primary.label,
    icon: ICONS[s.primary.iconType] ?? <UserOutlined />,
  };
}

export function resolveQuickActions(role) {
  return getDashboardStrategy(role).quickActions.map((a) => ({
    href: a.href,
    label: a.label,
    icon: ICONS[a.iconType] ?? null,
  }));
}

export function resolveOverviewTitle(role) {
  return getDashboardStrategy(role).title;
}
