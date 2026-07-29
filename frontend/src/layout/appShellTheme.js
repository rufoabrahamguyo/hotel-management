import { theme } from 'antd';
import { propizy } from './propizyTokens';

/** Light Hotely shell - navy primary, gold accents, airy surfaces. */
export const appShellTheme = {
  algorithm: theme.defaultAlgorithm,
  token: {
    colorPrimary: '#1890ff',
    colorSuccess: propizy.success,
    colorWarning: propizy.caution,
    colorError: propizy.alert,
    colorInfo: '#1890ff',
    colorBgLayout: '#f0f2f5',
    colorBgContainer: propizy.surface,
    colorBorder: '#f0f0f0',
    colorBorderSecondary: '#f0f0f0',
    colorText: '#262626',
    colorTextSecondary: '#8c8c8c',
    colorTextDescription: '#8c8c8c',
    colorTextPlaceholder: '#bfbfbf',
    borderRadius: 8,
    fontFamily:
      "'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    controlHeight: 40,
  },
  components: {
    Layout: {
      bodyBg: propizy.bg,
      headerBg: propizy.surface,
      siderBg: propizy.navy,
      triggerBg: propizy.navy,
    },
    Card: {
      colorBgContainer: propizy.surface,
      paddingLG: 20,
      borderRadiusLG: 8,
    },
    Input: {
      colorBgContainer: propizy.surface,
      colorText: propizy.text,
      colorTextPlaceholder: propizy.muted,
      activeBorderColor: '#1890ff',
      hoverBorderColor: '#40a9ff',
    },
    Menu: {
      darkItemBg: 'transparent',
      darkSubMenuItemBg: 'transparent',
      darkItemSelectedBg: 'rgba(24, 144, 255, 0.22)',
      darkItemHoverBg: 'rgba(255, 255, 255, 0.06)',
      darkItemSelectedColor: '#fff',
      darkItemColor: 'rgba(244, 246, 248, 0.78)',
      itemBorderRadius: 8,
    },
    Button: {
      colorPrimaryHover: '#40a9ff',
    },
  },
};

