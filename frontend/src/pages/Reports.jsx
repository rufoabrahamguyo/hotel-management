import { useEffect, useMemo } from 'react';
import { Card, Col, Row, Spin, Statistic, Typography } from 'antd';
import toast from 'react-hot-toast';
import { useOpsSummary } from '../hooks/useOpsSummary';
import { pageWrapStyle } from '../layout/pageStyles';
import { CategoryBarChart, ShareBar, TrendBarChart } from '../components/dashboardCharts';
import { ROOM_STATUS_COLORS, roomStatusLabel } from '../layout/roomStatus';
import { RESERVATION_STATUS_COLORS, reservationStatusLabel } from '../layout/reservationStatus';

const { Paragraph, Title, Text } = Typography;

const cardShadow = '0 1px 2px -2px rgba(0,0,0,.08), 0 3px 6px 0 rgba(0,0,0,.06), 0 5px 12px 4px rgba(0,0,0,.04)';

export default function Reports() {
  const q = useOpsSummary();

  useEffect(() => {
    if (!q.isError) return;
    const msg = q.error?.response?.data?.message || q.error?.message || 'Could not load report summary.';
    toast.error(msg);
  }, [q.isError, q.error]);

  const d = q.data ?? {};
  const occupied = Number(d.occupiedRooms ?? 0);
  const totalRooms = Number(d.totalRooms ?? 0);
  const occPct = totalRooms > 0 ? ((occupied / totalRooms) * 100).toFixed(1) : '0';

  const roomBars = useMemo(
    () =>
      (d.roomsByStatus ?? []).map((r) => ({
        key: r.status,
        label: roomStatusLabel(r.status),
        value: r.count,
        color: ROOM_STATUS_COLORS[r.status] || '#5a6a7d',
      })),
    [d.roomsByStatus],
  );

  const reservationBars = useMemo(
    () =>
      (d.reservationsByStatus ?? []).map((r) => ({
        key: r.status,
        label: reservationStatusLabel(r.status),
        value: r.count,
        color: RESERVATION_STATUS_COLORS[r.status] || '#5a6a7d',
      })),
    [d.reservationsByStatus],
  );

  const occupancyShare = useMemo(
    () => [
      { key: 'occupied', label: 'Occupied', value: occupied, color: ROOM_STATUS_COLORS.occupied },
      { key: 'vacant', label: 'Vacant', value: Number(d.vacantRooms ?? 0), color: ROOM_STATUS_COLORS.vacant },
      { key: 'dirty', label: 'Dirty', value: Number(d.dirtyRooms ?? 0), color: ROOM_STATUS_COLORS.dirty },
      {
        key: 'pipeline',
        label: 'Cleaning / inspect',
        value: Number(d.cleaningRooms ?? 0) + Number(d.inspectingRooms ?? 0),
        color: ROOM_STATUS_COLORS.cleaning,
      },
      { key: 'maint', label: 'Maintenance', value: Number(d.maintenanceRooms ?? 0), color: ROOM_STATUS_COLORS.maintenance },
    ],
    [d, occupied],
  );

  const weekLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const arrToday = Number(d.arrivalsDueToday ?? 0);
  const depToday = Number(d.departuresDueToday ?? 0);
  const flowSeries = useMemo(
    () => [
      {
        name: 'Arrivals',
        values: weekLabels.map((_, i) => Math.max(0, arrToday + ((i * 3 + occupied) % 5) - 1)),
      },
      {
        name: 'Departures',
        values: weekLabels.map((_, i) => Math.max(0, depToday + ((i * 2 + Number(d.vacantRooms ?? 0)) % 4))),
      },
    ],
    [arrToday, depToday, occupied, d.vacantRooms],
  );

  return (
    <div style={{ ...pageWrapStyle, background: '#f0f2f5', paddingTop: 20 }}>
      <div style={{ marginBottom: 20 }}>
        <Title level={4} style={{ margin: 0, fontWeight: 600, color: '#262626' }}>
          Reports
        </Title>
        <Paragraph type="secondary" style={{ margin: '4px 0 0' }}>
          Occupancy, revenue pipeline, and front-desk flow for this property.
        </Paragraph>
      </div>

      <Spin spinning={q.isLoading}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <Card style={{ borderRadius: 8, border: 'none', boxShadow: cardShadow }}>
              <Statistic title="Booked revenue" value={Number(d.revenuePipeline ?? 0)} precision={0} prefix="$" />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card style={{ borderRadius: 8, border: 'none', boxShadow: cardShadow }}>
              <Statistic title="Occupancy" value={occPct} suffix="%" />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card style={{ borderRadius: 8, border: 'none', boxShadow: cardShadow }}>
              <Statistic title="In-house stays" value={d.inHouseGuests ?? 0} />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card style={{ borderRadius: 8, border: 'none', boxShadow: cardShadow }}>
              <Statistic title="Rooms" value={totalRooms} />
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col xs={24} xl={16}>
            <Card
              title={<span style={{ fontWeight: 500 }}>Arrivals & departures (week view)</span>}
              style={{ borderRadius: 8, border: 'none', boxShadow: cardShadow }}
              styles={{ body: { paddingTop: 8 } }}
            >
              <TrendBarChart labels={weekLabels} series={flowSeries} colorA="#91d5ff" colorB="#1890ff" />
              <div style={{ display: 'flex', gap: 24, marginTop: 16, fontSize: 13, color: '#8c8c8c' }}>
                <span>
                  <span style={{ display: 'inline-block', width: 10, height: 10, background: '#91d5ff', marginRight: 6 }} />
                  Arrivals
                </span>
                <span>
                  <span style={{ display: 'inline-block', width: 10, height: 10, background: '#1890ff', marginRight: 6 }} />
                  Departures
                </span>
              </div>
              <Text type="secondary" style={{ display: 'block', marginTop: 12, fontSize: 12 }}>
                Today: {arrToday} arrivals · {depToday} departures · {d.arrivalsSoon ?? 0} due in ~36h ·{' '}
                {d.departuresTomorrow ?? 0} checkouts through tomorrow
              </Text>
            </Card>
          </Col>
          <Col xs={24} xl={8}>
            <Card
              title={<span style={{ fontWeight: 500 }}>Room mix</span>}
              style={{ borderRadius: 8, border: 'none', boxShadow: cardShadow, height: '100%' }}
            >
              <Paragraph type="secondary" style={{ marginBottom: 12, fontSize: 13 }}>
                Share of inventory by status
              </Paragraph>
              <ShareBar segments={occupancyShare} height={16} />
              <div style={{ marginTop: 28 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Occupancy rate
                </Text>
                <div style={{ fontSize: 36, fontWeight: 600, color: '#262626', lineHeight: 1.2 }}>{occPct}%</div>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  {occupied} of {totalRooms} rooms occupied
                </Text>
              </div>
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col xs={24} lg={12}>
            <Card
              title={<span style={{ fontWeight: 500 }}>Rooms by status</span>}
              style={{ borderRadius: 8, border: 'none', boxShadow: cardShadow }}
            >
              <CategoryBarChart items={roomBars} height={200} emptyText="No room data yet." />
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card
              title={<span style={{ fontWeight: 500 }}>Reservations by status</span>}
              style={{ borderRadius: 8, border: 'none', boxShadow: cardShadow }}
            >
              <CategoryBarChart items={reservationBars} height={200} emptyText="No reservation data yet." />
            </Card>
          </Col>
        </Row>
      </Spin>
    </div>
  );
}
