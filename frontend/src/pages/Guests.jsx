import { useCallback, useMemo, useState } from 'react';
import {
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
} from 'antd';
import { EditOutlined, PlusOutlined, CalendarOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { pageCardStyle as cardStyle, pageHeaderStyle as headerStyle, pageWrapStyle } from '../layout/pageStyles';

const { Paragraph, Title } = Typography;
const { RangePicker } = DatePicker;

const RESERVATION_STATUS = ['upcoming', 'checked_in', 'checked_out', 'cancelled', 'no_show'];

function statusColorReservation(s) {
  switch (s) {
    case 'checked_in':
      return 'processing';
    case 'upcoming':
      return 'cyan';
    case 'checked_out':
      return 'default';
    case 'cancelled':
    case 'no_show':
      return 'warning';
    default:
      return 'blue';
  }
}

export default function Guests() {
  const qc = useQueryClient();
  const [guestModalOpen, setGuestModalOpen] = useState(false);
  const [editingGuest, setEditingGuest] = useState(null);
  const [resModalOpen, setResModalOpen] = useState(false);
  const [editingReservation, setEditingReservation] = useState(null);
  const [guestForm] = Form.useForm();
  const [resForm] = Form.useForm();
  const [statusFilter, setStatusFilter] = useState(undefined);

  const guestsQ = useQuery({
    queryKey: ['guests'],
    queryFn: async () => {
      const { data } = await api.get('/guests');
      return data.guests ?? [];
    },
  });

  const roomsQ = useQuery({
    queryKey: ['rooms'],
    queryFn: async () => {
      const { data } = await api.get('/rooms');
      return data.rooms ?? [];
    },
  });

  const reservationsQ = useQuery({
    queryKey: ['reservations', statusFilter],
    queryFn: async () => {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      const { data } = await api.get('/reservations', { params });
      return data.reservations ?? [];
    },
  });

  const saveGuestMutation = useMutation({
    mutationFn: async ({ id, payload }) =>
      id ? api.patch(`/guests/${id}`, payload) : api.post('/guests', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['guests'] });
      qc.invalidateQueries({ queryKey: ['reservations'] });
      toast.success(editingGuest ? 'Guest updated.' : 'Guest created.');
      guestForm.resetFields();
      setGuestModalOpen(false);
      setEditingGuest(null);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Could not save guest.');
    },
  });

  const deleteGuestMutation = useMutation({
    mutationFn: async (id) => api.delete(`/guests/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['guests'] });
      qc.invalidateQueries({ queryKey: ['reservations'] });
      toast.success('Guest removed.');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Could not delete guest.');
    },
  });

  const saveResMutation = useMutation({
    mutationFn: async ({ id, payload }) =>
      id ? api.patch(`/reservations/${id}`, payload) : api.post('/reservations', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reservations'] });
      qc.invalidateQueries({ queryKey: ['rooms'] });
      toast.success(editingReservation ? 'Reservation updated.' : 'Reservation saved.');
      resForm.resetFields();
      setResModalOpen(false);
      setEditingReservation(null);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || err.response?.data?.error || 'Could not save reservation.');
    },
  });

  const deleteResMutation = useMutation({
    mutationFn: async (id) => api.delete(`/reservations/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reservations'] });
      qc.invalidateQueries({ queryKey: ['rooms'] });
      toast.success('Reservation deleted.');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Could not delete reservation.');
    },
  });

  const openNewGuest = useCallback(() => {
    setEditingGuest(null);
    guestForm.resetFields();
    setGuestModalOpen(true);
  }, [guestForm]);

  const openEditGuest = useCallback(
    (g) => {
      setEditingGuest(g);
      guestForm.setFieldsValue({
        full_name: g.full_name,
        email: g.email ?? '',
        phone: g.phone ?? '',
        document_id: g.document_id ?? '',
        notes: g.notes ?? '',
      });
      setGuestModalOpen(true);
    },
    [guestForm],
  );

  const openNewReservation = useCallback(() => {
    setEditingReservation(null);
    resForm.resetFields();
    resForm.setFieldsValue({
      adults: 2,
      status: 'upcoming',
      total_rate: undefined,
    });
    setResModalOpen(true);
  }, [resForm]);

  const openEditReservation = useCallback(
    (r) => {
      setEditingReservation(r);
      resForm.setFieldsValue({
        guest_id: r.guest_id,
        room_id: r.room_id,
        range: [
          dayjs(r.check_in),
          dayjs(r.check_out),
        ],
        adults: r.adults,
        notes: r.notes ?? '',
        status: r.status,
        total_rate:
          r.total_rate != null && r.total_rate !== ''
            ? Number(r.total_rate)
            : undefined,
      });
      setResModalOpen(true);
    },
    [resForm],
  );

  const onGuestSubmit = (values) => {
    const payload = {
      full_name: values.full_name.trim(),
      email: values.email?.trim() || null,
      phone: values.phone?.trim() || null,
      document_id: values.document_id?.trim() || null,
      notes: values.notes?.trim() || null,
    };
    saveGuestMutation.mutate({ id: editingGuest?.id, payload });
  };

  const onResSubmit = (values) => {
    const rng = values.range;
    if (!rng?.length || !rng[0] || !rng[1]) {
      toast.error('Choose check-in and check-out.');
      return;
    }
    const payload = {
      guest_id: values.guest_id,
      room_id: values.room_id,
      check_in: rng[0].toISOString(),
      check_out: rng[1].toISOString(),
      adults: values.adults ?? 2,
      status: values.status ?? 'upcoming',
      notes: values.notes?.trim() ? values.notes.trim() : null,
    };
    if (values.total_rate !== undefined && values.total_rate !== null && values.total_rate !== '') {
      payload.total_rate = Number(values.total_rate);
    }

    saveResMutation.mutate({
      id: editingReservation?.id,
      payload,
    });
  };

  const quickCheckIn = useCallback(
    (id) => {
      api
        .patch(`/reservations/${id}`, { status: 'checked_in' })
        .then(() => {
          qc.invalidateQueries({ queryKey: ['reservations'] });
          qc.invalidateQueries({ queryKey: ['rooms'] });
          toast.success('Checked in.');
        })
        .catch((err) => toast.error(err.response?.data?.message || 'Check-in failed.'));
    },
    [qc],
  );

  const quickCheckOut = useCallback(
    (id) => {
      api
        .patch(`/reservations/${id}`, { status: 'checked_out' })
        .then(() => {
          qc.invalidateQueries({ queryKey: ['reservations'] });
          qc.invalidateQueries({ queryKey: ['rooms'] });
          toast.success('Checked out.');
        })
        .catch((err) => toast.error(err.response?.data?.message || 'Check-out failed.'));
    },
    [qc],
  );

  const reservationColumns = useMemo(
    () => [
      { title: 'Guest', dataIndex: 'guest_name', key: 'guest_name', ellipsis: true },
      { title: 'Room', dataIndex: 'room_number', key: 'room_number', width: 90 },
      {
        title: 'Arrival',
        dataIndex: 'check_in',
        key: 'check_in',
        width: 165,
        render: (v) => dayjs(v).format('MMM D YYYY HH:mm'),
      },
      {
        title: 'Departure',
        dataIndex: 'check_out',
        key: 'check_out',
        width: 165,
        render: (v) => dayjs(v).format('MMM D YYYY HH:mm'),
      },
      {
        title: 'Status',
        dataIndex: 'status',
        key: 'status',
        width: 118,
        render: (s) => <Tag color={statusColorReservation(s)}>{s.replace('_', ' ')}</Tag>,
      },
      {
        title: 'Total',
        dataIndex: 'total_rate',
        key: 'total_rate',
        width: 100,
        render: (n) =>
          n == null ? '-' : Number(n).toLocaleString(undefined, { style: 'currency', currency: 'USD' }),
      },
      {
        title: '',
        key: 'actions',
        width: 220,
        render: (_, r) => (
          <Space wrap size="small">
            <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEditReservation(r)}>
              Edit
            </Button>
            {r.status === 'upcoming' && (
              <Popconfirm
                title="Check this guest in?"
                okText="Check in"
                onConfirm={() => quickCheckIn(r.id)}
              >
                <Button size="small" type="primary" ghost>
                  Check in
                </Button>
              </Popconfirm>
            )}
            {r.status === 'checked_in' && (
              <Popconfirm
                title="Check this guest out?"
                okText="Check out"
                onConfirm={() => quickCheckOut(r.id)}
              >
                <Button size="small">Check out</Button>
              </Popconfirm>
            )}
            <Popconfirm
              title="Delete reservation?"
              okText="Delete"
              okButtonProps={{ danger: true }}
              onConfirm={() => deleteResMutation.mutateAsync(r.id)}
            >
              <Button danger type="link" size="small" loading={deleteResMutation.isPending}>
                Delete
              </Button>
            </Popconfirm>
          </Space>
        ),
      },
    ],
    [openEditReservation, quickCheckIn, quickCheckOut, deleteResMutation],
  );

  const guestColumns = useMemo(
    () => [
      { title: 'Name', dataIndex: 'full_name', key: 'full_name' },
      { title: 'Email', dataIndex: 'email', key: 'email', ellipsis: true, render: (t) => t || '-' },
      { title: 'Phone', dataIndex: 'phone', key: 'phone', width: 130, render: (t) => t || '-' },
      {
        title: '',
        key: 'act',
        width: 220,
        render: (_, g) => (
          <Space>
            <Button type="link" size="small" onClick={() => openEditGuest(g)}>
              Edit
            </Button>
            <Popconfirm
              title="Remove this guest?"
              okText="Delete"
              okButtonProps={{ danger: true }}
              onConfirm={() => deleteGuestMutation.mutateAsync(g.id)}
            >
              <Button danger type="link" size="small" loading={deleteGuestMutation.isPending}>
                Delete
              </Button>
            </Popconfirm>
          </Space>
        ),
      },
    ],
    [openEditGuest, deleteGuestMutation],
  );

  return (
    <div style={pageWrapStyle}>
      <Tabs
        defaultActiveKey="reservations"
        items={[
          {
            key: 'reservations',
            label: (
              <span>
                <CalendarOutlined /> Reservations
              </span>
            ),
            children: (
              <Card bordered={false} style={cardStyle} styles={{ header: headerStyle }} title="Stays">
                <Space direction="vertical" size={16} style={{ width: '100%' }}>
                  <Space wrap>
                    <Title level={5} style={{ margin: 0 }}>
                      Guest ledger & arrivals
                    </Title>
                    <Select
                      allowClear
                      placeholder="Filter status"
                      style={{ minWidth: 160 }}
                      value={statusFilter}
                      options={RESERVATION_STATUS.map((v) => ({ label: v.replace('_', ' '), value: v }))}
                      onChange={(v) => setStatusFilter(v)}
                    />
                    <Button type="primary" icon={<PlusOutlined />} onClick={openNewReservation}>
                      New reservation
                    </Button>
                  </Space>
                  <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                    Check-in marks the room occupied; check-out sends it back to housekeeping for cleaning.
                  </Paragraph>
                  <Table
                    size="middle"
                    rowKey="id"
                    loading={reservationsQ.isLoading}
                    pagination={{ pageSize: 10 }}
                    scroll={{ x: true }}
                    dataSource={reservationsQ.data}
                    columns={reservationColumns}
                  />
                </Space>
              </Card>
            ),
          },
          {
            key: 'guests',
            label: 'Guest registry',
            children: (
              <Card bordered={false} style={cardStyle} styles={{ header: headerStyle }} title="Guest profiles">
                <Space direction="vertical" size={16} style={{ width: '100%' }}>
                  <Space wrap>
                    <Title level={5} style={{ margin: 0 }}>
                      Profiles
                    </Title>
                    <Button type="primary" icon={<PlusOutlined />} onClick={openNewGuest}>
                      Register guest
                    </Button>
                  </Space>
                  <Table
                    size="middle"
                    rowKey="id"
                    loading={guestsQ.isLoading}
                    pagination={{ pageSize: 12 }}
                    scroll={{ x: true }}
                    dataSource={guestsQ.data}
                    columns={guestColumns}
                  />
                </Space>
              </Card>
            ),
          },
        ]}
      />

      <Modal
        centered
        open={guestModalOpen}
        title={editingGuest ? 'Edit guest' : 'Register guest'}
        onCancel={() => {
          setGuestModalOpen(false);
          setEditingGuest(null);
          guestForm.resetFields();
        }}
        footer={null}
        destroyOnClose
      >
        <Form layout="vertical" form={guestForm} onFinish={onGuestSubmit}>
          <Form.Item name="full_name" label="Full name" rules={[{ required: true, message: 'Name is required.' }]}>
            <Input placeholder="Guest name" />
          </Form.Item>
          <Form.Item name="email" label="Email">
            <Input placeholder="guest@example.com" />
          </Form.Item>
          <Form.Item name="phone" label="Phone">
            <Input />
          </Form.Item>
          <Form.Item name="document_id" label="ID / passport">
            <Input />
          </Form.Item>
          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={saveGuestMutation.isPending} block>
            Save guest
          </Button>
        </Form>
      </Modal>

      <Modal
        centered
        open={resModalOpen}
        width={560}
        title={editingReservation ? 'Reservation' : 'New reservation'}
        onCancel={() => {
          setResModalOpen(false);
          setEditingReservation(null);
          resForm.resetFields();
        }}
        footer={null}
        destroyOnClose
      >
        <Form layout="vertical" form={resForm} onFinish={onResSubmit}>
          <Form.Item name="guest_id" label="Guest" rules={[{ required: true }]}>
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="Select guest"
              options={(guestsQ.data ?? []).map((g) => ({
                label: g.full_name,
                value: g.id,
              }))}
            />
          </Form.Item>
          <Form.Item name="room_id" label="Room" rules={[{ required: true }]}>
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="Room"
              options={(roomsQ.data ?? []).map((r) => ({
                label: `${r.number} (${r.type}, ${r.status})`,
                value: r.id,
              }))}
            />
          </Form.Item>
          <Form.Item name="range" label="Check-in / check-out" rules={[{ required: true, message: 'Dates required.' }]}>
            <RangePicker showTime style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="adults" label="Guests" rules={[{ required: true }]}>
            <InputNumber min={1} max={12} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="status" label="Status">
            <Select options={RESERVATION_STATUS.map((v) => ({ label: v.replace('_', ' '), value: v }))} />
          </Form.Item>
          <Form.Item name="total_rate" label="Total rate (optional)">
            <InputNumber prefix="$" min={0} style={{ width: '100%' }} placeholder="Auto from nightly rate × nights" />
          </Form.Item>
          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={saveResMutation.isPending} block>
            Save reservation
          </Button>
        </Form>
      </Modal>
    </div>
  );
}
