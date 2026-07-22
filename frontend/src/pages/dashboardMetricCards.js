import { ROLE } from '../auth/roles';

function fmtUsd(n) {
  return Number(n ?? 0).toLocaleString(undefined, { style: 'currency', currency: 'USD', minimumFractionDigits: 0 });
}

export function buildRealtimeCards(normalizedRole, raw) {
  const s = raw ?? {};
  const totalRooms = Number(s.totalRooms) || 0;
  const vacant = Number(s.vacantRooms) || 0;
  const occupied = Number(s.occupiedRooms) || 0;
  const dirty = Number(s.dirtyRooms) || 0;
  const cleaning = Number(s.cleaningRooms) || 0;
  const inspecting = Number(s.inspectingRooms) || 0;
  const maintenance = Number(s.maintenanceRooms) || 0;
  const turnover = Number(s.turnoverRooms) || dirty + cleaning + inspecting;
  const occPct = totalRooms ? ((occupied / totalRooms) * 100).toFixed(1) : '0';
  const inHouse = Number(s.inHouseGuests) || 0;
  const arrToday = Number(s.arrivalsDueToday) || 0;
  const depToday = Number(s.departuresDueToday) || 0;
  const upcoming = Number(s.upcomingBookings) || 0;
  const revenue = Number(s.revenuePipeline) || 0;

  const availEmphasis =
    vacant === 0 ? 'alert' : vacant < Math.ceil(totalRooms * 0.12) ? 'caution' : 'good';

  switch (normalizedRole) {
    case ROLE.RECEPTIONIST:
      return [
        {
          key: 'arr',
          title: 'Arrivals today',
          subtitle: 'Guests expected to check in',
          detail: 'Open Guests to start check-in.',
          metric: String(arrToday),
          emphasis: arrToday > 8 ? 'caution' : 'good',
          navigate: '/guests',
        },
        {
          key: 'dep',
          title: 'Departures today',
          subtitle: 'Guests scheduled to check out',
          detail: 'Process check-outs before end of day.',
          metric: String(depToday),
          emphasis: depToday > 6 ? 'caution' : 'good',
          navigate: '/guests',
        },
        {
          key: 'inhouse',
          title: 'In-house guests',
          subtitle: 'Currently checked in',
          detail: `${arrToday} arriving · ${depToday} departing`,
          metric: String(inHouse),
          emphasis: 'neutral',
          navigate: '/guests',
        },
        {
          key: 'avail',
          title: 'Rooms ready to assign',
          subtitle: `Vacant (${vacant} of ${totalRooms})`,
          detail: 'Assign during check-in.',
          metric: String(vacant),
          emphasis: availEmphasis,
          navigate: '/guests',
        },
      ];

    case ROLE.FRONT_OFFICE_MANAGER:
      return [
        {
          key: 'avail',
          title: 'Rooms available',
          subtitle: `Vacant & ready (${vacant} of ${totalRooms})`,
          detail: `${occPct}% occupied`,
          metric: vacant.toString(),
          emphasis: availEmphasis,
          navigate: '/rooms',
        },
        {
          key: 'inhouse',
          title: 'In-house stays',
          subtitle: `${inHouse} guests checked in`,
          detail: `${depToday} checkout${depToday !== 1 ? 's' : ''} today`,
          metric: String(inHouse),
          emphasis: 'neutral',
          navigate: '/guests',
        },
        {
          key: 'arr',
          title: 'Arrivals today',
          subtitle: 'Team check-in load',
          detail: `${upcoming} upcoming reservations`,
          metric: String(arrToday),
          emphasis: arrToday > 8 ? 'caution' : 'good',
          navigate: '/guests',
        },
        {
          key: 'dep',
          title: 'Departures today',
          subtitle: 'Team check-out load',
          detail: `${turnover} rooms in turnaround`,
          metric: String(depToday),
          emphasis: turnover > vacant ? 'caution' : 'good',
          navigate: '/guests',
        },
        {
          key: 'book',
          title: 'Upcoming reservations',
          subtitle: 'Not yet checked in',
          detail: `${arrToday} arrivals today`,
          metric: String(upcoming),
          emphasis: 'neutral',
          navigate: '/guests',
        },
        {
          key: 'maint',
          title: 'Rooms off market',
          subtitle: 'Cannot assign',
          detail: `${maintenance} maintenance hold${maintenance !== 1 ? 's' : ''}`,
          metric: String(maintenance),
          emphasis: maintenance > 0 ? 'caution' : 'good',
          navigate: '/rooms',
        },
      ];

    case ROLE.HOUSEKEEPING:
      return [
        {
          key: 'dirty',
          title: 'Dirty queue',
          subtitle: 'Rooms waiting for you',
          detail: 'Update status under Rooms.',
          metric: String(dirty),
          emphasis: dirty > 0 ? 'caution' : 'good',
          navigate: '/rooms',
        },
        {
          key: 'cleaning',
          title: 'In progress',
          subtitle: `Cleaning (${cleaning}) + inspection (${inspecting})`,
          detail: 'Active turnaround rooms',
          metric: String(cleaning + inspecting),
          emphasis: cleaning + inspecting > 4 ? 'caution' : 'neutral',
          navigate: '/rooms',
        },
        {
          key: 'vac',
          title: 'Rooms ready',
          subtitle: `Vacant and cleared (${vacant})`,
          detail: 'Ready for front desk assignment',
          metric: String(vacant),
          emphasis: availEmphasis,
          navigate: '/rooms',
        },
      ];

    case ROLE.HOUSEKEEPING_MANAGER:
      return [
        {
          key: 'dirty',
          title: 'Dirty queue',
          subtitle: 'Waiting for housekeeping',
          detail: `${occupied} occupied · ${turnover} in turnaround`,
          metric: String(dirty),
          emphasis: dirty > Math.ceil(totalRooms * 0.2) ? 'caution' : dirty > 0 ? 'neutral' : 'good',
          navigate: '/rooms',
        },
        {
          key: 'cleaning',
          title: 'In progress',
          subtitle: `Cleaning (${cleaning}) + inspection (${inspecting})`,
          detail: 'Track team progress under Rooms',
          metric: String(cleaning + inspecting),
          emphasis: cleaning + inspecting > 6 ? 'caution' : 'neutral',
          navigate: '/rooms',
        },
        {
          key: 'vac',
          title: 'Rooms ready',
          subtitle: `Vacant and cleared (${vacant})`,
          detail: `${maintenance} maintenance hold${maintenance !== 1 ? 's' : ''}`,
          metric: String(vacant),
          emphasis: availEmphasis,
          navigate: '/rooms',
        },
        {
          key: 'turn',
          title: 'Turnaround load',
          subtitle: 'Dirty → clean → ready',
          detail: `${dirty} dirty · ${cleaning} cleaning · ${inspecting} inspecting`,
          metric: String(turnover),
          emphasis: turnover > vacant ? 'caution' : 'neutral',
          navigate: '/rooms',
        },
        {
          key: 'occ',
          title: 'Occupancy context',
          subtitle: `${occPct}% of rooms occupied`,
          detail: `${inHouse} guests in house`,
          metric: `${occPct}%`,
          emphasis: 'neutral',
          navigate: '/rooms',
        },
      ];

    case ROLE.MAINTENANCE:
      return [
        {
          key: 'maint',
          title: 'Rooms in maintenance',
          subtitle: 'Your active repair holds',
          detail: 'Release rooms when work is complete.',
          metric: String(maintenance),
          emphasis: maintenance === 0 ? 'good' : 'caution',
          navigate: '/rooms',
        },
        {
          key: 'vac',
          title: 'Vacant rooms',
          subtitle: 'Available inventory',
          detail: `${dirty} dirty rooms may need follow-up`,
          metric: String(vacant),
          emphasis: 'neutral',
          navigate: '/rooms',
        },
      ];

    case ROLE.MAINTENANCE_MANAGER:
      return [
        {
          key: 'maint',
          title: 'Rooms in maintenance',
          subtitle: 'Out of order for repairs',
          detail: `${dirty} dirty · ${vacant} vacant`,
          metric: String(maintenance),
          emphasis: maintenance === 0 ? 'good' : 'caution',
          navigate: '/rooms',
        },
        {
          key: 'occ',
          title: 'Occupancy snapshot',
          subtitle: `${occupied} occupied · ${vacant} vacant`,
          detail: `${inHouse} guests in house`,
          metric: occupied.toString(),
          emphasis: 'neutral',
          navigate: '/rooms',
        },
        {
          key: 'dirty',
          title: 'Dirty rooms',
          subtitle: 'May block readiness',
          detail: `${turnover} rooms in housekeeping pipeline`,
          metric: String(dirty),
          emphasis: dirty > 4 ? 'caution' : 'neutral',
          navigate: '/rooms',
        },
      ];

    case ROLE.REVENUE_MANAGER:
      return [
        {
          key: 'rev',
          title: 'Booked revenue',
          subtitle: 'Active and upcoming stays',
          detail: 'Full breakdown under Reports',
          metric: fmtUsd(revenue),
          emphasis: revenue <= 0 ? 'caution' : 'neutral',
          navigate: '/reports',
        },
        {
          key: 'occPct',
          title: 'Occupancy rate',
          subtitle: `${occPct}% of rooms occupied`,
          detail: `${inHouse} guests checked in`,
          metric: `${occPct}%`,
          emphasis: Number(occPct) > 90 ? 'caution' : 'neutral',
          navigate: '/reports',
        },
        {
          key: 'book',
          title: 'Upcoming reservations',
          subtitle: 'Revenue not yet realized',
          detail: `${arrToday} arrivals today`,
          metric: String(upcoming),
          emphasis: 'neutral',
          navigate: '/reports',
        },
        {
          key: 'arr',
          title: 'Arrivals today',
          subtitle: 'Demand arriving today',
          detail: `${depToday} departures today`,
          metric: String(arrToday),
          emphasis: 'neutral',
          navigate: '/reports',
        },
      ];

    case ROLE.ACCOUNTANT:
      return [
        {
          key: 'rev',
          title: 'Booked revenue',
          subtitle: 'Ledger-oriented pipeline',
          detail: 'Export and reconcile under Reports',
          metric: fmtUsd(revenue),
          emphasis: revenue <= 0 ? 'caution' : 'neutral',
          navigate: '/reports',
        },
        {
          key: 'occPct',
          title: 'Occupancy rate',
          subtitle: `${occPct}% of rooms occupied`,
          detail: `${occupied} of ${totalRooms} rooms`,
          metric: `${occPct}%`,
          emphasis: 'neutral',
          navigate: '/reports',
        },
        {
          key: 'book',
          title: 'Upcoming reservations',
          subtitle: 'Future recognized revenue',
          detail: `${upcoming} bookings not checked in`,
          metric: String(upcoming),
          emphasis: 'neutral',
          navigate: '/reports',
        },
      ];

    case ROLE.GENERAL_MANAGER:
      return [
        {
          key: 'avail',
          title: 'Rooms available',
          subtitle: `${vacant} vacant of ${totalRooms} total`,
          detail: `${occPct}% occupancy · ${maintenance} off market`,
          metric: vacant.toString(),
          emphasis: availEmphasis,
          navigate: '/rooms',
        },
        {
          key: 'inhouse',
          title: 'In-house guests',
          subtitle: 'Current guest count',
          detail: `${arrToday} arrivals · ${depToday} departures`,
          metric: String(inHouse),
          emphasis: 'neutral',
          navigate: '/guests',
        },
        {
          key: 'turn',
          title: 'Housekeeping pipeline',
          subtitle: `${turnover} rooms in turnaround`,
          detail: `${dirty} dirty · ${cleaning} cleaning · ${inspecting} inspecting`,
          metric: String(turnover),
          emphasis: turnover > vacant ? 'caution' : 'neutral',
          navigate: '/rooms',
        },
        {
          key: 'rev',
          title: 'Booked revenue',
          subtitle: 'Property-wide pipeline',
          detail: 'Open Reports for detail',
          metric: fmtUsd(revenue),
          emphasis: revenue <= 0 ? 'caution' : 'neutral',
          navigate: '/reports',
        },
        {
          key: 'arr',
          title: 'Arrivals today',
          subtitle: 'Front desk workload',
          detail: `${upcoming} upcoming reservations`,
          metric: String(arrToday),
          emphasis: arrToday > 10 ? 'caution' : 'good',
          navigate: '/guests',
        },
        {
          key: 'dep',
          title: 'Departures today',
          subtitle: 'Checkout workload',
          detail: `${turnover} rooms need turnover`,
          metric: String(depToday),
          emphasis: depToday > 10 ? 'caution' : 'good',
          navigate: '/guests',
        },
      ];

    case ROLE.SYSTEM_ADMIN:
      return [
        {
          key: 'avail',
          title: 'Sellable inventory',
          subtitle: `${vacant} vacant · ${maintenance} maintenance`,
          detail: `${occPct}% occupied across ${totalRooms} rooms`,
          metric: vacant.toString(),
          emphasis: availEmphasis,
          navigate: '/rooms',
        },
        {
          key: 'arr',
          title: 'Arrivals today',
          subtitle: 'Operational load',
          detail: `${upcoming} upcoming reservations`,
          metric: String(arrToday),
          emphasis: 'neutral',
          navigate: '/guests',
        },
        {
          key: 'rev',
          title: 'Revenue pipeline',
          subtitle: 'Booking value',
          detail: 'Finance roles use Reports for detail',
          metric: fmtUsd(revenue),
          emphasis: 'neutral',
          navigate: '/reports',
        },
        {
          key: 'turn',
          title: 'Housekeeping backlog',
          subtitle: `${turnover} rooms in turnaround`,
          detail: `${dirty} dirty · ${cleaning} cleaning · ${inspecting} inspecting`,
          metric: String(turnover),
          emphasis: turnover > vacant ? 'caution' : 'neutral',
          navigate: '/rooms',
        },
        {
          key: 'maint',
          title: 'Engineering holds',
          subtitle: 'Rooms blocked for maintenance',
          detail: 'Managed under Rooms',
          metric: String(maintenance),
          emphasis: maintenance > 2 ? 'caution' : 'good',
          navigate: '/rooms',
        },
      ];

    default:
      return [];
  }
}

