import { Typography, Row, Col, Flex, Spin } from 'antd';
import { ArrowDownOutlined, ArrowUpOutlined } from '@ant-design/icons';
import { canUseFeature } from '../auth/permissions';
import { useOpsSummary } from '../hooks/useOpsSummary';
import { propizy } from './propizyTokens';

const { Text, Title } = Typography;

function MetricTile({ value, label, hint, color }) {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '10px 6px',
        borderRadius: 10,
        background: propizy.bg,
      }}
    >
      <div style={{ fontSize: 20, fontWeight: 700, color, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      <div style={{ fontSize: 11, color: propizy.text, fontWeight: 600, marginTop: 2 }}>{label}</div>
      {hint ? <div style={{ fontSize: 10, color: propizy.muted, marginTop: 2 }}>{hint}</div> : null}
    </div>
  );
}

function Panel({ title, children }) {
  return (
    <div
      style={{
        border: `1px solid ${propizy.border}`,
        borderRadius: 14,
        padding: 16,
        background: propizy.surface,
        boxShadow: '0 1px 2px rgba(12, 24, 41, 0.04)',
      }}
    >
      <Text
        style={{
          fontSize: 11,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: propizy.muted,
          fontWeight: 600,
          display: 'block',
          marginBottom: 12,
        }}
      >
        {title}
      </Text>
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
  const attention = dirty + maintenance;
  const holdPipeline = cleaning + inspecting;
  const occPct = total > 0 ? ((occupied / total) * 100).toFixed(1) : null;
  const arrToday = s?.arrivalsDueToday;
  const depToday = s?.departuresDueToday;

  const trendNeutral = occPct === null ? true : occupied <= vacant;

  const showAny =
    showHousekeeping || showMaintenance || showOccupancy || showArrivals || showDepartures || showRevenue;

  if (!showAny) {
    return null;
  }

  return (
    <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      {showHousekeeping ? (
        <Panel title="Housekeeping status">
          <Spin spinning={isLoading}>
            <Flex vertical gap={12}>
              <Row gutter={[8, 8]} style={{ width: '100%' }}>
                <Col span={8}>
                  <MetricTile value={isLoading ? '-' : attention} label="Attention" hint="Dirty + OOO" color={propizy.alert} />
                </Col>
                <Col span={8}>
                  <MetricTile value={isLoading ? '-' : vacant} label="Ready" hint="Vacant" color={propizy.success} />
                </Col>
                <Col span={8}>
                  <MetricTile value={isLoading ? '-' : holdPipeline} label="In flight" hint="Cleaning" color={propizy.muted} />
                </Col>
              </Row>
              <Text style={{ fontSize: 12, color: propizy.muted, lineHeight: 1.5 }}>
                {isError
                  ? 'Numbers could not be loaded.'
                  : !isLoading
                    ? `${dirty + cleaning + inspecting} rooms in housekeeping.`
                    : null}
              </Text>
            </Flex>
          </Spin>
        </Panel>
      ) : null}

      {showMaintenance && !showHousekeeping ? (
        <Panel title="Engineering status">
          <Spin spinning={isLoading}>
            <Flex vertical gap={12}>
              <Row gutter={[8, 8]} style={{ width: '100%' }}>
                <Col span={12}>
                  <MetricTile
                    value={isLoading ? '-' : maintenance}
                    label="Maintenance"
                    hint="Off market"
                    color={propizy.caution}
                  />
                </Col>
                {showOccupancy ? (
                  <Col span={12}>
                    <MetricTile value={isLoading ? '-' : vacant} label="Vacant" hint="Available" color={propizy.success} />
                  </Col>
                ) : null}
              </Row>
              <Text style={{ fontSize: 12, color: propizy.muted, lineHeight: 1.5 }}>
                {isError
                  ? 'Numbers could not be loaded.'
                  : !isLoading
                    ? `${maintenance} maintenance hold${maintenance !== 1 ? 's' : ''}.`
                    : null}
              </Text>
            </Flex>
          </Spin>
        </Panel>
      ) : null}

      {showOccupancy && !showHousekeeping && !showMaintenance ? (
        <Panel title="Occupancy">
          <Spin spinning={isLoading}>
            <Flex vertical gap={12}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  border: `2px solid ${trendNeutral ? 'rgba(47,143,87,0.45)' : 'rgba(201,68,74,0.45)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: trendNeutral ? propizy.success : propizy.alert,
                  background: trendNeutral ? 'rgba(47,143,87,0.08)' : 'rgba(201,68,74,0.08)',
                }}
              >
                {trendNeutral ? <ArrowUpOutlined style={{ fontSize: 18 }} /> : <ArrowDownOutlined style={{ fontSize: 18 }} />}
              </div>
              <Row gutter={[8, 8]} style={{ width: '100%' }}>
                <Col span={12}>
                  <MetricTile value={isLoading ? '-' : occupied} label="Occupied" hint={`${total} total`} color={propizy.primary} />
                </Col>
                <Col span={12}>
                  <MetricTile value={isLoading ? '-' : vacant} label="Vacant" hint="Ready" color={propizy.success} />
                </Col>
              </Row>
              <Text style={{ fontSize: 12, color: propizy.muted, lineHeight: 1.5 }}>
                {isError
                  ? 'Numbers could not be loaded.'
                  : !isLoading && occPct != null
                    ? `${occPct}% rooms occupied.`
                    : null}
              </Text>
            </Flex>
          </Spin>
        </Panel>
      ) : null}

      {showArrivals || showDepartures ? (
        <Panel title="Arrivals & departures">
          <Spin spinning={isLoading}>
            <Row gutter={[12, 12]}>
              {showArrivals ? (
                <Col span={12}>
                  <div style={{ color: propizy.muted, fontSize: 11 }}>Expected arrivals</div>
                  <Title level={5} style={{ margin: '4px 0 0', color: propizy.text }}>
                    {isLoading ? '-' : s?.arrivalsSoon ?? 0}
                  </Title>
                </Col>
              ) : null}
              {showDepartures ? (
                <Col span={12}>
                  <div style={{ color: propizy.muted, fontSize: 11 }}>Checkouts tomorrow</div>
                  <Title level={5} style={{ margin: '4px 0 0', color: propizy.text }}>
                    {isLoading ? '-' : s?.departuresTomorrow ?? 0}
                  </Title>
                </Col>
              ) : null}
              {showArrivals ? (
                <Col span={12}>
                  <div style={{ color: propizy.muted, fontSize: 11 }}>Arrivals today</div>
                  <Title level={5} style={{ margin: '4px 0 0', color: propizy.text }}>
                    {isLoading ? '-' : arrToday ?? '-'}
                  </Title>
                </Col>
              ) : null}
              {showDepartures ? (
                <Col span={12}>
                  <div style={{ color: propizy.muted, fontSize: 11 }}>Departures today</div>
                  <Title level={5} style={{ margin: '4px 0 0', color: propizy.text }}>
                    {isLoading ? '-' : depToday ?? '-'}
                  </Title>
                </Col>
              ) : null}
            </Row>
          </Spin>
        </Panel>
      ) : null}

      {showRevenue ? (
        <Panel title="Financial snapshot">
          <Spin spinning={isLoading}>
            <div style={{ color: propizy.muted, fontSize: 11 }}>Booked revenue</div>
            <Title level={5} style={{ margin: '4px 0 0', color: propizy.primary }}>
              {isLoading ? '-' : `$${Math.round(Number(s?.revenuePipeline ?? 0)).toLocaleString()}`}
            </Title>
            {showOccupancy && occPct != null && !isLoading ? (
              <Text style={{ fontSize: 12, color: propizy.muted, display: 'block', marginTop: 8 }}>
                {occPct}% occupancy
              </Text>
            ) : null}
          </Spin>
        </Panel>
      ) : null}
    </div>
  );
}
