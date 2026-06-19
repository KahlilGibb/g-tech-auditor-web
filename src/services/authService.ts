import { apiClient, MockInterceptError } from '../lib/apiClient';
import { toRecord, toStringValue, unwrapData } from '../lib/apiResponse';
import { authStorage, extractAuthTokens, type AuthTokens } from '../lib/authStorage';
import { API_ENDPOINTS } from '../constants/api';
import type { AuthPermission, AuthUser } from '../types/auth';
import { mockAuthApi } from './mockManagementApi';

export interface LoginResult {
  user: AuthUser;
  tokens: AuthTokens;
}

function normalizeUser(payload: unknown): AuthUser {
  const data = unwrapData<unknown>(payload);
  const record = toRecord(data);
  const user = toRecord(record.user);
  const source = Object.keys(user).length ? user : record;
  const role = toRecord(source.role);
  const organization = toRecord(source.organization);
  const branch = toRecord(source.branch);
  const groups = Array.isArray(source.groups) ? source.groups.map(toRecord) : [];
  const primaryGroup = groups[0] ?? {};
  const permissions = normalizePermissions(source.permissions);

  return {
    id: toStringValue(source.id || source.user_id),
    username: toStringValue(source.username) || undefined,
    email: toStringValue(source.email),
    name:
      toStringValue(source.name) ||
      toStringValue(source.full_name) ||
      toStringValue(source.fullName) ||
      toStringValue(source.username) ||
      toStringValue(source.email),
    orgId:
      toStringValue(source.org_id) ||
      toStringValue(source.orgId) ||
      toStringValue(organization.id) ||
      undefined,
    role:
      toStringValue(source.role_name) ||
      toStringValue(source.roleName) ||
      toStringValue(role.name) ||
      toStringValue(source.role) ||
      'user',
    roleId:
      toStringValue(source.role_id) ||
      toStringValue(source.roleId) ||
      toStringValue(role.id) ||
      undefined,
    branchId:
      toStringValue(source.branch_id) ||
      toStringValue(source.branchId) ||
      toStringValue(source.group_id) ||
      toStringValue(source.groupId) ||
      toStringValue(branch.id) ||
      undefined,
    groupId:
      toStringValue(source.group_id) ||
      toStringValue(source.groupId) ||
      toStringValue(source.branch_id) ||
      toStringValue(source.branchId) ||
      toStringValue(branch.id) ||
      undefined,
    organizationName: toStringValue(organization.name) || undefined,
    groupName:
      toStringValue(primaryGroup.name) ||
      toStringValue(branch.name) ||
      undefined,
    groupAddress:
      toStringValue(primaryGroup.address) ||
      toStringValue(branch.address) ||
      undefined,
    avatar: toStringValue(source.avatar_url) || toStringValue(source.avatar) || undefined,
    permissions,
  };
}

function normalizePermissions(payload: unknown): AuthPermission[] | undefined {
  if (!Array.isArray(payload)) return undefined;

  return payload
    .map((item): AuthPermission | null => {
      const record = toRecord(item);
      const resource = toStringValue(record.resource) || undefined;
      const action = toStringValue(record.action) || undefined;
      const name =
        toStringValue(record.name) ||
        toStringValue(record.permission) ||
        (resource && action ? `${resource}:${action}` : '');

      if (!name) return null;

      return {
        id: toStringValue(record.id) || undefined,
        name,
        resource,
        action,
      };
    })
    .filter((permission): permission is AuthPermission => Boolean(permission));
}

export const authService = {
  async login(email: string, password: string): Promise<LoginResult> {
    try {
      const response = await apiClient.post(API_ENDPOINTS.AUTH.LOGIN, { email, password });
      const tokens = extractAuthTokens(response.data);

      if (!tokens.accessToken) {
        throw new Error('Login response did not include an access token.');
      }

      authStorage.setTokens({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      });

      let user = normalizeUser(response.data);
      if (!user.id || !user.email) {
        user = await this.getMe();
      }

      authStorage.setUser(user);
      return {
        user,
        tokens: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        },
      };
    } catch (error) {
      if (error instanceof MockInterceptError) {
        const result = await mockAuthApi.login(email, password);
        authStorage.setTokens(result.tokens);
        authStorage.setUser(result.user);
        return result;
      }
      throw error;
    }
  },

  async getMe(): Promise<AuthUser> {
    try {
      const response = await apiClient.get(API_ENDPOINTS.USERS.ME);
      const user = normalizeUser(response.data);
      authStorage.setUser(user);
      return user;
    } catch (error) {
      if (error instanceof MockInterceptError) {
        const user = await mockAuthApi.getMe();
        authStorage.setUser(user);
        return user;
      }
      throw error;
    }
  },

  async verify(): Promise<AuthUser | null> {
    try {
      const response = await apiClient.get(API_ENDPOINTS.AUTH.VERIFY);
      const record = toRecord(unwrapData(response.data));
      const userPayload = Object.keys(toRecord(record.user)).length ? record.user : response.data;
      return normalizeUser(userPayload);
    } catch (error) {
      if (error instanceof MockInterceptError) {
        return authStorage.getUser();
      }
      throw error;
    }
  },

  async logout() {
    try {
      await apiClient.post(API_ENDPOINTS.AUTH.LOGOUT);
    } catch (error) {
      if (error instanceof MockInterceptError) await mockAuthApi.logout();
      else throw error;
    } finally {
      authStorage.clear();
    }
  },

  async logoutAll() {
    try {
      await apiClient.post(API_ENDPOINTS.AUTH.LOGOUT_ALL);
    } catch (error) {
      if (error instanceof MockInterceptError) await mockAuthApi.logout();
      else throw error;
    } finally {
      authStorage.clear();
    }
  },

  clearSession() {
    authStorage.clear();
  },
};
