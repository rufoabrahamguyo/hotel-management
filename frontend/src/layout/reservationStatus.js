/** Reservation status display helpers - Guests, Reports. */

export const RESERVATION_STATUSES = ['upcoming', 'checked_in', 'checked_out', 'cancelled', 'no_show'];

/** Same solid tag style as room statuses (Hotely palette). */
export const RESERVATION_STATUS_COLORS = {
  upcoming: '#0e7490',
  checked_in: '#2f8f57',
  checked_out: '#5a6a7d',
  cancelled: '#c9444a',
  no_show: '#c48a1a',
};

export function reservationStatusColor(status) {
  return RESERVATION_STATUS_COLORS[status] || '#5a6a7d';
}

export function reservationStatusLabel(status) {
  return String(status || '').replace(/_/g, ' ').toUpperCase();
}
