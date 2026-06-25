import { useAuthStore } from '../store/authStore';
import { recordApiMetric } from '../lib/performanceMetrics';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

interface RequestOptions extends RequestInit {
  token?: string;
}

let isRefreshing = false;
let refreshSubscribers: ((token: string | null) => void)[] = [];
const inflightRequests = new Map<string, Promise<any>>();

const subscribeTokenRefresh = (cb: (token: string | null) => void) => {
  refreshSubscribers.push(cb);
};

const onRefreshed = (token: string | null) => {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
};

export const apiRequest = async (endpoint: string, options: RequestOptions = {}): Promise<any> => {


  const { accessToken, isAuthenticated, isHydrated } = useAuthStore.getState();

  // Public endpoints don't need auth — allow them even if auth store isn't hydrated yet
  const publicEndpoints = [
    '/auth/login',
    '/auth/refresh',
    '/auth/register',
    '/hotels/public',
    '/organization/public-departments',
    '/organization/public-managers',
    '/hierarchy/invite',
    '/hierarchy/join',
    '/auth/invite-join'
  ];
  const cleanEndpoint = endpoint.startsWith('/api') ? endpoint.substring(4) : endpoint;
  const isPublic = publicEndpoints.some(ep => cleanEndpoint.startsWith(ep) || endpoint.startsWith(ep));

  // === AUTH GUARD: Do not fire protected API calls before authentication ===
  // Fast-path: if localStorage has a token, treat as hydrated (happens right after login)
  const localToken = typeof window !== 'undefined' ? localStorage.getItem('oxy_access_token') : null;
  const effectivelyHydrated = isHydrated || !!localToken;
  const effectiveToken = accessToken || localToken;

  if (!effectivelyHydrated && !isPublic) {
    console.warn(`[API] Skipping ${endpoint} - Auth not yet hydrated`);
    throw new Error('Auth session not initialized');
  }

  if (!isAuthenticated && !effectiveToken && !isPublic) {
    console.warn(`[API] Skipping protected endpoint ${endpoint} - User not authenticated`);
    throw new Error('Please login first');
  }

  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');

  const token = options.token || accessToken || localToken;
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const config: RequestInit = {
    ...options,
    headers,
    credentials: options.credentials || 'include',
  };

  // Deduplicate inflight requests
  const cacheKey = `${endpoint}:${JSON.stringify(options)}`;
  if (inflightRequests.has(cacheKey)) {
    return inflightRequests.get(cacheKey);
  }

  const requestPromise = (async () => {
    const startTime = performance.now();
    try {
      let response = await fetch(`${BASE_URL}${endpoint}`, config);

      // If unauthorized, try refreshing the token
      if (response.status === 401 && !isPublic) {
        if (!isRefreshing) {
          isRefreshing = true;
          try {
            // Attempt refresh via cookie
            const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
            });

            if (refreshRes.ok) {
              const refreshData = await refreshRes.json();
              const newToken = refreshData.data.accessToken;

              useAuthStore.getState().setAccessToken(newToken);
              isRefreshing = false;
              onRefreshed(newToken);
            } else {
              isRefreshing = false;
              useAuthStore.getState().clearAuth();
              // Only redirect if we're on a dashboard page
              if (typeof window !== 'undefined' && window.location.pathname.startsWith('/dashboard')) {
                window.location.href = '/login';
              }
              throw new Error('Session expired - please login again');
            }
          } catch (refreshErr) {
            isRefreshing = false;
            useAuthStore.getState().clearAuth();
            if (typeof window !== 'undefined' && window.location.pathname.startsWith('/dashboard')) {
              window.location.href = '/login';
            }
            throw refreshErr;
          }
        }

        // Wait for refresh to finish and retry
        const retryPromise = new Promise((resolve) => {
          subscribeTokenRefresh((newToken) => {
            headers.set('Authorization', `Bearer ${newToken}`);
            resolve(
              fetch(`${BASE_URL}${endpoint}`, {
                ...options,
                headers,
                credentials: options.credentials || 'include',
              })
            );
          });
        });

        const retryRes = (await retryPromise) as Response;
        if (!retryRes.ok) {
          const retryText = await retryRes.text().catch(() => '');
          let retryErr = 'Request failed after refresh';
          try {
            const errData = JSON.parse(retryText);
            retryErr = errData.message || retryErr;
          } catch (e) {
            retryErr = `HTTP Error ${retryRes.status}: ${retryText || retryRes.statusText}`;
          }
          throw new Error(retryErr);
        }
        if (retryRes.status === 240 || retryRes.status === 204) {
          return null;
        }
        const updatedJson = await retryRes.json();
        recordApiMetric(endpoint, Math.round(performance.now() - startTime), retryRes.status, false);
        return updatedJson;
      }

      if (!response.ok) {
        const responseText = await response.text().catch(() => '');
        let errorMessage = 'Something went wrong';
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          errorMessage = `HTTP Error ${response.status}: ${responseText || response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      if (response.status === 240 || response.status === 204) {
        recordApiMetric(endpoint, Math.round(performance.now() - startTime), response.status, false);
        return null;
      }

      const json = await response.json();
      recordApiMetric(endpoint, Math.round(performance.now() - startTime), response.status, false);
      return json;
    } catch (error: any) {
      recordApiMetric(endpoint, Math.round(performance.now() - startTime), error?.status || 500, false);
      if (error?.message !== 'Please login first' && error?.message !== 'Auth session not initialized') {
        console.warn('[API Error]', endpoint, error?.message || error);
      }
      throw error;
    } finally {
      inflightRequests.delete(cacheKey);
    }
  })();

  inflightRequests.set(cacheKey, requestPromise);
  return requestPromise;
};

export const api = {
  get: (endpoint: string, options?: RequestOptions) =>
    apiRequest(endpoint, { ...options, method: 'GET' }),
  post: (endpoint: string, body: any, options?: RequestOptions) =>
    apiRequest(endpoint, { ...options, method: 'POST', body: JSON.stringify(body) }),
  put: (endpoint: string, body: any, options?: RequestOptions) =>
    apiRequest(endpoint, { ...options, method: 'PUT', body: JSON.stringify(body) }),
  patch: (endpoint: string, body?: any, options?: RequestOptions) =>
    apiRequest(endpoint, { ...options, method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: (endpoint: string, options?: RequestOptions) =>
    apiRequest(endpoint, { ...options, method: 'DELETE' }),
};