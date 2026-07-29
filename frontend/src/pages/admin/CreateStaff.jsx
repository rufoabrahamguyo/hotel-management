import { useState, useEffect, useCallback } from 'react';
import { Form, Input, Button, Select, Typography, Card, Alert, Table, Popconfirm, Tag, Space, Modal } from 'antd';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { ROLE_DESCRIPTIONS, ROLE_LABELS, roleLabel } from '../../auth/roles';
import { useAuthStore } from '../../store/authstore';
import { pageCardStyle, pageWrapStyle } from '../../layout/pageStyles';
import { AccountStatusPill } from '../../components/StatusPill';

const { Title, Text } = Typography;

export default function ManageStaff() {
  const [loading, setLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [creatableRoles, setCreatableRoles] = useState([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [staff, setStaff] = useState([]);
  const [assignableProperties, setAssignableProperties] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const currentUserId = useAuthStore((s) => s.user?.id);
  const sessionProperties = useAuthStore((s) => s.properties);
  const propertyNameById = new Map(
    [...(sessionProperties ?? []), ...(assignableProperties ?? [])].map((p) => [p.id, p.name]),
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

  const openEdit = (record) => {
    setEditing(record);
    editForm.setFieldsValue({
      name: record.name,
      role: record.role,
      property_ids: record.property_ids?.length ? record.property_ids : undefined,
      password: '',
      confirm: '',
    });
  };

  const handleEditFinish = async (values) => {
    if (!editing) return;
    setEditLoading(true);
    try {
      const body = {
        name: values.name.trim(),
        role: values.role,
        property_ids: values.property_ids ?? [],
      };
      if (values.password) body.password = values.password;
      await api.patch(`/admin/staff/${editing.id}`, body);
      toast.success('Staff member updated.');
      setEditing(null);
      editForm.resetFields();
      loadStaff();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || 'Could not update staff.';
      toast.error(typeof msg === 'string' ? msg : 'Request failed.');
    } finally {
      setEditLoading(false);
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

  const editRoleOptions = (() => {
    const set = new Set(creatableRoles);
    if (editing?.role) set.add(editing.role);
    return [...set];
  })();

  return (
    <div style={pageWrapStyle}>
      <Card style={{ marginBottom: 16, ...pageCardStyle }} variant="borderless">
        <Title level={4} style={{ marginTop: 0, marginBottom: 4, fontWeight: 600 }}>
          Staff accounts
        </Title>
        <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
          People who can sign in to this organization.
        </Text>

        <Table
          size="middle"
          scroll={{ x: 800 }}
          rowKey="id"
          loading={listLoading}
          dataSource={staff}
          pagination={{ pageSize: 8, hideOnSinglePage: true }}
          columns={[
            {
              title: 'Name',
              dataIndex: 'name',
              ellipsis: true,
              render: (name, record) => (
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 500 }}>{name}</div>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    @{record.username}
                  </Text>
                </div>
              ),
            },
            {
              title: 'Role',
              dataIndex: 'role',
              width: 170,
              render: (r) => <Tag>{roleLabel(r)}</Tag>,
            },
            {
              title: 'Status',
              dataIndex: 'status',
              width: 100,
              render: (s) => <AccountStatusPill status={s} />,
            },
            {
              title: 'Properties',
              dataIndex: 'property_ids',
              ellipsis: true,
              render: (ids) =>
                !ids?.length ? (
                  <Text type="secondary">All</Text>
                ) : (
                  <span>
                    {ids.map((id) => (
                      <Tag key={id}>{propertyNameById.get(id) ?? `#${id}`}</Tag>
                    ))}
                  </span>
                ),
            },
            {
              title: '',
              key: 'actions',
              width: 220,
              fixed: 'right',
              render: (_, record) => {
                const isSelf = currentUserId != null && Number(record.id) === Number(currentUserId);
                const suspended = record.status === 'suspended';
                return (
                  <Space size={4} wrap={false}>
                    {!isSelf && (
                      <Button type="link" size="small" onClick={() => openEdit(record)}>
                        Edit
                      </Button>
                    )}
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
                          <Button type="link" danger size="small">
                            Suspend
                          </Button>
                        </Popconfirm>
                      ) : (
                        <Button type="link" size="small" onClick={() => patchStatus(record, 'active')}>
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
                        <Button type="link" danger size="small">
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
        <Title level={5} style={{ marginTop: 0 }}>
          Add staff member
        </Title>
        {!canSubmitForm && !rolesLoading && (
          <Alert
            style={{ marginBottom: 16 }}
            type="warning"
            showIcon
            message="No roles to assign"
            description="Your current role cannot create accounts. Ask a general manager or system admin."
          />
        )}
        <Form form={form} layout="vertical" requiredMark={false} onFinish={handleFinish} size="large">
          <Form.Item
            label="Full name"
            name="name"
            rules={[{ required: true, message: 'Enter the staff member’s name.' }]}
          >
            <Input placeholder="Full name" autoComplete="name" />
          </Form.Item>

          <Form.Item label="Role" name="role" rules={[{ required: true, message: 'Select a role.' }]}>
            <Select
              loading={rolesLoading}
              placeholder="Select role"
              disabled={!canSubmitForm}
              optionLabelProp="label"
              options={creatableRoles.map((r) => ({
                value: r,
                label: ROLE_LABELS[r] || roleLabel(r),
                description: ROLE_DESCRIPTIONS[r],
              }))}
              optionRender={(option) => (
                <div>
                  <div>{option.data.label}</div>
                  {option.data.description ? (
                    <div style={{ fontSize: 12, color: '#8c8c8c' }}>{option.data.description}</div>
                  ) : null}
                </div>
              )}
            />
          </Form.Item>

          <Form.Item
            label="Properties"
            name="property_ids"
            rules={[{ required: true, message: 'Assign at least one property.' }]}
          >
            <Select
              mode="multiple"
              placeholder="Select properties"
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
            <Input placeholder="username" autoComplete="username" />
          </Form.Item>

          <Form.Item
            label="Password"
            name="password"
            rules={[
              { required: true, message: 'Enter a password.' },
              { min: 8, message: 'At least 8 characters.' },
            ]}
          >
            <Input.Password placeholder="Password" autoComplete="new-password" />
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
            <Input.Password placeholder="Confirm password" autoComplete="new-password" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" loading={loading} disabled={!canSubmitForm}>
              Save staff member
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Modal
        centered
        destroyOnClose
        open={Boolean(editing)}
        title={editing ? `Edit ${editing.name}` : 'Edit staff'}
        onCancel={() => {
          setEditing(null);
          editForm.resetFields();
        }}
        footer={null}
      >
        <Form form={editForm} layout="vertical" requiredMark={false} onFinish={handleEditFinish} size="large">
          <Form.Item
            label="Full name"
            name="name"
            rules={[{ required: true, message: 'Enter the staff member’s name.' }]}
          >
            <Input placeholder="Full name" />
          </Form.Item>
          <Form.Item label="Role" name="role" rules={[{ required: true, message: 'Select a role.' }]}>
            <Select
              loading={rolesLoading}
              placeholder="Select role"
              optionLabelProp="label"
              options={editRoleOptions.map((r) => ({
                value: r,
                label: ROLE_LABELS[r] || roleLabel(r),
                description: ROLE_DESCRIPTIONS[r],
              }))}
              optionRender={(option) => (
                <div>
                  <div>{option.data.label}</div>
                  {option.data.description ? (
                    <div style={{ fontSize: 12, color: '#8c8c8c' }}>{option.data.description}</div>
                  ) : null}
                </div>
              )}
            />
          </Form.Item>
          <Form.Item
            label="Properties"
            name="property_ids"
            rules={[{ required: true, message: 'Assign at least one property.' }]}
          >
            <Select
              mode="multiple"
              placeholder="Select properties"
              options={assignableProperties.map((p) => ({ value: p.id, label: p.name }))}
            />
          </Form.Item>
          <Form.Item label="New password (optional)" name="password" rules={[{ min: 8, message: 'At least 8 characters.' }]}>
            <Input.Password placeholder="Leave blank to keep current" autoComplete="new-password" />
          </Form.Item>
          <Form.Item
            label="Confirm new password"
            name="confirm"
            dependencies={['password']}
            rules={[
              ({ getFieldValue }) => ({
                validator(_, value) {
                  const pwd = getFieldValue('password');
                  if (!pwd) return Promise.resolve();
                  if (value === pwd) return Promise.resolve();
                  return Promise.reject(new Error('Passwords do not match.'));
                },
              }),
            ]}
          >
            <Input.Password placeholder="Confirm password" autoComplete="new-password" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={editLoading} block>
            Save changes
          </Button>
        </Form>
      </Modal>
    </div>
  );
}
