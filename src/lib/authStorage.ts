import type { AuthUser } from '../types/auth';

export const AUTH_EXPIRED_EVENT = 'gtech-auth-expired';

const ACCESS_TOKEN_KEY = 'gtech_access_token';
const REFRESH_TOKEN_KEY = 'gtech_refresh_token';
const USER_KEY = 'gtech_user';

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
}

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function asRecord(value: unknown): UnknownRecord {
  return isRecord(value) ? value : {};
}

function unwrapPayload(payload: unknown): UnknownRecord {
  const root = asRecord(payload);
  const data = root.data;
  return isRecord(data) ? data : root;
}

function firstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value;
  }
  return undefined;
}

export function extractAuthTokens(payload: unknown): Partial<AuthTokens> {
  const data = unwrapPayload(payload);
  const token = asRecord(data.token);
  const tokens = asRecord(data.tokens);

  return {
    accessToken: firstString(
      data.access_token,
      data.accessToken,
      data.token,
      token.access_token,
      token.accessToken,
      tokens.access_token,
      tokens.accessToken,
    ),
    refreshToken: firstString(
      data.refresh_token,
      data.refreshToken,
      token.refresh_token,
      token.refreshToken,
      tokens.refresh_token,
      tokens.refreshToken,
    ),
  };
}

export const authStorage = {
  getAccessToken() {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  },

  getRefreshToken() {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },

  setTokens(tokens: AuthTokens) {
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
    if (tokens.refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
    }
  },

  setUser(user: AuthUser) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  getUser(): AuthUser | null {
    const saved = localStorage.getItem(USER_KEY);
    if (!saved) return null;

    try {
      return JSON.parse(saved) as AuthUser;
    } catch {
      return null;
    }
  },

  clear() {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
};
