import { theme } from 'antd';
import { propizy } from './propizyTokens';

/** Light Hotely shell — navy primary, gold accents, airy surfaces. */
export const appShellTheme = {
  algorithm: theme.defaultAlgorithm,
  token: {
    colorPrimary: propizy.primary,
    colorSuccess: propizy.success,
    colorWarning: propizy.caution,
    colorError: propizy.alert,
    colorInfo: propizy.info,
    colorBgLayout: propizy.bg,
    colorBgContainer: propizy.surface,
    colorBorder: propizy.border,
    colorBorderSecondary: '#edf1f5',
    colorText: propizy.text,
    colorTextSecondary: propizy.muted,
    colorTextDescription: '#7a8a9c',
    borderRadius: 12,
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
    },
    Menu: {
      darkItemBg: 'transparent',
      darkSubMenuItemBg: 'transparent',
      darkItemSelectedBg: 'rgba(212, 175, 55, 0.14)',
      darkItemHoverBg: 'rgba(255, 255, 255, 0.06)',
      darkItemSelectedColor: '#fff',
      darkItemColor: 'rgba(244, 246, 248, 0.78)',
      itemBorderRadius: 10,
    },
    Button: {
      colorPrimaryHover: propizy.primaryHover,
      primaryShadow: '0 4px 14px rgba(26, 63, 99, 0.22)',
    },
    Input: {
      colorBgContainer: propizy.surface,
      activeBorderColor: propizy.primary,
      hoverBorderColor: '#c5d0dc',
    },
    Tag: {
      defaultBg: '#eef2f6',
      defaultColor: propizy.muted,
    },
  },
};
