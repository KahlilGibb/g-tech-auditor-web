import type { AxiosError } from 'axios';

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function toRecord(value: unknown): UnknownRecord {
  return isRecord(value) ? value : {};
}

export function toStringValue(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return fallback;
}

export function unwrapData<T>(payload: unknown): T {
  if (isRecord(payload) && 'data' in payload) {
    return payload.data as T;
  }
  return payload as T;
}

export function unwrapList<T>(payload: unknown): T[] {
  const data = unwrapData<unknown>(payload);
  if (Array.isArray(data)) return data as T[];

  if (isRecord(data)) {
    if (Array.isArray(data.items)) return data.items as T[];
    if (Array.isArray(data.rows)) return data.rows as T[];
    if (Array.isArray(data.results)) return data.results as T[];
    if (Array.isArray(data.data)) return data.data as T[];
  }

  return [];
}

export function getApiErrorMessage(error: unknown, fallback = 'Request failed') {
  const axiosError = error as AxiosError<unknown>;
  const payload = axiosError.response?.data;
  const data = toRecord(payload);
  const nested = toRecord(data.data);

  return (
    toStringValue(payload) ||
    toStringValue(data.message) ||
    toStringValue(data.error) ||
    toStringValue(nested.message) ||
    toStringValue(nested.error) ||
    (error instanceof Error ? error.message : '') ||
    fallback
  );
}
