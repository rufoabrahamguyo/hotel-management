import { useEffect } from 'react';
import { Card, Col, Divider, Row, Space, Spin, Statistic, Tag, Typography } from 'antd';
import toast from 'react-hot-toast';
import { useOpsSummary } from '../hooks/useOpsSummary';
import { pageCardStyle as cardStyle, pageHeaderStyle as headerStyle, pageWrapStyle } from '../layout/pageStyles';

const { Paragraph, Title } = Typography;

export default function Reports() {
  const q = useOpsSummary();

  useEffect(() => {
    if (!q.isError) return;
    const msg = q.error?.response?.data?.message || q.error?.message || 'Could not load report summary.';
    toast.error(msg);
  }, [q.isError, q.error]);

  const d = q.data ?? {};
  const occupied = (d.roomsByStatus ?? []).find((r) => r.status === 'occupied')?.count ?? 0;
  const occ =
    (d.totalRooms ?? 0) > 0 ? ((occupied / d.totalRooms) * 100).toFixed(1) : '0';

  return (
    <div style={pageWrapStyle}>
      <Card bordered={false} style={cardStyle} styles={{ header: headerStyle }} title="Reports">
        <Spin spinning={q.isLoading}>
          <Paragraph type="secondary" style={{ marginBottom: 20 }}>
            Room counts, stays, arrivals, departures, and booked revenue totals.
          </Paragraph>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} lg={6}>
              <Statistic title="Booked revenue (estimate)" value={(d.revenuePipeline ?? 0).toFixed(2)} prefix="$" />
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Statistic title="Estimated occupancy (by room)" value={occ} suffix="%" />
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Statistic title="In-house stays" value={d.inHouseGuests ?? 0} />
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Statistic title="Rooms" value={d.totalRooms ?? 0} />
            </Col>
          </Row>
          <Divider />
          <Row gutter={[24, 24]}>
            <Col xs={24} lg={12}>
              <Title level={5} >
                Rooms by housekeeping / front status
              </Title>
              <SpaceTags items={d.roomsByStatus ?? []} />
            </Col>
            <Col xs={24} lg={12}>
              <Title level={5} >
                Reservations by stay status
              </Title>
              <SpaceTags items={d.reservationsByStatus ?? []} substituteSpace />
            </Col>
          </Row>
          <Divider />
          <Title level={5} style={{ marginBottom: 8 }}>
            Front desk pulses
          </Title>
          <Paragraph style={{ marginBottom: 0 }}>
            Arrivals in the next ~36 hours (upcoming / in-house overlaps):{' '}
            <strong>{d.arrivalsSoon ?? 0}</strong>. Departures rolling through tomorrow:{' '}
            <strong>{d.departuresTomorrow ?? 0}</strong>.
          </Paragraph>
        </Spin>
      </Card>
    </div>
  );
}

function SpaceTags({ items, substituteSpace }) {
  if (!(items ?? []).length) {
    return <Paragraph type="secondary">No data.</Paragraph>;
  }
  return (
    <Space wrap align="flex-start">
      {items.map((row) => (
        <Tag key={row.status} style={{ padding: '4px 12px', fontSize: 14 }}>
          {(substituteSpace ? row.status.replace(/_/g, ' ') : row.status)} · {row.count}
        </Tag>
      ))}
    </Space>
  );
}
