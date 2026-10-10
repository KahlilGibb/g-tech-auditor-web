import { apiClient } from '../lib/apiClient';
import { toRecord, toStringValue, unwrapData } from '../lib/apiResponse';
import { API_ENDPOINTS } from '../constants/api';

export interface PasswordResetRequest {
  id: string;
  userId: string;
  username: string;
  name: string;
  roleName: string;
  branches: string[];
  createdAt: string;
}

function normalizeRequest(item: unknown): PasswordResetRequest {
  const record = toRecord(item);
  return {
    id: toStringValue(record.id),
    userId: toStringValue(record.user_id),
    username: toStringValue(record.username),
    name: toStringValue(record.name) || toStringValue(record.username),
    roleName: toStringValue(record.role_name),
    branches: Array.isArray(record.branches) ? record.branches.map(b => toStringValue(b)).filter(Boolean) : [],
    createdAt: toStringValue(record.created_at),
  };
}

// Accounts have no real mailbox, so a forgotten password goes through Head
// Office: the login page files a request, an admin resets it from Users.
export const passwordService = {
  async changeOwn(currentPassword: string, newPassword: string): Promise<void> {
    await apiClient.put(API_ENDPOINTS.USERS.CHANGE_MY_PASSWORD, {
      current_password: currentPassword,
      new_password: newPassword,
    });
  },

  async requestReset(identifier: string): Promise<void> {
    await apiClient.post(API_ENDPOINTS.AUTH.FORGOT_PASSWORD, { identifier });
  },

  async listRequests(): Promise<PasswordResetRequest[]> {
    const response = await apiClient.get(API_ENDPOINTS.PASSWORD_RESET_REQUESTS.LIST);
    const data = unwrapData<unknown>(response.data);
    return Array.isArray(data) ? data.map(normalizeRequest) : [];
  },

  async resetUser(userId: string, newPassword: string): Promise<void> {
    await apiClient.post(API_ENDPOINTS.USERS.RESET_PASSWORD(userId), { new_password: newPassword });
  },

  async dismissRequest(requestId: string): Promise<void> {
    await apiClient.post(API_ENDPOINTS.PASSWORD_RESET_REQUESTS.DISMISS(requestId));
  },
};

const TEMP_PASSWORD_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';

/** A 10-character temporary password without look-alike characters (0/O, 1/l/I). */
export function generateTempPassword(length = 10): string {
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => TEMP_PASSWORD_ALPHABET[b % TEMP_PASSWORD_ALPHABET.length]).join('');
}
