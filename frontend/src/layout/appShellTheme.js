import { theme } from 'antd';

/** Dark shell matching “ops console” style: deep navy, green status, blue primary actions. */
export const appShellTheme = {
  algorithm: theme.darkAlgorithm,
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
      "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  components: {
    Layout: {
      bodyBg: '#0d1117',
      headerBg: '#12181f',
      siderBg: '#151b24',
      triggerBg: '#151b24',
    },
    Card: {
      colorBgContainer: '#1a222d',
    },
    Input: {
      colorBgContainer: '#0d1117',
      colorBorder: '#30363d',
    },
    Button: {
      colorPrimaryHover: '#5eb3ff',
    },
  },
};

