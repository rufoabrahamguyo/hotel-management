import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Typography,
  Button,
  Input,
  Select,
  Space,
  Alert,
  Grid,
  Skeleton,
} from 'antd';
import {
  SearchOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  ClockCircleOutlined,
  ReloadOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authstore';
import { normalizeRole } from '../auth/roles';
import { useOpsSummary } from '../hooks/useOpsSummary';
import SummaryRail from '../layout/SummaryRail';
import { propizy } from '../layout/propizyTokens';
import { pageWrapStyle } from '../layout/pageStyles';
import { buildRealtimeCards } from './dashboardMetricCards';
import { resolveOverviewTitle } from './dashboardStrategies';

const { Title, Text } = Typography;

const SORT_OPTS = [
  { value: 'priority', label: 'Needs attention first' },
  { value: 'name', label: 'Title A–Z' },
];

function statusIcon(kind) {
  if (kind === 'good') return <CheckCircleOutlined style={{ color: propizy.success, fontSize: 20 }} />;
  if (kind === 'caution') return <WarningOutlined style={{ color: propizy.caution, fontSize: 20 }} />;
  if (kind === 'alert') return <ClockCircleOutlined style={{ color: propizy.alert, fontSize: 20 }} />;
  return <CheckCircleOutlined style={{ color: propizy.info, fontSize: 20 }} />;
}

function metricColor(e) {
  if (e === 'good') return propizy.success;
  if (e === 'caution') return propizy.caution;
  if (e === 'alert') return propizy.alert;
  return propizy.primary;
}

function emphasisBorder(e) {
  if (e === 'good') return 'rgba(47, 143, 87, 0.35)';
  if (e === 'caution') return 'rgba(196, 138, 26, 0.4)';
  if (e === 'alert') return 'rgba(201, 68, 74, 0.4)';
  return propizy.border;
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

  const [q, setQ] = useState('');
  const [sort, setSort] = useState('priority');
  const screens = Grid.useBreakpoint();
  const compactRail = !screens.xl;

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

  const summaryFailed =
    !isLoading && isError && error?.response?.status !== 403;

  useEffect(() => {
    if (!summaryFailed) return;
    const msg = error?.response?.data?.message || error?.message || 'Could not load the overview.';
    toast.error(msg, { id: 'ops-summary-error' });
  }, [summaryFailed, error]);

  const monitors = useMemo(() => {
    if (!role) return [];
    return buildRealtimeCards(role, summary);
  }, [role, summary]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    let list = s ? monitors.filter((m) => `${m.title} ${m.subtitle}`.toLowerCase().includes(s)) : monitors;
    list = [...list];
    if (sort === 'name') list.sort((a, b) => a.title.localeCompare(b.title));
    else {
      const order = { alert: 0, caution: 1, neutral: 2, good: 3 };
      list.sort((a, b) => order[a.emphasis] - order[b.emphasis]);
    }
    return list;
  }, [monitors, q, sort]);

  const pageTitle = role ? resolveOverviewTitle(role) : 'Operations overview';

  return (
    <div style={pageWrapStyle}>
      {!role ? (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 24, borderRadius: 12 }}
          message="No role on this account"
          description="Ask your administrator to assign a role to this account."
        />
      ) : null}

      <div
        style={{
          marginBottom: 28,
          padding: '22px 24px',
          borderRadius: 16,
          background: propizy.navy,
          color: '#f4f6f8',
          boxShadow: '0 12px 32px rgba(12, 24, 41, 0.18)',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 260px', minWidth: 0 }}>
            <Text style={{ color: 'rgba(244,246,248,0.65)', fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              {currentProperty?.name || 'Hotely'}
            </Text>
            <Title level={2} style={{ margin: '8px 0 0', color: '#fff', fontWeight: 700, letterSpacing: '-0.03em' }}>
              {pageTitle}
            </Title>
          </div>
          <Button
            icon={<ReloadOutlined />}
            loading={isFetching}
            onClick={() => refetch()}
            style={{ background: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.2)', color: '#fff' }}
          >
            Refresh
          </Button>
        </div>
      </div>

      {summaryFailed ? (
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 18, borderRadius: 12 }}
          message="Live stats unavailable"
          description={
            error?.response?.data?.message ||
            error?.message ||
            'If this keeps happening, ask your administrator to check the hotel system.'
          }
        />
      ) : null}

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          alignItems: 'center',
          marginBottom: 16,
          justifyContent: 'space-between',
        }}
      >
        <div>
          <Title level={4} style={{ margin: 0, color: propizy.text, fontWeight: 700 }}>
            Live metrics
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            {role ? `Tailored for ${role}` : 'Assign a role to see details'}
            {isFetching ? ' · Updating…' : ''}
          </Text>
        </div>
        <Space wrap>
          <Input
            allowClear
            placeholder="Filter metrics…"
            prefix={<SearchOutlined style={{ color: propizy.muted }} />}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ width: screens.md ? 220 : '100%', maxWidth: 280, borderRadius: 10 }}
          />
          <Select
            popupMatchSelectWidth={false}
            value={sort}
            onChange={setSort}
            options={SORT_OPTS}
            style={{ minWidth: 170 }}
          />
        </Space>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: 14,
        }}
      >
        {isLoading && !filtered.length
          ? Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                style={{
                  background: propizy.surface,
                  borderRadius: 14,
                  padding: 18,
                  border: `1px solid ${propizy.border}`,
                }}
              >
                <Skeleton active paragraph={{ rows: 2 }} />
              </div>
            ))
          : null}

        {filtered.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => navigate(m.navigate)}
            style={{
              textAlign: 'left',
              cursor: 'pointer',
              background: propizy.surface,
              borderRadius: 14,
              padding: '18px 18px 16px',
              border: `1px solid ${emphasisBorder(m.emphasis)}`,
              boxShadow: '0 2px 8px rgba(12, 24, 41, 0.04)',
              transition: 'transform .15s ease, box-shadow .15s ease',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              font: 'inherit',
              color: 'inherit',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 10px 24px rgba(12, 24, 41, 0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(12, 24, 41, 0.04)';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: propizy.bg,
                    display: 'grid',
                    placeItems: 'center',
                    flexShrink: 0,
                  }}
                >
                  {statusIcon(m.emphasis)}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: propizy.text, fontSize: 14 }}>{m.title}</div>
                  <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                    {m.subtitle}
                  </Text>
                </div>
              </div>
              <ArrowRightOutlined style={{ color: propizy.muted, fontSize: 12, marginTop: 4 }} />
            </div>
            <div
              style={{
                fontSize: 30,
                fontWeight: 750,
                lineHeight: 1.1,
                color: metricColor(m.emphasis),
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: '-0.03em',
              }}
            >
              {m.metric}
            </div>
            <Text type="secondary" style={{ fontSize: 12, lineHeight: 1.45 }}>
              {m.detail}
            </Text>
          </button>
        ))}
      </div>

      {!filtered.length && !isLoading ? (
        <Text type="secondary" style={{ display: 'block', marginTop: 16 }}>
          No metrics matched your filters.
        </Text>
      ) : null}

      {compactRail ? (
        <div style={{ marginTop: 28 }}>
          <SummaryRail user={user} />
        </div>
      ) : null}
    </div>
  );
}
