import { theme } from 'antd';
import { propizy } from './propizyTokens';

/** Light Hotely shell — navy primary, gold accents, airy surfaces. */
export const appShellTheme = {
  algorithm: theme.defaultAlgorithm,
  token: {
    colorPrimary: '#4da6ff',
    colorSuccess: '#3fb950',
    colorBgLayout: '#0d1117',
    colorBgContainer: '#161b22',
    colorBorder: '#30363d',
    colorBorderSecondary: '#21262d',
    colorText: '#e6edf3',
    colorTextSecondary: '#8b949e',
    colorTextDescription: '#6e7681',
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
      colorPrimaryHover: '#5eb3ff',
    },
  },
};

