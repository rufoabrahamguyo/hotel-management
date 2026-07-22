import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu, Button, Avatar, Typography, Dropdown } from 'antd';
import {
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  AppstoreOutlined,
  UserOutlined,
  HomeOutlined,
  BarChartOutlined,
  TeamOutlined,
  SettingOutlined,
  DashboardOutlined,
  CheckOutlined,
  BankOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import toast from 'react-hot-toast';
import { api } from '../services/api';
import { useAuthStore } from '../store/authstore';
import { propizy } from './propizyTokens';

const { Text } = Typography;

const ICONS = {
  dashboard: <DashboardOutlined />,
  guests: <UserOutlined />,
  rooms: <HomeOutlined />,
  reports: <BarChartOutlined />,
  staff: <TeamOutlined />,
  properties: <BankOutlined />,
  settings: <SettingOutlined />,
};

/** Left rail content (desktop + drawer). */
export default function SidebarChrome({
  defs,
  path,
  user,
  initials,
  inlineCollapsed,
  showCollapseToggle,
  onNavigate,
  onToggleCollapse,
  onLogout,
  minFullHeight,
}) {
  const properties = useAuthStore((s) => s.properties);
  const propertyId = useAuthStore((s) => s.propertyId);
  const setSession = useAuthStore((s) => s.setSession);
  const [switching, setSwitching] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const currentProperty = properties.find((p) => p.id === propertyId);
  const collapsed = Boolean(inlineCollapsed && showCollapseToggle);

  const menuItems = defs.map((d) => ({
    key: d.path,
    icon: ICONS[d.icon] ?? <AppstoreOutlined />,
    label: d.label,
    onClick: () => onNavigate(d.path),
  }));

  const openPropertyPicker = () => {
    navigate('/select-property', { state: { switch: true, from: { pathname: location.pathname } } });
  };

  const switchProperty = async (nextId) => {
    if (nextId === propertyId || switching) return;
    setSwitching(true);
    try {
      const { data } = await api.post('/auth/select-property', { propertyId: nextId });
      setSession(data.token, data.user, data.properties ?? [], data.propertyId ?? null);
      const nextName = (data.properties ?? []).find((p) => p.id === data.propertyId)?.name;
      toast.success(nextName ? `Switched to ${nextName}.` : 'Property switched.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not switch property.');
    } finally {
      setSwitching(false);
    }
  };

  const propertyMenuItems = properties.map((p) => ({
    key: String(p.id),
    label: p.name,
    icon: p.id === propertyId ? <CheckOutlined /> : <span style={{ width: 14, display: 'inline-block' }} />,
    onClick: () => switchProperty(p.id),
  }));

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: minFullHeight,
        height: '100%',
        color: '#f4f6f8',
      }}
    >
      <div style={{ flex: '1 1 auto', overflowY: 'auto' }}>
        <div
          style={{
            padding: collapsed ? 14 : '22px 18px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            borderBottom: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: propizy.goldSoft,
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0,
            }}
          >
            <SafetyCertificateOutlined style={{ color: propizy.gold, fontSize: 18 }} />
          </div>
          {!collapsed && (
            <div>
              <div style={{ fontWeight: 700, color: '#fff', fontSize: 16, letterSpacing: '-0.03em' }}>Hotely</div>
              <Text style={{ fontSize: 11, color: 'rgba(244,246,248,0.55)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Property ops
              </Text>
            </div>
          )}
        </div>

        <Menu
          theme="dark"
          mode="inline"
          inlineCollapsed={collapsed}
          selectedKeys={[path]}
          style={{ background: 'transparent', border: 'none', marginTop: 10, padding: '0 8px' }}
          items={menuItems}
        />
      </div>

      <div
        style={{
          flexShrink: 0,
          padding: 12,
          borderTop: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(0,0,0,0.18)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '8px 10px',
            marginBottom: 10,
            borderRadius: 10,
            background: 'rgba(255,255,255,0.06)',
          }}
        >
          <Avatar style={{ background: propizy.gold, color: propizy.navy, fontWeight: 700, flexShrink: 0 }}>
            {initials}
          </Avatar>
          {!collapsed && (
            <div style={{ overflow: 'hidden', minWidth: 0 }}>
              <div style={{ color: '#fff', fontWeight: 600, fontSize: 13 }}>{user?.name || user?.username || 'Staff'}</div>
              <Text style={{ fontSize: 11, color: 'rgba(244,246,248,0.55)' }} ellipsis>
                {user?.role || user?.email}
              </Text>
            </div>
          )}
        </div>

        {properties.length > 1 ? (
          <>
            <Dropdown menu={{ items: propertyMenuItems }} trigger={['click']} disabled={switching}>
              <Button
                block
                loading={switching}
                icon={collapsed ? <BankOutlined /> : undefined}
                style={{
                  marginBottom: 4,
                  textAlign: 'left',
                  background: 'rgba(255,255,255,0.06)',
                  color: '#f4f6f8',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                {!collapsed ? currentProperty?.name ?? 'Select property' : null}
              </Button>
            </Dropdown>
            {!collapsed ? (
              <Button type="link" size="small" block onClick={openPropertyPicker} style={{ marginBottom: 8, color: 'rgba(244,246,248,0.55)', fontSize: 12 }}>
                All properties…
              </Button>
            ) : null}
          </>
        ) : !collapsed && currentProperty ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 8,
              padding: '8px 10px',
              borderRadius: 10,
              background: 'rgba(255,255,255,0.06)',
              color: 'rgba(244,246,248,0.65)',
              fontSize: 12,
            }}
          >
            <BankOutlined style={{ color: propizy.gold }} /> {currentProperty.name}
          </div>
        ) : null}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          {showCollapseToggle ? (
            <Button
              type="text"
              size="small"
              icon={inlineCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={onToggleCollapse}
              aria-label={inlineCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              style={{ color: 'rgba(244,246,248,0.55)' }}
            />
          ) : (
            <span />
          )}
          <Button
            type="text"
            size="small"
            icon={<LogoutOutlined />}
            onClick={onLogout}
            aria-label="Sign out"
            style={{ color: '#f0a8ab' }}
          />
        </div>
      </div>
    </div>
  );
}
