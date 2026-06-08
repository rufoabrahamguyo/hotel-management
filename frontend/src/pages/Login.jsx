import { useState, useEffect } from 'react';
import { Form, Input, Button, Checkbox, Typography, theme } from 'antd';
import { UserOutlined, LockOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api } from '../services/api';
import { useAuthStore } from '../store/authstore';

const { Title, Text, Link } = Typography;

export default function Login() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const setSession = useAuthStore((s) => s.setSession);
  const token = useAuthStore((s) => s.token);

  const from = location.state?.from?.pathname || '/dashboard';

  useEffect(() => {
    if (token) {
      navigate(from, { replace: true });
    }
  }, [token, from, navigate]);

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', {
        email: values.email.trim(),
        password: values.password,
        remember: values.remember,
      });
      const nextToken = data.token ?? data.accessToken ?? data.access_token;
      const profile = data.user ?? data.profile ?? { email: values.email.trim() };
      const user = { ...profile, role: profile.role ?? data.role };
      if (!nextToken) {
        toast.error('Sign-in did not finish. Try again or contact support.');
        return;
      }
      setSession(nextToken, user);
      toast.success('Welcome back.');
      navigate(from, { replace: true });
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        (err.code === 'ERR_NETWORK'
          ? 'Cannot reach the hotel system. Check your connection and try again.'
          : 'Sign in failed. Check your credentials.');
      toast.error(typeof msg === 'string' ? msg : 'Sign in failed.');
    } finally {
      setLoading(false);
    }
  };

  const { token: t } = theme.useToken();

  return (
    <div
      style={{
        minHeight: '100%',
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) minmax(320px, 440px)',
        background: '#0f1419',
      }}
    >
      <div
        style={{
          display: 'none',
          position: 'relative',
          overflow: 'hidden',
          padding: 'clamp(32px, 6vw, 72px)',
          color: '#f4f6f8',
          background: '#0c1829',
        }}
        className="login-brand-panel"
      >
        <div style={{ maxWidth: 420 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
            <SafetyCertificateOutlined style={{ fontSize: 28, color: '#d4af37' }} />
            <span style={{ fontSize: 13, letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.85 }}>
              Property management
            </span>
          </div>
          <Title level={1} style={{ color: '#fff', marginBottom: 16, fontWeight: 600, fontSize: 'clamp(1.75rem, 3vw, 2.25rem)' }}>
            Hotel operations, unified.
          </Title>
          <Text style={{ color: 'rgba(244,246,248,0.78)', fontSize: 15, lineHeight: 1.7 }}>
            Front desk, housekeeping, and revenue in one secure workspace. Sign in to manage
            reservations, rooms, and guest profiles.
          </Text>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 'clamp(24px, 4vw, 48px)',
          background: '#fafbfc',
        }}
      >
        <div style={{ width: '100%', maxWidth: 400 }}>
          <div style={{ marginBottom: 32 }}>
            <Title level={3} style={{ marginBottom: 8 }}>
              Sign in
            </Title>
            <Text type="secondary">Use your staff email or username and password.</Text>
          </div>

          <Form
            layout="vertical"
            requiredMark={false}
            onFinish={onFinish}
            initialValues={{ remember: true }}
            size="large"
          >
            <Form.Item
              label="Email or username"
              name="email"
              rules={[
                { required: true, message: 'Enter your email or username.' },
                { min: 2, message: 'At least 2 characters.' },
              ]}
            >
              <Input
                prefix={<UserOutlined style={{ color: t.colorTextSecondary }} />}
                placeholder="your email or username"
                autoComplete="username"
              />
            </Form.Item>

            <Form.Item
              label="Password"
              name="password"
              rules={[
                { required: true, message: 'Enter your password.' },
                { min: 6, message: 'At least 6 characters.' },
              ]}
            >
              <Input.Password prefix={<LockOutlined style={{ color: t.colorTextSecondary }} />} placeholder="••••••••" autoComplete="current-password" />
            </Form.Item>

            <Form.Item>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <Form.Item name="remember" valuePropName="checked" noStyle>
                  <Checkbox>Keep me signed in</Checkbox>
                </Form.Item>
                <Link href="#" onClick={(e) => e.preventDefault()} style={{ fontSize: 14 }}>
                  Forgot password?
                </Link>
              </div>
            </Form.Item>

            <Form.Item style={{ marginBottom: 0 }}>
              <Button type="primary" htmlType="submit" block loading={loading}>
                Sign in
              </Button>
            </Form.Item>
          </Form>

          <div style={{ marginTop: 24, textAlign: 'center' }}>
            <Text type="secondary" style={{ fontSize: 13 }}>
              Staff access only.
            </Text>
          </div>
        </div>
      </div>

      <style>{`
        @media (min-width: 900px) {
          .login-brand-panel {
            display: flex !important;
            flex-direction: column;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}
