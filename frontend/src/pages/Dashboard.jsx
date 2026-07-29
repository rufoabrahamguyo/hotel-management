import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Typography,
  Button,
  Alert,
  Grid,
  Skeleton,
  Card,
  Row,
  Col,
  Tabs,
  Space,
  Divider,
} from 'antd';
import {
  ReloadOutlined,
  CaretUpOutlined,
  CaretDownOutlined,
} from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authstore';
import { normalizeRole } from '../auth/roles';
import { useOpsSummary } from '../hooks/useOpsSummary';
import SummaryRail from '../layout/SummaryRail';
import { pageWrapStyle } from '../layout/pageStyles';
import { buildRealtimeCards } from './dashboardMetricCards';
import { resolveOverviewTitle } from './dashboardStrategies';
import { MiniArea, MiniBars, TrendBarChart, RankList } from '../components/dashboardCharts';

const { Title, Text } = Typography;

const cardShadow = '0 1px 2px -2px rgba(0,0,0,.08), 0 3px 6px 0 rgba(0,0,0,.06), 0 5px 12px 4px rgba(0,0,0,.04)';

function sparkHeights(seed, n = 18) {
  const out = [];
  let x = (seed % 17) + 7;
  for (let i = 0; i < n; i += 1) {
    x = (x * 17 + 13 + i * 3) % 37;
    out.push(10 + x);
  }
  return out;
}

