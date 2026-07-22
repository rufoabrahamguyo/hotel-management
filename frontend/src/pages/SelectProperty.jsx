import { useState } from 'react';
import { Card, Button, Form, Input, Typography, Empty } from 'antd';
import { BankOutlined, LogoutOutlined, HomeOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api } from '../services/api';
import { useAuthStore } from '../store/authstore';
import { normalizeRole, ROLE } from '../auth/roles';
import { propizy } from '../layout/propizyTokens';

const { Title, Text } = Typography;

export default function SelectProperty() {
  const [loadingId, setLoadingId] = useState(null);
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const properties = useAuthStore((s) => s.properties);
  const setSession = useAuthStore((s) => s.setSession);
  const clearSession = useAuthStore((s) => s.clearSession);

  const from = location.state?.from?.pathname || '/dashboard';
  const switching = location.state?.switch === true;
  const isSystemAdmin = normalizeRole(user?.role) === ROLE.SYSTEM_ADMIN;

  const selectProperty = async (propertyId) => {
    setLoadingId(propertyId);
    try {
      const { data } = await api.post('/auth/select-property', { propertyId });
      setSession(data.token, data.user, data.properties ?? [], data.propertyId ?? null);
      navigate(from, { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not open that property.');
    } finally {
      setLoadingId(null);
    }
  };

  const createFirstProperty = async (values) => {
    setCreating(true);
    try {
      const { data } = await api.post('/properties', { name: values.name.trim() });
      await selectProperty(data.property.id);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not create property.');
    } finally {
      setCreating(false);
    }
  };

  const logout = () => {
    clearSession();
    navigate('/login', { replace: true });
  };

  return (
    <div
      style={{
        minHeight: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: propizy.bg,
      }}
    >
      <div style={{ width: '100%', maxWidth: 480 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <HomeOutlined style={{ color: propizy.gold, fontSize: 36, marginBottom: 16, display: 'block' }} />
          <Title level={3} style={{ color: propizy.text, marginBottom: 6, fontWeight: 700 }}>
            {switching
              ? 'Switch property'
              : properties.length > 0
                ? 'Choose a property'
                : 'No properties yet'}
          </Title>
          <Text type="secondary">
            {switching
              ? 'Pick a different property to work in.'
              : properties.length > 0
                ? 'Pick which property you want to work in.'
                : isSystemAdmin
                  ? 'Create your first property to get started.'
                  : 'Contact your system administrator to get access to a property.'}
          </Text>
        </div>

        {switching ? (
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <Button type="link" onClick={() => navigate(from)} style={{ color: propizy.muted, padding: 0 }}>
              ← Back to workspace
            </Button>
          </div>
        ) : null}

        {properties.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {properties.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => selectProperty(p.id)}
                disabled={loadingId === p.id}
                aria-label={`Open property ${p.name}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  width: '100%',
                  padding: 16,
                  background: propizy.surface,
                  border: `1px solid ${propizy.border}`,
                  borderRadius: 14,
                  boxShadow: '0 2px 8px rgba(12, 24, 41, 0.04)',
                  cursor: loadingId === p.id ? 'wait' : 'pointer',
                  font: 'inherit',
                  color: 'inherit',
                  textAlign: 'left',
                }}
              >
                <BankOutlined style={{ fontSize: 20, color: propizy.gold }} aria-hidden />
                <span style={{ flex: 1, color: propizy.text, fontWeight: 600 }}>{p.name}</span>
                <Button type="primary" size="small" loading={loadingId === p.id} tabIndex={-1}>
                  Open
                </Button>
              </button>
            ))}
          </div>
        ) : isSystemAdmin ? (
          <Card
            style={{
              background: propizy.surface,
              border: `1px solid ${propizy.border}`,
              borderRadius: 14,
            }}
          >
            <Form layout="vertical" onFinish={createFirstProperty}>
              <Form.Item
                label="Property name"
                name="name"
                rules={[{ required: true, message: 'Enter a property name.' }]}
              >
                <Input placeholder="e.g. Lakeside Hotel" autoFocus size="large" />
              </Form.Item>
              <Button type="primary" htmlType="submit" block loading={creating} size="large">
                Create property
              </Button>
            </Form>
          </Card>
        ) : (
          <Card
            style={{
              background: propizy.surface,
              border: `1px solid ${propizy.border}`,
              borderRadius: 14,
            }}
          >
            <Empty description="No properties assigned" />
          </Card>
        )}

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <Button type="text" icon={<LogoutOutlined />} onClick={logout} style={{ color: propizy.muted }}>
            Sign out
          </Button>
        </div>
      </div>
    </div>
  );
}
