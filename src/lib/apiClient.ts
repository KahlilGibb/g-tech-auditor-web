/**
 * MockInterceptError is thrown to intercept network requests 
 * and fallback to mock data when MOCK_API is enabled.
 */
export class MockInterceptError extends Error {
  constructor(message = 'Request intercepted for mocking') {
    super(message);
    this.name = 'MockInterceptError';
  }
}

// Set to false to use real API logic.
// When true, apiClient throws MockInterceptError to trigger local mocks.
export const MOCK_API = true;

/**
 * A primitive apiClient that adheres to the mobile app's pattern.
 * When MOCK_API is true, it rejects with MockInterceptError so that 
 * the calling service can catch it and return predefined mock data.
 * When false, it would use standard fetch (or axios).
 */
export const apiClient = {
  async get<T>(url: string, config?: RequestInit): Promise<{ data: T }> {
    if (MOCK_API) throw new MockInterceptError(url);
    const res = await fetch(url, { ...config, method: 'GET' });
    if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
    const data = await res.json();
    return { data };
  },

  async post<T>(url: string, body?: unknown, config?: RequestInit): Promise<{ data: T }> {
    if (MOCK_API) throw new MockInterceptError(url);
    const res = await fetch(url, {
      ...config,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...config?.headers },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
    const data = await res.json();
    return { data };
  },

  async put<T>(url: string, body?: unknown, config?: RequestInit): Promise<{ data: T }> {
    if (MOCK_API) throw new MockInterceptError(url);
    const res = await fetch(url, {
      ...config,
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...config?.headers },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
    const data = await res.json();
    return { data };
  },

  async delete<T>(url: string, config?: RequestInit): Promise<{ data: T }> {
    if (MOCK_API) throw new MockInterceptError(url);
    const res = await fetch(url, { ...config, method: 'DELETE' });
    if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
    const data = await res.json();
    return { data };
  }
};
