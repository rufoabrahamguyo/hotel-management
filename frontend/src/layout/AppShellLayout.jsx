import { useMemo, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { ConfigProvider, Layout, Grid, Drawer, Button, Typography } from 'antd';
import { MenuOutlined, BankOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { useAuthStore } from '../store/authstore';
import { getSidebarDefsForUser } from './sidebarNav';
import { appShellTheme } from './appShellTheme';
import { propizy } from './propizyTokens';
import SummaryRail from './SummaryRail';
import SidebarChrome from './SidebarChrome';

const { Sider, Content, Header } = Layout;
const { Text } = Typography;

export default function AppShellLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const showRightRail = !!screens.xl;

  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const properties = useAuthStore((s) => s.properties);
  const propertyId = useAuthStore((s) => s.propertyId);
  const clearSession = useAuthStore((s) => s.clearSession);

  const currentProperty = properties.find((p) => p.id === propertyId);

  const defs = useMemo(() => getSidebarDefsForUser(user), [user]);

  const initials = useMemo(() => {
    const n = (user?.name || user?.email || user?.username || '?').trim();
    const parts = n.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return n.slice(0, 2).toUpperCase();
  }, [user]);

  const path = location.pathname;

  const go = (next) => {
    navigate(next);
    setMobileOpen(false);
  };

  const logout = () => {
    clearSession();
    navigate('/login', { replace: true });
  };

  const desktopSider = (
    <Sider
      trigger={null}
      width={collapsed ? 80 : 248}
      style={{
        background: propizy.navy,
        borderRight: 'none',
        overflow: 'hidden',
        boxShadow: '4px 0 24px rgba(12, 24, 41, 0.08)',
      }}
    >
      <SidebarChrome
        defs={defs}
        path={path}
        user={user}
        initials={initials}
        inlineCollapsed={collapsed}
        showCollapseToggle={!isMobile}
        minFullHeight={isMobile ? undefined : '100vh'}
        onNavigate={go}
        onToggleCollapse={() => setCollapsed((c) => !c)}
        onLogout={logout}
      />
    </Sider>
  );

  return (
    <ConfigProvider theme={appShellTheme}>
      <Layout style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: propizy.bg }}>
        {isMobile ? (
          <Header
            style={{
              padding: '0 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              background: propizy.surface,
              borderBottom: `1px solid ${propizy.border}`,
              height: 56,
              lineHeight: '56px',
              boxShadow: '0 1px 0 rgba(12, 24, 41, 0.04)',
            }}
          >
            <Button
              type="text"
              icon={<MenuOutlined />}
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation menu"
              style={{ color: propizy.text }}
            />
            <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <SafetyCertificateOutlined style={{ color: propizy.gold, fontSize: 18 }} />
              <div>
                <div style={{ fontWeight: 700, color: propizy.text, lineHeight: 1.2, letterSpacing: '-0.02em' }}>Hotely</div>
                {currentProperty ? (
                  <Text type="secondary" style={{ fontSize: 11, lineHeight: 1.2 }} ellipsis>
                    <BankOutlined style={{ marginRight: 4 }} />
                    {currentProperty.name}
                  </Text>
                ) : null}
              </div>
            </div>
          </Header>
        ) : null}

        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            flex: 1,
            minHeight: isMobile ? 'calc(100vh - 56px)' : 0,
            background: propizy.bg,
          }}
        >
          {!isMobile ? desktopSider : null}

          <Drawer
            placement="left"
            open={isMobile && mobileOpen}
            onClose={() => setMobileOpen(false)}
            styles={{
              body: {
                padding: 0,
                background: propizy.navy,
              },
            }}
            width={280}
          >
            <SidebarChrome
              defs={defs}
              path={path}
              user={user}
              initials={initials}
              inlineCollapsed={false}
              showCollapseToggle={false}
              minFullHeight="100vh"
              onNavigate={go}
              onToggleCollapse={() => {}}
              onLogout={logout}
            />
          </Drawer>

          <Layout
            style={{
              flex: 1,
              background: propizy.bg,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'row',
              minHeight: 0,
              minWidth: 0,
            }}
          >
            <Content style={{ overflow: 'auto', flex: showRightRail ? '1 1 auto' : 1, minWidth: 0, background: propizy.bg }}>
              <Outlet />
            </Content>

            {showRightRail ? (
              <aside
                style={{
                  width: 300,
                  flexShrink: 0,
                  borderLeft: `1px solid ${propizy.border}`,
                  background: propizy.surface,
                  overflow: 'auto',
                }}
              >
                <SummaryRail user={user} />
              </aside>
            ) : null}
          </Layout>
        </div>
      </Layout>
    </ConfigProvider>
  );
}
