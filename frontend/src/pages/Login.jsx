import { useState, useEffect } from 'react';
import { Form, Input, Button, Typography } from 'antd';
import { EyeInvisibleOutlined, EyeTwoTone } from '@ant-design/icons';
import { useNavigate, useLocation, Link as RouterLink } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api } from '../services/api';
import { useAuthStore } from '../store/authstore';
import AuthShell, {
  AuthBrandMark,
  authAccent,
  authCta,
  authCtaHover,
  authCtaText,
  authText,
  authMuted,
  authBorder,
} from '../layout/AuthShell';

const { Title, Text } = Typography;

const fieldStyle = {
  borderRadius: 8,
  borderColor: authBorder,
  height: 48,
};

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [registrationAllowed, setRegistrationAllowed] = useState(
    () => import.meta.env.VITE_ALLOW_PUBLIC_REGISTER !== 'false',
  );
  const navigate = useNavigate();
  const location = useLocation();
  const setSession = useAuthStore((s) => s.setSession);
  const token = useAuthStore((s) => s.token);
  const propertyId = useAuthStore((s) => s.propertyId);

  const from = location.state?.from?.pathname || '/dashboard';

  useEffect(() => {
    if (token) {
      navigate(propertyId ? from : '/select-property', { replace: true });
    }
  }, [token, propertyId, from, navigate]);

  useEffect(() => {
    let cancelled = false;
    api
      .get('/auth/registration-status')
      .then(({ data }) => {
        if (!cancelled) setRegistrationAllowed(Boolean(data?.allowed));
      })
      .catch(() => {
        /* keep env/default */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', {
        email: values.email.trim(),
        password: values.password,
        remember: true,
      });
      const nextToken = data.token ?? data.accessToken ?? data.access_token;
      const profile = data.user ?? data.profile ?? { email: values.email.trim() };
      const user = { ...profile, role: profile.role ?? data.role };
      if (!nextToken) {
        toast.error('Sign-in did not finish. Try again or contact support.');
        return;
      }
      const properties = data.properties ?? [];
      const nextPropertyId = data.propertyId ?? null;
      setSession(nextToken, user, properties, nextPropertyId);
      toast.success('Welcome back.');
      navigate(nextPropertyId ? from : '/select-property', { replace: true });
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

  return (
    <AuthShell
      heroEyebrow="Property operations that feel like"
      heroScript="Clarity"
    >
      <AuthBrandMark />

      <Title
        level={3}
        style={{
          textAlign: 'center',
          marginBottom: 32,
          color: authText,
          fontWeight: 700,
          fontSize: 28,
        }}
      >
        Sign in
      </Title>

      <Form layout="vertical" requiredMark={false} onFinish={onFinish} size="large" style={{ rowGap: 4 }}>
        <Form.Item
          label={<span style={{ color: authMuted, fontWeight: 500 }}>Email</span>}
          name="email"
          rules={[
            { required: true, message: 'Enter your email or username.' },
            { min: 2, message: 'At least 2 characters.' },
          ]}
        >
          <Input placeholder="Email or username" autoComplete="username" style={fieldStyle} />
        </Form.Item>

        <Form.Item
          label={<span style={{ color: authMuted, fontWeight: 500 }}>Password</span>}
          name="password"
          style={{ marginBottom: 8 }}
          rules={[
            { required: true, message: 'Enter your password.' },
            { min: 6, message: 'At least 6 characters.' },
          ]}
        >
          <Input.Password
            placeholder="Password"
            autoComplete="current-password"
            style={fieldStyle}
            iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
          />
        </Form.Item>

        <Form.Item style={{ marginBottom: 0 }}>
          <Button
            type="primary"
            htmlType="submit"
            block
            loading={loading}
            style={{
              height: 50,
              fontWeight: 700,
              fontSize: 15,
              borderRadius: 10,
              background: authCta,
              borderColor: authCta,
              color: authCtaText,
              boxShadow: 'none',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = authCtaHover;
              e.currentTarget.style.borderColor = authCtaHover;
              e.currentTarget.style.color = authCtaText;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = authCta;
              e.currentTarget.style.borderColor = authCta;
              e.currentTarget.style.color = authCtaText;
            }}
          >
            Sign in
          </Button>
        </Form.Item>
      </Form>

      {registrationAllowed ? (
        <div style={{ marginTop: 28, textAlign: 'center' }}>
          <Text style={{ fontSize: 13, color: authMuted }}>
            New hotel?{' '}
            <RouterLink to="/register" style={{ color: authAccent, fontWeight: 600 }}>
              Register your organization
            </RouterLink>
          </Text>
        </div>
      ) : null}
    </AuthShell>
  );
}
