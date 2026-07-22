import { useState, useEffect, useCallback } from 'react';
import { Form, Input, Button, Select, Typography, Card, Alert, Table, Popconfirm, Tag, Space } from 'antd';
import {
  TeamOutlined,
  UserOutlined,
  IdcardOutlined,
  LockOutlined,
  DeleteOutlined,
  StopOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import { api } from '../../services/api';
import { ROLE_DESCRIPTIONS, normalizeRole } from '../../auth/roles';
import { useAuthStore } from '../../store/authstore';
import { pageCardStyle, pageWrapStyle } from '../../layout/pageStyles';

const { Title, Text } = Typography;

export default function ManageStaff() {
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [creatableRoles, setCreatableRoles] = useState([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [staff, setStaff] = useState([]);
  const [assignableProperties, setAssignableProperties] = useState([]);
  const [form] = Form.useForm();
  const currentUserId = useAuthStore((s) => s.user?.id);
  const sessionProperties = useAuthStore((s) => s.properties);
  const propertyNameById = new Map(
    [...sessionProperties, ...assignableProperties].map((p) => [p.id, p.name]),
  );

  const loadCreatableRoles = useCallback(async () => {
    setRolesLoading(true);
    try {
      const { data } = await api.get('/admin/staff/creatable-roles');
      setCreatableRoles(data.roles ?? []);
    } catch {
      toast.error('Could not load roles you may assign.');
      setCreatableRoles([]);
    } finally {
      setRolesLoading(false);
    }
  }, []);

  const loadStaff = useCallback(async () => {
    setListLoading(true);
    try {
      const { data } = await api.get('/admin/staff');
      setStaff(data.staff ?? []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not load staff list.');
    } finally {
      setListLoading(false);
    }
  }, []);

  const loadAssignableProperties = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/properties');
      setAssignableProperties(data.properties ?? []);
    } catch {
      setAssignableProperties(sessionProperties);
    }
  }, [sessionProperties]);

  useEffect(() => {
    loadCreatableRoles();
  }, [loadCreatableRoles]);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  useEffect(() => {
    loadAssignableProperties();
  }, [loadAssignableProperties]);

  const handleFinish = async (values) => {
    setLoading(true);
    try {
      await api.post('/admin/staff', {
        name: values.name.trim(),
        role: values.role,
        username: values.username.trim().toLowerCase(),
        password: values.password,
        property_ids: values.property_ids,
      });
      toast.success('Staff member created.');
      form.resetFields();
      loadStaff();
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        (err.response?.status === 403
          ? 'You are not allowed to create that role.'
          : 'Could not create staff member.');
      toast.error(typeof msg === 'string' ? msg : 'Request failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (record) => {
    try {
      await api.delete(`/admin/staff/${record.id}`);
      toast.success(`${record.name} was removed. They can no longer sign in.`);
      loadStaff();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || 'Could not remove staff.';
      toast.error(typeof msg === 'string' ? msg : 'Request failed.');
    }
  };

  const patchStatus = async (record, status) => {
    try {
      await api.patch(`/admin/staff/${record.id}`, { status });
      toast.success(status === 'suspended' ? 'Account suspended - they cannot sign in.' : 'Account activated.');
      loadStaff();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || 'Could not update status.';
      toast.error(typeof msg === 'string' ? msg : 'Request failed.');
    }
  };

  const canSubmitForm = creatableRoles.length > 0 && !rolesLoading;

  return (
    <div style={{ ...pageWrapStyle, maxWidth: 1000, margin: '0 auto' }}>
      <Card style={{ marginBottom: 24, ...pageCardStyle }} variant="borderless">
        <Title level={3} style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
          <TeamOutlined />
          Staff accounts
        </Title>

        <Table
          style={{ marginTop: 16 }}
          rowKey="id"
          loading={listLoading}
          dataSource={staff}
          pagination={{ pageSize: 8 }}
          columns={[
            { title: 'Name', dataIndex: 'name' },
            {
              title: 'Role',
              dataIndex: 'role',
              render: (r) => {
                const rn = normalizeRole(r) ?? r;
                return (
                  <>
                    <Tag color="blue">{r}</Tag>
                    {ROLE_DESCRIPTIONS[rn] && (
                      <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
                        {ROLE_DESCRIPTIONS[rn]}
                      </Text>
                    )}
                  </>
                );
              },
            },
            {
              title: 'Status',
              dataIndex: 'status',
              width: 110,
              render: (s) =>
                s === 'suspended' ? <Tag color="red">Suspended</Tag> : <Tag color="green">Active</Tag>,
            },
            {
              title: 'Properties',
              dataIndex: 'property_ids',
              render: (ids) =>
                !ids?.length ? (
                  <Text type="secondary">All (org-wide)</Text>
                ) : (
                  ids.map((id) => (
                    <Tag key={id}>{propertyNameById.get(id) ?? `#${id}`}</Tag>
                  ))
                ),
            },
            { title: 'Username', dataIndex: 'username' },
            { title: 'Email', dataIndex: 'email', render: (e) => e || '-' },
            {
              title: 'Added',
              dataIndex: 'created_at',
              render: (d) => (d ? dayjs(d).format('MMM D, YYYY') : '-'),
            },
            {
              title: 'Actions',
              key: 'actions',
              width: 220,
              render: (_, record) => {
                const isSelf = currentUserId != null && Number(record.id) === Number(currentUserId);
                const suspended = record.status === 'suspended';
                return (
                  <Space size={0} wrap>
                    {!isSelf &&
                      (!suspended ? (
                        <Popconfirm
                          title="Suspend this account?"
                          description="They cannot sign in until reactivated."
                          okText="Suspend"
                          cancelText="Cancel"
                          okButtonProps={{ danger: true }}
                          onConfirm={() => patchStatus(record, 'suspended')}
                        >
                          <Button type="text" danger size="small" icon={<StopOutlined />}>
                            Suspend
                          </Button>
                        </Popconfirm>
                      ) : (
                        <Button
                          type="text"
                          size="small"
                          icon={<CheckCircleOutlined />}
                          onClick={() => patchStatus(record, 'active')}
                        >
                          Activate
                        </Button>
                      ))}
                    {!isSelf && (
                      <Popconfirm
                        title="Remove this person?"
                        description="They will no longer be able to sign in."
                        okText="Remove"
                        cancelText="Cancel"
                        okButtonProps={{ danger: true }}
                        onConfirm={() => handleDelete(record)}
                      >
                        <Button type="text" danger size="small" icon={<DeleteOutlined />}>
                          Remove
                        </Button>
                      </Popconfirm>
                    )}
                  </Space>
                );
              },
            },
          ]}
        />
      </Card>

      <Card style={pageCardStyle} variant="borderless">
        <Title level={5}>
          Add staff member
        </Title>
        {!canSubmitForm && !rolesLoading && (
          <Alert
            style={{ marginBottom: 16 }}
            type="warning"
            showIcon
            message="No roles to assign"
            description="Your current role cannot create accounts (e.g. Revenue Manager). Ask your General Manager or System Administrator."
          />
        )}
        <Form form={form} layout="vertical" requiredMark={false} onFinish={handleFinish} size="large">
          <Form.Item
            label="Full name"
            name="name"
            rules={[{ required: true, message: 'Enter the staff member’s name.' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="your name" autoComplete="name" />
          </Form.Item>

          <Form.Item label="Role" name="role" rules={[{ required: true, message: 'Select a role.' }]}>
            <Select
              loading={rolesLoading}
              placeholder="Select role"
              disabled={!canSubmitForm}
              options={creatableRoles.map((r) => ({
                value: r,
                label: ROLE_DESCRIPTIONS[r] ? `${r} - ${ROLE_DESCRIPTIONS[r]}` : r,
              }))}
            />
          </Form.Item>

          <Form.Item
            label="Properties"
            name="property_ids"
            rules={[{ required: true, message: 'Assign at least one property.' }]}
          >
            <Select
              mode="multiple"
              placeholder="Select properties this person can work in"
              disabled={!canSubmitForm}
              options={assignableProperties.map((p) => ({ value: p.id, label: p.name }))}
            />
          </Form.Item>

          <Form.Item
            label="Username"
            name="username"
            rules={[
              { required: true, message: 'Enter a username.' },
              { min: 3, message: 'At least 3 characters.' },
              {
                pattern: /^[a-z0-9._-]+$/i,
                message: 'Letters, numbers, dots, dashes, and underscores only.',
              },
            ]}
          >
            <Input prefix={<IdcardOutlined />} placeholder="your.username" autoComplete="username" />
          </Form.Item>

          <Form.Item
            label="Password"
            name="password"
            rules={[
              { required: true, message: 'Enter a password.' },
              { min: 8, message: 'At least 8 characters.' },
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="••••••••" autoComplete="new-password" />
          </Form.Item>

          <Form.Item
            label="Confirm password"
            name="confirm"
            dependencies={['password']}
            rules={[
              { required: true, message: 'Confirm the password.' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Passwords do not match.'));
                },
              }),
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="••••••••" autoComplete="new-password" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" block loading={loading} disabled={!canSubmitForm}>
              Save staff member
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
