import { useState, useEffect, useCallback } from 'react';
import { Form, Input, Button, Typography, Card, Table, Popconfirm, Tag, Space } from 'antd';
import { BankOutlined, StopOutlined, CheckCircleOutlined } from '@ant-design/icons';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authstore';
import { pageCardStyle, pageWrapStyle } from '../../layout/pageStyles';

const { Title } = Typography;

export default function Properties() {
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [properties, setProperties] = useState([]);
  const [form] = Form.useForm();
  const setSession = useAuthStore((s) => s.setSession);
  const currentPropertyId = useAuthStore((s) => s.propertyId);

  const loadProperties = useCallback(async () => {
    setListLoading(true);
    try {
      const { data } = await api.get('/properties');
      setProperties(data.properties ?? []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not load properties.');
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProperties();
  }, [loadProperties]);

  /** Refresh the session's own property list so a newly created property shows up in the switcher immediately. */
  const refreshSession = useCallback(async () => {
    if (!currentPropertyId) return;
    try {
      const { data } = await api.post('/auth/select-property', { propertyId: currentPropertyId });
      setSession(data.token, data.user, data.properties ?? [], data.propertyId ?? null);
    } catch {
      // Non-fatal — the switcher will pick up the change next time it refreshes.
    }
  }, [currentPropertyId, setSession]);

  const handleFinish = async (values) => {
    setLoading(true);
    try {
      await api.post('/properties', { name: values.name.trim() });
      toast.success('Property created.');
      form.resetFields();
      loadProperties();
      refreshSession();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not create property.');
    } finally {
      setLoading(false);
    }
  };

  const patchStatus = async (record, status) => {
    try {
      await api.patch(`/properties/${record.id}`, { status });
      toast.success(status === 'archived' ? 'Property archived.' : 'Property reactivated.');
      loadProperties();
      refreshSession();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update property.');
    }
  };

  return (
    <div style={{ ...pageWrapStyle, maxWidth: 1000, margin: '0 auto' }}>
      <Card style={{ marginBottom: 24, ...pageCardStyle }} variant="borderless">
        <Title level={3} style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
          <BankOutlined />
          Properties
        </Title>

        <Table
          style={{ marginTop: 16 }}
          rowKey="id"
          loading={listLoading}
          dataSource={properties}
          pagination={{ pageSize: 8 }}
          columns={[
            {
              title: 'Name',
              dataIndex: 'name',
              render: (name, record) => (
                <>
                  {name}
                  {record.id === currentPropertyId && (
                    <Tag color="blue" style={{ marginLeft: 8 }}>
                      Current
                    </Tag>
                  )}
                </>
              ),
            },
            { title: 'Timezone', dataIndex: 'timezone' },
            {
              title: 'Status',
              dataIndex: 'status',
              width: 110,
              render: (s) => (s === 'archived' ? <Tag color="red">Archived</Tag> : <Tag color="green">Active</Tag>),
            },
            {
              title: 'Created',
              dataIndex: 'created_at',
              render: (d) => (d ? dayjs(d).format('MMM D, YYYY') : '-'),
            },
            {
              title: 'Actions',
              key: 'actions',
              width: 160,
              render: (_, record) => (
                <Space size={0} wrap>
                  {record.status === 'active' ? (
                    <Popconfirm
                      title="Archive this property?"
                      description="Staff assigned here will lose access until it's reactivated."
                      okText="Archive"
                      cancelText="Cancel"
                      okButtonProps={{ danger: true }}
                      onConfirm={() => patchStatus(record, 'archived')}
                    >
                      <Button type="text" danger size="small" icon={<StopOutlined />}>
                        Archive
                      </Button>
                    </Popconfirm>
                  ) : (
                    <Button
                      type="text"
                      size="small"
                      icon={<CheckCircleOutlined />}
                      onClick={() => patchStatus(record, 'active')}
                    >
                      Reactivate
                    </Button>
                  )}
                </Space>
              ),
            },
          ]}
        />
      </Card>

      <Card style={pageCardStyle} variant="borderless">
        <Title level={5}>
          Add property
        </Title>
        <Form form={form} layout="vertical" requiredMark={false} onFinish={handleFinish} size="large">
          <Form.Item
            label="Property name"
            name="name"
            rules={[{ required: true, message: 'Enter a property name.' }]}
          >
            <Input prefix={<BankOutlined />} placeholder="e.g. Lakeside Hotel" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" block loading={loading}>
              Create property
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
