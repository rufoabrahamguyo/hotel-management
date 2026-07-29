/** Room status display helpers - shared by Rooms, Reports, etc. */

export const ROOM_STATUSES = ['vacant', 'occupied', 'dirty', 'cleaning', 'inspecting', 'maintenance'];

/** Solid tag colors (Ant Design Tag accepts hex). Distinct per status. */
export const ROOM_STATUS_COLORS = {
  vacant: '#2f8f57',
  occupied: '#1a3f63',
  dirty: '#c48a1a',
  cleaning: '#0e7490',
  inspecting: '#6d28d9',
  maintenance: '#c9444a',
};

export function roomStatusColor(status) {
  return ROOM_STATUS_COLORS[status] || '#5a6a7d';
}

export function roomStatusLabel(status) {
  return String(status || '').replace(/_/g, ' ').toUpperCase();
}
