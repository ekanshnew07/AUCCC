/**
 * Module: utils/axiosConfig.js
 * Purpose: Environment-driven API & Socket.IO configuration with shared auth/error interceptors.
 */
import axios from 'axios';

const rawConfiguredApiUrl = String(
  import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_BACKEND_URL ||
    ''
)
  .trim()
  .replace(/\/+$/, '');

export const apiBaseUrl = rawConfiguredApiUrl
  ? rawConfiguredApiUrl.endsWith('/api')
    ? rawConfiguredApiUrl
    : `${rawConfiguredApiUrl}/api`
  : '/api';

// Shared API client:
// - injects auth tokens
// - emits global notification events
// - detects session expiry in one place
const instance = axios.create({
  baseURL: apiBaseUrl,
  timeout: 30000,
  withCredentials: true,
});

export const socketUrl = String(
  import.meta.env.VITE_SOCKET_URL ||
    import.meta.env.VITE_BACKEND_URL ||
    rawConfiguredApiUrl.replace(/\/api\/?$/, '') ||
    (typeof window !== 'undefined' ? window.location.origin : '')
)
  .trim()
  .replace(/\/+$/, '');

const parseStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user'));
  } catch (_error) {
    return null;
  }
};

const dispatchWindowEvent = (eventName, detail = undefined) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(eventName, detail ? { detail } : undefined));
};

const emitGlobalNotification = (detail) => {
  const payload = {
    id: detail.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title: detail.title || 'Update',
    message: detail.message || '',
    type: detail.type || 'info',
    createdAt: detail.createdAt || new Date().toISOString(),
  };

  dispatchWindowEvent('AuctionPulse:notify', payload);
  dispatchWindowEvent('rizbid:notify', payload);
};

const getNotificationTitle = (method, url, isError = false) => {
  if (isError) return 'Action Failed';
  if (url.includes('/auctions')) return method === 'delete' ? 'Listing Removed' : 'Listing Updated';
  if (url.includes('/support')) return 'Support Update';
  if (url.includes('/payment')) return 'Payment & Delivery Update';
  if (url.includes('/admin')) return 'Admin Update';
  if (url.includes('/auth')) return 'Account Activity';
  return 'Action Update';
};

export const getApiErrorMessage = (error, fallback = 'Something went wrong. Please try again.') => {
  if (!error) return fallback;
  if (error.response?.data?.message) return error.response.data.message;
  if (error.code === 'ECONNABORTED') return 'Request timed out. Please try again.';
  if (error.message === 'Network Error') return 'Unable to reach server. Check your internet connection.';
  return error.message || fallback;
};

instance.interceptors.request.use((config) => {
  // Attach the stored bearer token automatically unless the caller already set one.
  const user = parseStoredUser();
  if (user?.token) {
    config.headers = config.headers || {};
    if (!config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${user.token}`;
    }
  }
  return config;
});

instance.interceptors.response.use(
  (response) => {
    const method = String(response.config?.method || 'get').toLowerCase();
    const requestUrl = String(response.config?.url || '');
    const isAuthEndpoint = requestUrl.includes('/auth/');
    // Success notifications are shown only for mutating actions, not normal reads.
    const shouldNotify = ['post', 'put', 'patch', 'delete'].includes(method);
    if (shouldNotify && response.data?.message && !isAuthEndpoint) {
      emitGlobalNotification({
        title: getNotificationTitle(method, requestUrl, false),
        message: response.data.message,
        type: 'success',
      });
    }
    return response;
  },
  (error) => {
    const requestUrl = String(error.config?.url || '');
    const isAuthAction = requestUrl.includes('/auth/');

    const status = error.response?.status;
    const serverMessage = String(error.response?.data?.message || '').toLowerCase();
    const is401 = status === 401;
    const isCritical403 =
      status === 403 &&
      (serverMessage.includes('not authorized') ||
        serverMessage.includes('token') ||
        serverMessage.includes('jwt') ||
        serverMessage.includes('user not found'));
    const authFailure =
      is401 ||
      isCritical403 ||
      serverMessage.includes('not authorized') ||
      serverMessage.includes('user not found');

    if (authFailure && !isAuthAction) {
      // Immediately clear local auth so the app does not continue with a broken session.
      localStorage.removeItem('user');
      const now = Date.now();
      const lastEventAt = Number(
        sessionStorage.getItem('AuctionPulse_auth_expired_at') ||
          sessionStorage.getItem('rizbid_auth_expired_at') ||
          0
      );
      if (now - lastEventAt > 2000) {
        sessionStorage.setItem('AuctionPulse_auth_expired_at', String(now));
        sessionStorage.setItem('rizbid_auth_expired_at', String(now));
        dispatchWindowEvent('AuctionPulse:auth-expired');
        dispatchWindowEvent('RiZBiD:auth-expired');
      }
    }

    if (!authFailure && !isAuthAction) {
      // Non-auth failures become warning notifications rather than silent failures.
      emitGlobalNotification({
        title: getNotificationTitle(String(error.config?.method || 'get').toLowerCase(), requestUrl, true),
        message: getApiErrorMessage(error),
        type: 'warning',
      });
    }

    return Promise.reject(error);
  }
);

export default instance;