function StatCard({ card, loading, onOpen }) {
  const up = card.emphasis === 'good' || card.emphasis === 'neutral';
  const ratioColor = card.emphasis === 'alert' ? '#cf1322' : card.emphasis === 'caution' ? '#d48806' : '#3f8600';
  const chartColor = card.emphasis === 'alert' ? '#ff7875' : card.emphasis === 'caution' ? '#ffc53d' : '#1890ff';

  return (
    <Card
      hoverable
      onClick={onOpen}
      styles={{ body: { padding: '20px 20px 12px' } }}
      style={{
        borderRadius: 8,
        border: 'none',
        boxShadow: cardShadow,
        cursor: 'pointer',
        height: '100%',
      }}
    >
      {loading ? (
        <Skeleton active paragraph={{ rows: 3 }} title={false} />
      ) : (
        <>
          <Text type="secondary" style={{ fontSize: 14 }}>
            {card.title}
          </Text>
          <div
            style={{
              fontSize: 30,
              fontWeight: 600,
              lineHeight: 1.25,
              margin: '8px 0 4px',
              color: '#262626',
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '-0.02em',
            }}
          >
            {card.metric}
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 8, fontSize: 13 }}>
            <span style={{ color: ratioColor }}>
              {up ? <CaretUpOutlined /> : <CaretDownOutlined />} {card.subtitle}
            </span>
          </div>
          <div style={{ margin: '4px 0 8px' }}>
            {card.key === 'rev' || card.key === 'occPct' ? (
              <MiniArea color={chartColor} heights={sparkHeights(card.metric?.length || 5)} />
            ) : (
              <MiniBars color={chartColor} heights={sparkHeights((card.metric && Number(card.metric)) || 9, 12)} />
            )}
          </div>
          <Divider style={{ margin: '12px 0 10px' }} />
          <Text type="secondary" style={{ fontSize: 13 }}>
            {card.detail}
          </Text>
        </>
      )}
    </Card>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const properties = useAuthStore((s) => s.properties);
  const propertyId = useAuthStore((s) => s.propertyId);
  const role = normalizeRole(user?.role);
  const deniedToast = useRef(false);
  const currentProperty = properties.find((p) => p.id === propertyId);

  const { data: summary, isLoading, isFetching, isError, error, refetch } = useOpsSummary();

  const screens = Grid.useBreakpoint();
  const compactRail = !screens.xl;
  const [trendTab, setTrendTab] = useState('ops');

  useEffect(() => {
    const d = location.state?.accessDenied;
    if (!d || deniedToast.current) return;
    deniedToast.current = true;
    if (d === 'forbidden') {
      toast.error('You do not have access to that area.', { id: 'access-denied' });
    } else if (d === 'no-role') {
      toast.error('Your account has no role assigned. Contact an administrator.', { id: 'access-denied' });
    }
  }, [location.state]);

  const summaryFailed = !isLoading && isError && error?.response?.status !== 403;

  useEffect(() => {
    if (!summaryFailed) return;
    const msg = error?.response?.data?.message || error?.message || 'Could not load the overview.';
    toast.error(msg, { id: 'ops-summary-error' });
  }, [summaryFailed, error]);

  const monitors = useMemo(() => {
    if (!role) return [];
    return buildRealtimeCards(role, summary);
  }, [role, summary]);

  const topCards = monitors.slice(0, 4);
  const pageTitle = role ? resolveOverviewTitle(role) : 'Operations overview';

  const s = summary ?? {};
  const occupied = Number(s.occupiedRooms) || 0;
  const vacant = Number(s.vacantRooms) || 0;
  const dirty = Number(s.dirtyRooms) || 0;
  const cleaning = Number(s.cleaningRooms) || 0;
  const inspecting = Number(s.inspectingRooms) || 0;
  const maintenance = Number(s.maintenanceRooms) || 0;
  const arrToday = Number(s.arrivalsDueToday) || 0;
  const depToday = Number(s.departuresDueToday) || 0;
  const upcoming = Number(s.upcomingBookings) || 0;
  const inHouse = Number(s.inHouseGuests) || 0;
  const revenue = Math.round(Number(s.revenuePipeline) || 0);

  const trendLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const opsSeries = useMemo(
    () => [
      {
        name: 'Arrivals',
        values: trendLabels.map((_, i) => Math.max(0, arrToday + ((i * 3 + occupied) % 5) - 1)),
      },
      {
        name: 'Departures',
        values: trendLabels.map((_, i) => Math.max(0, depToday + ((i * 2 + vacant) % 4))),
      },
    ],
    [arrToday, depToday, occupied, vacant],
  );

  const roomSeries = useMemo(
    () => [
      {
        name: 'Occupied',
        values: trendLabels.map((_, i) => Math.max(0, occupied + ((i + dirty) % 3) - 1)),
      },
      {
        name: 'Vacant',
        values: trendLabels.map((_, i) => Math.max(0, vacant + ((i * 2) % 3))),
      },
    ],
    [occupied, vacant, dirty],
  );

  const ranking = useMemo(() => {
    const rows = [
      { key: 'occ', label: 'Occupied rooms', value: occupied },
      { key: 'vac', label: 'Vacant rooms', value: vacant },
      { key: 'dirty', label: 'Dirty rooms', value: dirty },
      { key: 'clean', label: 'Cleaning / inspection', value: cleaning + inspecting },
      { key: 'maint', label: 'Maintenance holds', value: maintenance },
      { key: 'arr', label: 'Arrivals today', value: arrToday },
      { key: 'dep', label: 'Departures today', value: depToday },
      { key: 'in', label: 'In-house guests', value: inHouse },
      { key: 'up', label: 'Upcoming bookings', value: upcoming },
      { key: 'rev', label: 'Revenue pipeline ($)', value: revenue.toLocaleString() },
    ];
    return rows
      .map((r) => ({ ...r, sortVal: typeof r.value === 'number' ? r.value : Number(String(r.value).replace(/,/g, '')) || 0 }))
      .sort((a, b) => b.sortVal - a.sortVal)
      .slice(0, 7)
      .map(({ sortVal: _s, ...rest }) => rest);
  }, [occupied, vacant, dirty, cleaning, inspecting, maintenance, arrToday, depToday, inHouse, upcoming, revenue]);

  return (
    <div style={{ ...pageWrapStyle, background: '#f0f2f5', paddingTop: 20 }}>
      {!role ? (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 24, borderRadius: 8 }}
          message="No role on this account"
          description="Ask your administrator to assign a role to this account."
        />
      ) : null}

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 20,
        }}
      >
        <div>
          <Text type="secondary" style={{ fontSize: 13 }}>
            {currentProperty?.name || 'Hotely'}
          </Text>
          <Title level={4} style={{ margin: '2px 0 0', fontWeight: 600, color: '#262626' }}>
            {pageTitle}
          </Title>
        </div>
        <Button icon={<ReloadOutlined />} loading={isFetching} onClick={() => refetch()}>
          Refresh
        </Button>
      </div>

      {summaryFailed ? (
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 18, borderRadius: 8 }}
          message="Live stats unavailable"
          description={
            error?.response?.data?.message ||
            error?.message ||
            'If this keeps happening, ask your administrator to check the hotel system.'
          }
        />
      ) : null}

      <Row gutter={[16, 16]}>
        {(isLoading && !topCards.length ? Array.from({ length: 4 }).map((_, i) => ({ key: `sk-${i}` })) : topCards).map(
          (m, i) => (
            <Col key={m.key || i} xs={24} sm={12} lg={6}>
              <StatCard
                card={
                  m.title
                    ? m
                    : { title: '…', metric: '-', subtitle: '', detail: '', key: 'sk', emphasis: 'neutral' }
                }
                loading={isLoading && !m.title}
                onOpen={() => m.navigate && navigate(m.navigate)}
              />
            </Col>
          ),
        )}
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} xl={16}>
          <Card
            style={{ borderRadius: 8, border: 'none', boxShadow: cardShadow }}
            styles={{ body: { padding: '8px 20px 20px' } }}
          >
            <Tabs
              activeKey={trendTab}
              onChange={setTrendTab}
              items={[
                { key: 'ops', label: 'Arrivals' },
                { key: 'rooms', label: 'Rooms' },
              ]}
              tabBarExtraContent={
                <Space size="middle" wrap>
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    This week
                  </Text>
                </Space>
              }
            />
            <Title level={5} style={{ margin: '4px 0 16px', fontWeight: 500, color: '#262626' }}>
              {trendTab === 'ops' ? 'Front desk activity trend' : 'Room inventory trend'}
            </Title>
            {isLoading ? (
              <Skeleton active paragraph={{ rows: 8 }} />
            ) : (
              <TrendBarChart
                labels={trendLabels}
                series={trendTab === 'ops' ? opsSeries : roomSeries}
                colorA="#91d5ff"
                colorB="#1890ff"
              />
            )}
            <div style={{ display: 'flex', gap: 24, marginTop: 16, fontSize: 13, color: '#8c8c8c' }}>
              <span>
                <span style={{ display: 'inline-block', width: 10, height: 10, background: '#91d5ff', marginRight: 6 }} />
                {trendTab === 'ops' ? 'Arrivals' : 'Occupied'}
              </span>
              <span>
                <span style={{ display: 'inline-block', width: 10, height: 10, background: '#1890ff', marginRight: 6 }} />
                {trendTab === 'ops' ? 'Departures' : 'Vacant'}
              </span>
            </div>
          </Card>
        </Col>

        <Col xs={24} xl={8}>
          <Card
            title={<span style={{ fontWeight: 500 }}>Operations ranking</span>}
            style={{ borderRadius: 8, border: 'none', boxShadow: cardShadow, height: '100%' }}
            styles={{ body: { paddingTop: 8 } }}
          >
            {isLoading ? <Skeleton active paragraph={{ rows: 7 }} /> : <RankList items={ranking} />}
          </Card>
        </Col>
      </Row>

      {monitors.length > 4 ? (
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          {monitors.slice(4).map((m) => (
            <Col key={m.key} xs={24} sm={12} lg={8}>
              <StatCard card={m} loading={false} onOpen={() => navigate(m.navigate)} />
            </Col>
          ))}
        </Row>
      ) : null}

      {compactRail ? (
        <div style={{ marginTop: 24 }}>
          <SummaryRail user={user} />
        </div>
      ) : null}
    </div>
  );
}
