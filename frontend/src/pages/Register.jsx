import { useState, useEffect } from 'react';
import { Form, Input, Button, Typography, Spin } from 'antd';
import { EyeInvisibleOutlined, EyeTwoTone } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
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
import { propizy } from '../layout/propizyTokens';

const { Title, Text } = Typography;

const fieldStyle = {
  borderRadius: 8,
  borderColor: authBorder,
  height: 48,
};

export default function Register() {
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);

  useEffect(() => {
    let cancelled = false;
    api
      .get('/auth/registration-status')
      .then(({ data }) => {
        if (cancelled) return;
        const ok = Boolean(data?.allowed);
        setAllowed(ok);
        if (!ok) {
          toast.error('Public registration is disabled.');
          navigate('/login', { replace: true });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAllowed(import.meta.env.VITE_ALLOW_PUBLIC_REGISTER !== 'false');
        }
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', {
        organizationName: values.organizationName.trim(),
        propertyName: values.propertyName.trim(),
        name: values.name.trim(),
        username: values.username.trim().toLowerCase(),
        email: values.email?.trim() || undefined,
        password: values.password,
      });
      setSession(data.token, data.user, data.properties ?? [], data.propertyId ?? null);
      toast.success('Your hotel is set up.');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        (err.code === 'ERR_NETWORK'
          ? 'Cannot reach the hotel system. Check your connection and try again.'
          : 'Registration failed. Check the form and try again.');
      toast.error(typeof msg === 'string' ? msg : 'Registration failed.');
      if (err.response?.status === 403) {
        navigate('/login', { replace: true });
      }
    } finally {
      setLoading(false);
    }
  };

  if (checking || !allowed) {
    return (
      <div style={{ minHeight: '100%', display: 'grid', placeItems: 'center', background: propizy.bg }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <AuthShell
      heroEyebrow="One account to run every"
      heroScript="Property"
    >
      <AuthBrandMark />

      <Title
        level={3}
        style={{
          textAlign: 'center',
          marginBottom: 28,
          color: authText,
          fontWeight: 700,
          fontSize: 28,
        }}
      >
        Register
      </Title>

      <Form layout="vertical" requiredMark={false} onFinish={onFinish} size="large">
        <Form.Item
          label={<span style={{ color: authMuted, fontWeight: 500 }}>Organization</span>}
          name="organizationName"
          rules={[{ required: true, message: 'Enter your organization or company name.' }]}
        >
          <Input placeholder="e.g. Sunset Hospitality Group" style={fieldStyle} />
        </Form.Item>

        <Form.Item
          label={<span style={{ color: authMuted, fontWeight: 500 }}>First property</span>}
          name="propertyName"
          rules={[{ required: true, message: 'Enter your first hotel’s name.' }]}
        >
          <Input placeholder="e.g. Sunset Beach Resort" style={fieldStyle} />
        </Form.Item>

        <Form.Item
          label={<span style={{ color: authMuted, fontWeight: 500 }}>Your name</span>}
          name="name"
          rules={[{ required: true, message: 'Enter your name.' }]}
        >
          <Input placeholder="Full name" autoComplete="name" style={fieldStyle} />
        </Form.Item>

        <Form.Item
          label={<span style={{ color: authMuted, fontWeight: 500 }}>Username</span>}
          name="username"
          rules={[
            { required: true, message: 'Choose a username.' },
            { min: 3, message: 'At least 3 characters.' },
            { pattern: /^[a-z0-9._-]+$/i, message: 'Letters, numbers, dots, dashes, and underscores only.' },
          ]}
        >
          <Input placeholder="your.username" autoComplete="username" style={fieldStyle} />
        </Form.Item>

        <Form.Item
          label={<span style={{ color: authMuted, fontWeight: 500 }}>Email (optional)</span>}
          name="email"
          rules={[{ type: 'email', message: 'Enter a valid email.' }]}
        >
          <Input placeholder="you@example.com" autoComplete="email" style={fieldStyle} />
        </Form.Item>

        <Form.Item
          label={<span style={{ color: authMuted, fontWeight: 500 }}>Password</span>}
          name="password"
          rules={[
            { required: true, message: 'Enter a password.' },
            { min: 8, message: 'At least 8 characters.' },
          ]}
        >
          <Input.Password
            placeholder="Password"
            autoComplete="new-password"
            style={fieldStyle}
            iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
          />
        </Form.Item>

        <Form.Item
          label={<span style={{ color: authMuted, fontWeight: 500 }}>Confirm password</span>}
          name="confirm"
          dependencies={['password']}
          rules={[
            { required: true, message: 'Confirm the password.' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('password') === value) return Promise.resolve();
                return Promise.reject(new Error('Passwords do not match.'));
              },
            }),
          ]}
        >
          <Input.Password
            placeholder="Confirm password"
            autoComplete="new-password"
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
            Create my organization
          </Button>
        </Form.Item>
      </Form>

      <div style={{ marginTop: 22, textAlign: 'center' }}>
        <Text style={{ fontSize: 13, color: authMuted }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: authAccent, fontWeight: 600 }}>
            Sign in
          </Link>
        </Text>
      </div>
    </AuthShell>
  );
}
