import { Typography, Spin } from 'antd';
import { canUseFeature } from '../auth/permissions';
import { useOpsSummary } from '../hooks/useOpsSummary';

const { Text } = Typography;

function RowStat({ label, value, muted }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        gap: 12,
        padding: '8px 0',
        borderBottom: '1px solid #f0f0f0',
      }}
    >
      <Text style={{ fontSize: 13, color: '#8c8c8c' }}>{label}</Text>
      <Text style={{ fontSize: 15, fontWeight: 600, color: muted ? '#8c8c8c' : '#262626', fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </Text>
    </div>
  );
}

function Panel({ title, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <Text style={{ fontSize: 13, fontWeight: 600, color: '#262626', display: 'block', marginBottom: 4 }}>{title}</Text>
      {children}
    </div>
  );
}

export default function SummaryRail({ user }) {
  const { data: s, isLoading, isError } = useOpsSummary();

  const showOccupancy = canUseFeature('occupancy', user);
  const showArrivals = canUseFeature('arrivals', user);
  const showDepartures = canUseFeature('departures', user);
  const showHousekeeping = canUseFeature('housekeeping', user);
  const showMaintenance = canUseFeature('maintenance', user);
  const showRevenue = canUseFeature('revenue', user);

  const vacant = Number(s?.vacantRooms) || 0;
  const dirty = Number(s?.dirtyRooms) || 0;
  const cleaning = Number(s?.cleaningRooms) || 0;
  const inspecting = Number(s?.inspectingRooms) || 0;
  const maintenance = Number(s?.maintenanceRooms) || 0;
  const occupied = Number(s?.occupiedRooms) || 0;
  const total = Number(s?.totalRooms) || 0;
  const occPct = total > 0 ? ((occupied / total) * 100).toFixed(1) : null;
  const dash = isLoading ? '-' : null;

  const showAny =
    showHousekeeping || showMaintenance || showOccupancy || showArrivals || showDepartures || showRevenue;

  if (!showAny) {
    return null;
  }

  return (
    <div style={{ padding: '16px 18px' }}>
      <Text style={{ fontSize: 13, fontWeight: 600, color: '#262626', display: 'block', marginBottom: 16 }}>
        Today
      </Text>
      {isError ? (
        <Text type="secondary" style={{ fontSize: 12 }}>
          Could not load stats.
        </Text>
      ) : (
        <Spin spinning={isLoading}>
          {showOccupancy ? (
            <Panel title="Rooms">
              <RowStat label="Occupied" value={dash ?? occupied} />
              <RowStat label="Vacant" value={dash ?? vacant} />
              {occPct != null ? <RowStat label="Occupancy" value={dash ?? `${occPct}%`} /> : null}
              <RowStat label="Total" value={dash ?? total} muted />
            </Panel>
          ) : null}

          {showHousekeeping ? (
            <Panel title="Housekeeping">
              <RowStat label="Dirty" value={dash ?? dirty} />
              <RowStat label="Cleaning" value={dash ?? cleaning} />
              <RowStat label="Inspecting" value={dash ?? inspecting} />
            </Panel>
          ) : null}

          {showMaintenance ? (
            <Panel title="Maintenance">
              <RowStat label="Off market" value={dash ?? maintenance} />
              {showOccupancy ? <RowStat label="Vacant" value={dash ?? vacant} /> : null}
            </Panel>
          ) : null}

          {showArrivals || showDepartures ? (
            <Panel title="Front desk">
              {showArrivals ? <RowStat label="Arrivals today" value={dash ?? (s?.arrivalsDueToday ?? 0)} /> : null}
              {showDepartures ? <RowStat label="Departures today" value={dash ?? (s?.departuresDueToday ?? 0)} /> : null}
              {showArrivals ? <RowStat label="Due soon" value={dash ?? (s?.arrivalsSoon ?? 0)} /> : null}
              {showDepartures ? (
                <RowStat label="Checkouts tomorrow" value={dash ?? (s?.departuresTomorrow ?? 0)} />
              ) : null}
            </Panel>
          ) : null}

          {showRevenue ? (
            <Panel title="Revenue">
              <RowStat
                label="Booked"
                value={dash ?? `$${Math.round(Number(s?.revenuePipeline ?? 0)).toLocaleString()}`}
              />
              {showOccupancy && occPct != null ? <RowStat label="Occupancy" value={dash ?? `${occPct}%`} /> : null}
            </Panel>
          ) : null}
        </Spin>
      )}
    </div>
  );
}
