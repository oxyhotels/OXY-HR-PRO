import { useAuthStore } from '../store/authStore';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

interface RequestOptions extends RequestInit {
  token?: string;
}

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

const subscribeTokenRefresh = (cb: (token: string) => void) => {
  refreshSubscribers.push(cb);
};

const onRefreshed = (token: string) => {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
};

export const apiRequest = async (endpoint: string, options: RequestOptions = {}): Promise<any> => {
  const { accessToken, setAccessToken, clearAuth } = useAuthStore.getState();

  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');

  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const config: RequestInit = {
    ...options,
    headers,
    credentials: options.credentials || 'include',
  };

  try {
    let response = await fetch(`${BASE_URL}${endpoint}`, config);

    // If unauthorized, try refreshing the token
    if (response.status === 401 && endpoint !== '/auth/login' && endpoint !== '/auth/refresh') {
      if (!isRefreshing) {
        isRefreshing = true;
        try {
          // Attempt refresh
          const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
          });

          if (refreshRes.ok) {
            const refreshData = await refreshRes.json();
            const newToken = refreshData.data.accessToken;

            setAccessToken(newToken);
            isRefreshing = false;
            onRefreshed(newToken);
          } else {
            isRefreshing = false;
            clearAuth();
            window.location.href = '/login';
            throw new Error('Session expired');
          }
        } catch (refreshErr) {
          isRefreshing = false;
          clearAuth();
          window.location.href = '/login';
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
      return retryRes.json();
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
      return null;
    }

    return response.json();
  } catch (error: any) {
    console.warn('API Error Catch:', error.message);
    throw error;
  }
};

export const api = {
  get: (endpoint: string, options?: RequestOptions) =>
    apiRequest(endpoint, { ...options, method: 'GET' }),
  post: (endpoint: string, body: any, options?: RequestOptions) =>
    apiRequest(endpoint, { ...options, method: 'POST', body: JSON.stringify(body) }),
  put: (endpoint: string, body: any, options?: RequestOptions) =>
    apiRequest(endpoint, { ...options, method: 'PUT', body: JSON.stringify(body) }),
  delete: (endpoint: string, options?: RequestOptions) =>
    apiRequest(endpoint, { ...options, method: 'DELETE' }),
};
