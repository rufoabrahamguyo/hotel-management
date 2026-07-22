import axios from 'axios';
import { useAuthStore } from '../store/authstore';
import { emitSessionActivity } from '../auth/sessionEvents';

const baseURL = import.meta.env.VITE_API_BASE_URL ?? '';

/**
 * Factory keeps HTTP client injectable for tests (DIP).
 * @param {{ getToken?: () => string | null, clearSession?: () => void, clearProperty?: () => void, redirectToSelectProperty?: () => void }} deps
 */
export function createApi(deps = {}) {
  const getToken = deps.getToken ?? (() => useAuthStore.getState().token);
  const clearSession = deps.clearSession ?? (() => useAuthStore.getState().clearSession());
  const clearProperty =
    deps.clearProperty ?? (() => useAuthStore.setState({ propertyId: null }));
  const redirectToSelectProperty =
    deps.redirectToSelectProperty ??
    (() => {
      if (!window.location.pathname.startsWith('/select-property')) {
        window.location.assign('/select-property');
      }
    });

  const client = axios.create({
    baseURL,
    headers: { 'Content-Type': 'application/json' },
    timeout: 30_000,
  });

  client.interceptors.request.use((config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  client.interceptors.response.use(
    (res) => {
      emitSessionActivity();
      return res;
    },
    (err) => {
      const status = err.response?.status;
      const data = err.response?.data ?? {};
      const message = data.message ?? '';
      const code = data.code;
      if (status === 401) {
        clearSession();
      } else if (
        status === 403 &&
        (code === 'PROPERTY_REQUIRED' ||
          (typeof message === 'string' && message.toLowerCase().includes('select a property')))
      ) {
        clearProperty();
        redirectToSelectProperty();
      }
      return Promise.reject(err);
    },
  );

  return client;
}

export const api = createApi();
