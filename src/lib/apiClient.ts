import axios from 'axios';
import type { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';
import {
  AUTH_EXPIRED_EVENT,
  authStorage,
  extractAuthTokens,
  type AuthTokens,
} from './authStorage';
import { getApiErrorMessage } from './apiResponse';

export class MockInterceptError extends Error {
  constructor(message = 'Request intercepted for mocking') {
    super(message);
    this.name = 'MockInterceptError';
  }
}

export class ApiRequestError extends Error {
  status?: number;
  data?: unknown;

  constructor(message: string, status?: number, data?: unknown) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.data = data;
    Object.setPrototypeOf(this, ApiRequestError.prototype);
  }
}

type RetryableRequestConfig = AxiosRequestConfig & {
  _retry?: boolean;
};

const envBaseUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;
const envMockApi = import.meta.env.VITE_USE_MOCK_API as string | undefined;

export const API_BASE_URL = envBaseUrl?.trim() || 'http://localhost:8181';
export const MOCK_API = ['true', '1', 'yes'].includes((envMockApi ?? '').toLowerCase());

const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

export const httpClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

let refreshPromise: Promise<AuthTokens | null> | null = null;

async function refreshAccessToken(): Promise<AuthTokens | null> {
  const refreshToken = authStorage.getRefreshToken();
  if (!refreshToken) return null;

  const response = await refreshClient.post('/auth/refresh', {
    refresh_token: refreshToken,
  });
  const tokens = extractAuthTokens(response.data);
  if (!tokens.accessToken) return null;

  authStorage.setTokens({
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken ?? refreshToken,
  });

  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken ?? refreshToken,
  };
}

function dispatchAuthExpired() {
  authStorage.clear();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
  }
}

function toApiRequestError(error: AxiosError<unknown>) {
  return new ApiRequestError(
    getApiErrorMessage(error),
    error.response?.status,
    error.response?.data,
  );
}

function normalizeApiError(error: unknown, fallback?: AxiosError<unknown>) {
  if (error instanceof MockInterceptError) return error;
  if (axios.isAxiosError(error)) return toApiRequestError(error);
  if (error instanceof Error) return error;
  if (fallback) return toApiRequestError(fallback);
  return new ApiRequestError(getApiErrorMessage(error));
}

httpClient.interceptors.request.use(config => {
  if (MOCK_API) {
    throw new MockInterceptError(config.url);
  }

  const accessToken = authStorage.getAccessToken();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  return config;
});

httpClient.interceptors.response.use(
  response => response,
  async (error: unknown) => {
    if (error instanceof MockInterceptError) {
      return Promise.reject(error);
    }

    if (!axios.isAxiosError(error)) {
      return Promise.reject(normalizeApiError(error));
    }

    const originalRequest = error.config as RetryableRequestConfig | undefined;
    const status = error.response?.status;

    if (status !== 401 || !originalRequest || originalRequest._retry) {
      return Promise.reject(toApiRequestError(error));
    }

    originalRequest._retry = true;

    try {
      refreshPromise ??= refreshAccessToken().finally(() => {
        refreshPromise = null;
      });
      const refreshedTokens = await refreshPromise;

      if (!refreshedTokens?.accessToken) {
        dispatchAuthExpired();
        return Promise.reject(toApiRequestError(error));
      }

      originalRequest.headers = {
        ...originalRequest.headers,
        Authorization: `Bearer ${refreshedTokens.accessToken}`,
      };

      return httpClient(originalRequest);
    } catch (refreshError) {
      dispatchAuthExpired();
      return Promise.reject(normalizeApiError(refreshError, error));
    }
  },
);

export const apiClient = {
  get<T>(url: string, config?: AxiosRequestConfig) {
    return httpClient.get<T>(url, config);
  },

  post<T>(url: string, body?: unknown, config?: AxiosRequestConfig) {
    return httpClient.post<T>(url, body, config);
  },

  put<T>(url: string, body?: unknown, config?: AxiosRequestConfig) {
    return httpClient.put<T>(url, body, config);
  },

  patch<T>(url: string, body?: unknown, config?: AxiosRequestConfig) {
    return httpClient.patch<T>(url, body, config);
  },

  delete<T>(url: string, config?: AxiosRequestConfig) {
    return httpClient.delete<T>(url, config);
  },
};
