import { useMemo, useState, useCallback } from 'react';
import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import { EditOutlined, PlusOutlined } from '@ant-design/icons';
import toast from 'react-hot-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { pageCardStyle as cardStyle, pageHeaderStyle as headerStyle, pageWrapStyle } from '../layout/pageStyles';

const { Paragraph, Title } = Typography;

const STATUSES = ['vacant', 'occupied', 'dirty', 'cleaning', 'inspecting', 'maintenance'];

function roomStatusColor(s) {
  switch (s) {
    case 'vacant':
      return 'success';
    case 'occupied':
      return 'processing';
    case 'dirty':
      return 'warning';
    case 'cleaning':
    case 'inspecting':
      return 'cyan';
    case 'maintenance':
      return 'red';
    default:
      return 'default';
  }
}

export default function Rooms() {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();

  const roomsQ = useQuery({
    queryKey: ['rooms'],
    queryFn: async () => {
      const { data } = await api.get('/rooms');
      return data.rooms ?? [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async ({ id, payload }) => (id ? api.patch(`/rooms/${id}`, payload) : api.post('/rooms', payload)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rooms'] });
      toast.success(editing ? 'Room updated.' : 'Room added.');
      form.resetFields();
      setEditing(null);
      setModalOpen(false);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || err.response?.data?.error || 'Could not save room.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => api.delete(`/rooms/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rooms'] });
      qc.invalidateQueries({ queryKey: ['reservations'] });
      toast.success('Room removed.');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Could not delete room.');
    },
  });

  const openNew = useCallback(() => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ floor: 1, type: 'Standard', status: 'vacant', base_rate: 129 });
    setModalOpen(true);
  }, [form]);

  const openEdit = useCallback(
    (r) => {
      setEditing(r);
      form.setFieldsValue({
        number: r.number,
        floor: r.floor,
        type: r.type,
        status: r.status,
        housekeeping_note: r.housekeeping_note ?? '',
        base_rate: r.base_rate != null ? Number(r.base_rate) : 129,
      });
      setModalOpen(true);
    },
    [form],
  );

  const onFinish = (v) => {
    const payload = {
      floor: Number(v.floor) || 1,
      type: String(v.type ?? 'Standard'),
      status: v.status ?? 'vacant',
      housekeeping_note: v.housekeeping_note?.trim() || '',
      base_rate: v.base_rate != null ? Number(v.base_rate) : 129,
    };
    if (!editing) {
      payload.number = String(v.number ?? '').trim();
    } else if (v.number !== undefined) {
      payload.number = String(v.number ?? '').trim();
    }
    saveMutation.mutate({ id: editing?.id, payload });
  };

  const columns = useMemo(
    () => [
      { title: 'Room', dataIndex: 'number', key: 'number', width: 90 },
      { title: 'Fl', dataIndex: 'floor', key: 'floor', width: 58 },
      { title: 'Type', dataIndex: 'type', key: 'type', width: 120 },
      {
        title: 'Status',
        dataIndex: 'status',
        key: 'status',
        width: 120,
        render: (s) => <Tag color={roomStatusColor(s)}>{s}</Tag>,
      },
      {
        title: 'Nightly rate',
        dataIndex: 'base_rate',
        key: 'base_rate',
        width: 120,
        render: (n) =>
          Number(n || 0).toLocaleString(undefined, { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }),
      },
      {
        title: 'Housekeeping',
        dataIndex: 'housekeeping_note',
        key: 'hk',
        ellipsis: true,
        render: (t) => <span title={t || ''}>{t || '-'}</span>,
      },
      {
        title: '',
        key: 'a',
        width: 240,
        render: (_, r) => (
          <Space>
            <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(r)}>
              Edit
            </Button>
            <Popconfirm
              okText="Delete"
              okButtonProps={{ danger: true }}
              title="Delete room? Must have no reservations."
              onConfirm={() => deleteMutation.mutateAsync(r.id)}
            >
              <Button danger type="link" size="small" loading={deleteMutation.isPending}>
                Delete
              </Button>
            </Popconfirm>
          </Space>
        ),
      },
    ],
    [openEdit, deleteMutation],
  );

  return (
    <div style={pageWrapStyle}>
      <Card
        bordered={false}
        style={cardStyle}
        styles={{ header: headerStyle }}
        title="Rooms & housekeeping"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={openNew}>
            Add room
          </Button>
        }
      >
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Title level={5} style={{ margin: 0 }}>
            Room grid
          </Title>
          <Paragraph type="secondary" style={{ marginBottom: 0 }}>
            Status feeds the front desk and housekeeping. Updating the nightly rate fills in totals on new bookings when you
            leave total blank.
          </Paragraph>
          <Table
            rowKey="id"
            loading={roomsQ.isLoading}
            size="middle"
            pagination={{ pageSize: 12 }}
            scroll={{ x: true }}
            dataSource={roomsQ.data}
            columns={columns}
          />
        </Space>
      </Card>

      <Modal
        centered
        destroyOnClose
        open={modalOpen}
        title={editing ? `Room ${editing.number}` : 'New room'}
        footer={null}
        onCancel={() => {
          setModalOpen(false);
          setEditing(null);
          form.resetFields();
        }}
      >
        <Form layout="vertical" form={form} onFinish={onFinish}>
          <Form.Item
            name="number"
            label="Room number"
            rules={[{ required: true, message: 'Number required.' }]}
          >
            <Input placeholder="e.g. 204" />
          </Form.Item>
          <Form.Item name="floor" label="Floor">
            <InputNumber min={1} max={99} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="type" label="Type">
            <Input placeholder="Standard, Deluxe …" />
          </Form.Item>
          <Form.Item name="status" label="Housekeeping status" rules={[{ required: true }]}>
            <Select options={STATUSES.map((v) => ({ label: v, value: v }))} />
          </Form.Item>
          <Form.Item name="base_rate" label="Nightly base rate">
            <InputNumber prefix="$" min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="housekeeping_note" label="Notes">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={saveMutation.isPending}>
            Save
          </Button>
        </Form>
      </Modal>
    </div>
  );
}
