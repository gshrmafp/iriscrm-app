import axios from 'axios';
import { getTokens, storeTokens, clearTokens } from '@/services/storage/secureStorage';
import { API_BASE_URL } from '@/app/config/env';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use(async config => {
  const tokens = await getTokens();
  if (tokens?.accessToken) {
    config.headers.Authorization = `Bearer ${tokens.accessToken}`;
  }
  return config;
});

let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

function onRefreshed(token: string) {
  refreshSubscribers.forEach(cb => cb(token));
  refreshSubscribers = [];
}

// The backend wraps every response as { success, data } (plus a sibling
// `meta` for the few endpoints using the true paginated() helper, e.g.
// /notifications). Every feature API file's types assume `response.data` is
// already unwrapped to that inner `data` (and `meta` when present) — this is
// the one place that unwrapping happens, so it only needs fixing once.
function unwrapEnvelope(body: unknown): unknown {
  if (body && typeof body === 'object' && 'success' in (body as Record<string, unknown>) && 'data' in (body as Record<string, unknown>)) {
    const envelope = body as { data: unknown; meta?: unknown };
    return envelope.meta !== undefined ? { data: envelope.data, meta: envelope.meta } : envelope.data;
  }
  return body;
}

apiClient.interceptors.response.use(
  res => {
    res.data = unwrapEnvelope(res.data);
    return res;
  },
  async error => {
    const original = error.config;
    const isAuthEndpoint = (original?.url as string | undefined)?.includes('/auth/');
    if (error.response?.status === 401 && !original._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        return new Promise(resolve => {
          refreshSubscribers.push(token => {
            original.headers.Authorization = `Bearer ${token}`;
            resolve(apiClient(original));
          });
        });
      }
      original._retry = true;
      isRefreshing = true;
      try {
        const tokens = await getTokens();
        if (!tokens?.refreshToken) {
          return Promise.reject(error);
        }
        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken: tokens.refreshToken,
        });
        const { accessToken } = unwrapEnvelope(response.data) as { accessToken: string };
        await storeTokens({ accessToken, refreshToken: tokens.refreshToken });
        onRefreshed(accessToken);
        original.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(original);
      } catch {
        await clearTokens();
        const { store } = await import('@/app/store');
        const { logout } = await import('@/app/store/slices/authSlice');
        store.dispatch(logout('session-expired'));
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }
    // The backend's error envelope is { success: false, error: { code, message } }
    // — not { code } at the top level.
    if (error.response?.status === 403 && error.response?.data?.error?.code === 'REGION_INACTIVE') {
      const { store } = await import('@/app/store');
      const { markRegionInactive } = await import('@/app/store/slices/authSlice');
      store.dispatch(markRegionInactive());
    }
    return Promise.reject(error);
  },
);
