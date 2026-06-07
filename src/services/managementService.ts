import { apiClient, MockInterceptError } from '../lib/apiClient';
import { toRecord, toStringValue, unwrapData, unwrapList } from '../lib/apiResponse';
import { API_ENDPOINTS } from '../constants/api';
import type {
  Branch,
  BranchFormInput,
  ListQuery,
  ManagementUser,
  Organization,
  OrganizationFormInput,
  Permission,
  PermissionFormInput,
  Role,
  RoleFormInput,
  Site,
  SiteFormInput,
  UserFormInput,
  GetOrganizationsRequest,
  GetOrganizationsResponse,
  GetGroupsRequest,
  GetGroupsResponse,
  GetSitesRequest,
  GetSitesResponse,
  CreateSiteRequest,
  CreateSiteResponse,
  UpdateSiteRequest,
  UpdateSiteResponse,
} from '../types/management';
import {
  mockBranchApi,
  mockOrganizationApi,
  mockRoleApi,
  mockSiteApi,
  mockUserApi,
} from './mockManagementApi';

function normalizeDate(value: unknown) {
  return toStringValue(value) || undefined;
}

function normalizeUser(raw: unknown): ManagementUser {
  const record = toRecord(raw);
  const role = toRecord(record.role);
  const branch = toRecord(record.branch);
  const group = toRecord(record.group);
  const organization = toRecord(record.organization);

  return {
    id: toStringValue(record.id || record.user_id),
    username: toStringValue(record.username),
    email: toStringValue(record.email),
    name:
      toStringValue(record.name) ||
      toStringValue(record.full_name) ||
      toStringValue(record.fullName) ||
      toStringValue(record.username),
    roleName:
      toStringValue(record.role_name) ||
      toStringValue(record.roleName) ||
      toStringValue(role.name) ||
      toStringValue(record.role),
    roleId: toStringValue(record.role_id) || toStringValue(record.roleId) || toStringValue(role.id) || undefined,
    branchId:
      toStringValue(record.branch_id) ||
      toStringValue(record.branchId) ||
      toStringValue(record.group_id) ||
      toStringValue(record.groupId) ||
      toStringValue(branch.id) ||
      toStringValue(group.id) ||
      undefined,
    groupId:
      toStringValue(record.group_id) ||
      toStringValue(record.groupId) ||
      toStringValue(record.branch_id) ||
      toStringValue(record.branchId) ||
      toStringValue(group.id) ||
      toStringValue(branch.id) ||
      undefined,
    orgId:
      toStringValue(record.org_id) ||
      toStringValue(record.orgId) ||
      toStringValue(organization.id) ||
      undefined,
    status: toStringValue(record.status) || undefined,
    createdAt: normalizeDate(record.created_at || record.createdAt),
    updatedAt: normalizeDate(record.updated_at || record.updatedAt),
  };
}

function normalizeRole(raw: unknown): Role {
  const record = toRecord(raw);
  return {
    id: toStringValue(record.id || record.role_id),
    name: toStringValue(record.name),
    description: toStringValue(record.description) || undefined,
    status: toStringValue(record.status) || undefined,
    createdAt: normalizeDate(record.created_at || record.createdAt),
    updatedAt: normalizeDate(record.updated_at || record.updatedAt),
  };
}

function normalizePermission(raw: unknown): Permission {
  const record = toRecord(raw);
  return {
    id: toStringValue(record.id || record.permission_id),
    name: toStringValue(record.name),
    resource: toStringValue(record.resource) || undefined,
    action: toStringValue(record.action) || undefined,
  };
}

function normalizeBranch(raw: unknown): Branch {
  const record = toRecord(raw);
  return {
    id: toStringValue(record.id || record.branch_id || record.group_id),
    name: toStringValue(record.name),
    code: toStringValue(record.code),
    address: toStringValue(record.address),
    orgId: toStringValue(record.org_id || record.orgId) || undefined,
    status: toStringValue(record.status) || undefined,
    createdAt: normalizeDate(record.created_at || record.createdAt),
    updatedAt: normalizeDate(record.updated_at || record.updatedAt),
  };
}

function normalizeOrganization(raw: unknown): Organization {
  const record = toRecord(raw);
  return {
    id: toStringValue(record.id || record.organization_id || record.org_id),
    name: toStringValue(record.name),
    code: toStringValue(record.code),
    address: toStringValue(record.address) || undefined,
    phone: toStringValue(record.phone || record.phone_number) || undefined,
    email: toStringValue(record.email) || undefined,
    status: toStringValue(record.status) || undefined,
    createdAt: normalizeDate(record.created_at || record.createdAt),
    updatedAt: normalizeDate(record.updated_at || record.updatedAt),
  };
}

function normalizeSite(raw: unknown): Site {
  const record = toRecord(raw);
  const organization = toRecord(record.organization || record.org);
  const branch = toRecord(record.branch || record.group);

  return {
    id: toStringValue(record.id || record.site_id),
    name: toStringValue(record.name),
    code: toStringValue(record.code),
    address: toStringValue(record.address || record.location) || undefined,
    organizationId:
      toStringValue(record.organization_id || record.org_id || record.organizationId || organization.id) ||
      undefined,
    organizationName:
      toStringValue(record.organization_name || record.org_name || organization.name) || undefined,
    branchId:
      toStringValue(record.branch_id || record.group_id || record.branchId || branch.id) ||
      undefined,
    branchName: toStringValue(record.branch_name || record.group_name || branch.name) || undefined,
    status: toStringValue(record.status) || undefined,
    createdAt: normalizeDate(record.created_at || record.createdAt),
    updatedAt: normalizeDate(record.updated_at || record.updatedAt),
  };
}

function compactPayload(payload: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined && value !== ''),
  );
}

function userPayload(input: UserFormInput) {
  return compactPayload({
    username: input.username,
    email: input.email,
    password: input.password,
    name: input.name,
    role_name: input.roleName,
    role_id: input.roleId,
    group_id: input.groupId,
    org_id: input.orgId,
    status: input.status,
  });
}

function branchPayload(input: BranchFormInput) {
  return compactPayload({
    name: input.name,
    code: input.code,
    address: input.address,
    status: input.status,
  });
}

function permissionPayload(input: PermissionFormInput) {
  return compactPayload({
    name: input.name,
    resource: input.resource,
    action: input.action,
  });
}

function organizationPayload(input: OrganizationFormInput) {
  return compactPayload({
    name: input.name,
    code: input.code,
    address: input.address,
    phone: input.phone,
    email: input.email,
    status: input.status,
  });
}

function sitePayload(input: SiteFormInput) {
  return compactPayload({
    name: input.name,
    code: input.code,
    address: input.address,
    organization_id: input.organizationId,
    org_id: input.organizationId,
    branch_id: input.branchId,
    group_id: input.branchId,
    status: input.status,
  });
}

function queryParams(query?: ListQuery) {
  return compactPayload({
    page: query?.page ?? 1,
    limit: query?.limit ?? 20,
    search: query?.search,
  });
}

export const userService = {
  async list(query?: ListQuery): Promise<ManagementUser[]> {
    try {
      const response = await apiClient.get(API_ENDPOINTS.USERS.LIST, {
        params: queryParams(query),
      });
      return unwrapList<unknown>(response.data).map(normalizeUser);
    } catch (error) {
      if (error instanceof MockInterceptError) return mockUserApi.list(query);
      throw error;
    }
  },

  async getById(id: string): Promise<ManagementUser> {
    try {
      const response = await apiClient.get(API_ENDPOINTS.USERS.DETAIL(id));
      return normalizeUser(unwrapData(response.data));
    } catch (error) {
      if (error instanceof MockInterceptError) return mockUserApi.getById(id);
      throw error;
    }
  },

  async create(input: UserFormInput): Promise<ManagementUser> {
    try {
      const response = await apiClient.post(API_ENDPOINTS.USERS.CREATE, userPayload(input));
      return normalizeUser(unwrapData(response.data));
    } catch (error) {
      if (error instanceof MockInterceptError) return mockUserApi.create(input);
      throw error;
    }
  },

  async update(id: string, input: UserFormInput): Promise<ManagementUser> {
    try {
      const response = await apiClient.put(API_ENDPOINTS.USERS.UPDATE(id), userPayload(input));
      return normalizeUser(unwrapData(response.data));
    } catch (error) {
      if (error instanceof MockInterceptError) return mockUserApi.update(id, input);
      throw error;
    }
  },

  async remove(id: string): Promise<void> {
    try {
      await apiClient.delete(API_ENDPOINTS.USERS.DELETE(id));
    } catch (error) {
      if (error instanceof MockInterceptError) return mockUserApi.remove(id);
      throw error;
    }
  },
};

export const roleService = {
  async list(): Promise<Role[]> {
    try {
      const response = await apiClient.get(API_ENDPOINTS.ROLES.LIST);
      return unwrapList<unknown>(response.data).map(normalizeRole);
    } catch (error) {
      if (error instanceof MockInterceptError) return mockRoleApi.list();
      throw error;
    }
  },

  async getById(id: string): Promise<Role> {
    try {
      const response = await apiClient.get(API_ENDPOINTS.ROLES.DETAIL(id));
      return normalizeRole(unwrapData(response.data));
    } catch (error) {
      if (error instanceof MockInterceptError) return mockRoleApi.getById(id);
      throw error;
    }
  },

  async create(input: RoleFormInput): Promise<Role> {
    try {
      const response = await apiClient.post(API_ENDPOINTS.ROLES.CREATE, input);
      return normalizeRole(unwrapData(response.data));
    } catch (error) {
      if (error instanceof MockInterceptError) return mockRoleApi.create(input);
      throw error;
    }
  },

  async update(id: string, input: RoleFormInput): Promise<Role> {
    try {
      const response = await apiClient.put(API_ENDPOINTS.ROLES.UPDATE(id), input);
      return normalizeRole(unwrapData(response.data));
    } catch (error) {
      if (error instanceof MockInterceptError) return mockRoleApi.update(id, input);
      throw error;
    }
  },

  async remove(id: string): Promise<void> {
    try {
      await apiClient.delete(API_ENDPOINTS.ROLES.DELETE(id));
    } catch (error) {
      if (error instanceof MockInterceptError) return mockRoleApi.remove(id);
      throw error;
    }
  },

  async getPermissions(id: string): Promise<Permission[]> {
    try {
      const response = await apiClient.get(API_ENDPOINTS.ROLES.PERMISSIONS(id));
      return unwrapList<unknown>(response.data).map(normalizePermission);
    } catch (error) {
      if (error instanceof MockInterceptError) return mockRoleApi.getPermissions(id);
      throw error;
    }
  },

  async addPermission(id: string, permissionId: string): Promise<void> {
    try {
      await apiClient.post(API_ENDPOINTS.ROLES.PERMISSIONS(id), {
        permission_id: permissionId,
      });
    } catch (error) {
      if (error instanceof MockInterceptError) return mockRoleApi.addPermission(id, permissionId);
      throw error;
    }
  },

  async removePermission(id: string, permissionId: string): Promise<void> {
    try {
      await apiClient.delete(API_ENDPOINTS.ROLES.PERMISSIONS(id), {
        data: { permission_id: permissionId },
      });
    } catch (error) {
      if (error instanceof MockInterceptError) return mockRoleApi.removePermission(id, permissionId);
      throw error;
    }
  },
};

export const permissionService = {
  async list(): Promise<Permission[]> {
    try {
      const response = await apiClient.get(API_ENDPOINTS.PERMISSIONS.LIST);
      return unwrapList<unknown>(response.data).map(normalizePermission);
    } catch (error) {
      if (error instanceof MockInterceptError) return mockRoleApi.listPermissions();
      throw error;
    }
  },

  async getById(id: string): Promise<Permission> {
    try {
      const response = await apiClient.get(API_ENDPOINTS.PERMISSIONS.DETAIL(id));
      return normalizePermission(unwrapData(response.data));
    } catch (error) {
      if (error instanceof MockInterceptError) return mockRoleApi.getPermissionById(id);
      throw error;
    }
  },

  async create(input: PermissionFormInput): Promise<Permission> {
    try {
      const response = await apiClient.post(API_ENDPOINTS.PERMISSIONS.CREATE, permissionPayload(input));
      return normalizePermission(unwrapData(response.data));
    } catch (error) {
      if (error instanceof MockInterceptError) return mockRoleApi.createPermission(input);
      throw error;
    }
  },

  async remove(id: string): Promise<void> {
    try {
      await apiClient.delete(API_ENDPOINTS.PERMISSIONS.DELETE(id));
    } catch (error) {
      if (error instanceof MockInterceptError) return mockRoleApi.deletePermission(id);
      throw error;
    }
  },
};

export const branchService = {
  async getBranches(query?: GetGroupsRequest): Promise<GetGroupsResponse> {
    try {
      const response = await apiClient.get(API_ENDPOINTS.BRANCHES.LIST, {
        params: queryParams(query),
      });
      const branches = unwrapList<unknown>(response.data).map(normalizeBranch);
      return { branches };
    } catch (error) {
      if (error instanceof MockInterceptError) {
        const branches = await mockBranchApi.list(query);
        return { branches };
      }
      throw error;
    }
  },

  async list(query?: ListQuery): Promise<Branch[]> {
    try {
      const response = await apiClient.get(API_ENDPOINTS.BRANCHES.LIST, {
        params: queryParams(query),
      });
      return unwrapList<unknown>(response.data).map(normalizeBranch);
    } catch (error) {
      if (error instanceof MockInterceptError) return mockBranchApi.list(query);
      throw error;
    }
  },

  async getById(id: string): Promise<Branch> {
    try {
      const response = await apiClient.get(API_ENDPOINTS.BRANCHES.DETAIL(id));
      return normalizeBranch(unwrapData(response.data));
    } catch (error) {
      if (error instanceof MockInterceptError) return mockBranchApi.getById(id);
      throw error;
    }
  },

  async create(input: BranchFormInput): Promise<Branch> {
    try {
      const response = await apiClient.post(API_ENDPOINTS.BRANCHES.CREATE, branchPayload(input));
      return normalizeBranch(unwrapData(response.data));
    } catch (error) {
      if (error instanceof MockInterceptError) return mockBranchApi.create(input);
      throw error;
    }
  },

  async update(id: string, input: BranchFormInput): Promise<Branch> {
    try {
      const response = await apiClient.put(API_ENDPOINTS.BRANCHES.UPDATE(id), branchPayload(input));
      return normalizeBranch(unwrapData(response.data));
    } catch (error) {
      if (error instanceof MockInterceptError) return mockBranchApi.update(id, input);
      throw error;
    }
  },

  async remove(id: string): Promise<void> {
    try {
      await apiClient.delete(API_ENDPOINTS.BRANCHES.DELETE(id));
    } catch (error) {
      if (error instanceof MockInterceptError) return mockBranchApi.remove(id);
      throw error;
    }
  },

  async getUsers(id: string, query?: ListQuery): Promise<ManagementUser[]> {
    try {
      const response = await apiClient.get(API_ENDPOINTS.BRANCHES.USERS(id), {
        params: queryParams(query),
      });
      return unwrapList<unknown>(response.data).map(normalizeUser);
    } catch (error) {
      if (error instanceof MockInterceptError) return mockBranchApi.getUsers(id, query);
      throw error;
    }
  },

  async assignUser(branchId: string, userId: string): Promise<void> {
    try {
      await apiClient.post(API_ENDPOINTS.BRANCHES.USERS(branchId), { user_id: userId });
    } catch (error) {
      if (error instanceof MockInterceptError) return mockBranchApi.assignUser(branchId, userId);
      throw error;
    }
  },

  async removeUser(branchId: string, userId: string): Promise<void> {
    try {
      await apiClient.delete(API_ENDPOINTS.BRANCHES.USER(branchId, userId));
    } catch (error) {
      if (error instanceof MockInterceptError) return mockBranchApi.removeUser(branchId, userId);
      throw error;
    }
  },
};

export const organizationService = {
  async getOrganizations(query?: GetOrganizationsRequest): Promise<GetOrganizationsResponse> {
    try {
      const response = await apiClient.get(API_ENDPOINTS.ORGANIZATIONS.LIST, {
        params: queryParams(query),
      });
      const organizations = unwrapList<unknown>(response.data).map(normalizeOrganization);
      return { organizations };
    } catch (error) {
      if (error instanceof MockInterceptError) {
        const organizations = await mockOrganizationApi.list(query);
        return { organizations };
      }
      throw error;
    }
  },

  async list(query?: ListQuery): Promise<Organization[]> {
    try {
      const response = await apiClient.get(API_ENDPOINTS.ORGANIZATIONS.LIST, {
        params: queryParams(query),
      });
      return unwrapList<unknown>(response.data).map(normalizeOrganization);
    } catch (error) {
      if (error instanceof MockInterceptError) return mockOrganizationApi.list(query);
      throw error;
    }
  },

  async getById(id: string): Promise<Organization> {
    try {
      const response = await apiClient.get(API_ENDPOINTS.ORGANIZATIONS.DETAIL(id));
      return normalizeOrganization(unwrapData(response.data));
    } catch (error) {
      if (error instanceof MockInterceptError) return mockOrganizationApi.getById(id);
      throw error;
    }
  },

  async create(input: OrganizationFormInput): Promise<Organization> {
    try {
      const response = await apiClient.post(API_ENDPOINTS.ORGANIZATIONS.CREATE, organizationPayload(input));
      return normalizeOrganization(unwrapData(response.data));
    } catch (error) {
      if (error instanceof MockInterceptError) return mockOrganizationApi.create(input);
      throw error;
    }
  },

  async update(id: string, input: OrganizationFormInput): Promise<Organization> {
    try {
      const response = await apiClient.put(API_ENDPOINTS.ORGANIZATIONS.UPDATE(id), organizationPayload(input));
      return normalizeOrganization(unwrapData(response.data));
    } catch (error) {
      if (error instanceof MockInterceptError) return mockOrganizationApi.update(id, input);
      throw error;
    }
  },

  async remove(id: string): Promise<void> {
    try {
      await apiClient.delete(API_ENDPOINTS.ORGANIZATIONS.DELETE(id));
    } catch (error) {
      if (error instanceof MockInterceptError) return mockOrganizationApi.remove(id);
      throw error;
    }
  },
};

export const siteService = {
  async getSites(query?: GetSitesRequest): Promise<GetSitesResponse> {
    try {
      const response = await apiClient.get(API_ENDPOINTS.SITES.LIST, {
        params: queryParams(query),
      });
      const sites = unwrapList<unknown>(response.data).map(normalizeSite);
      return { sites };
    } catch (error) {
      if (error instanceof MockInterceptError) {
        const sites = await mockSiteApi.list(query);
        return { sites };
      }
      throw error;
    }
  },

  async createSite(input: CreateSiteRequest): Promise<CreateSiteResponse> {
    try {
      const response = await apiClient.post(API_ENDPOINTS.SITES.CREATE, sitePayload(input));
      return normalizeSite(unwrapData(response.data));
    } catch (error) {
      if (error instanceof MockInterceptError) return mockSiteApi.create(input);
      throw error;
    }
  },

  async updateSite(id: string, input: UpdateSiteRequest): Promise<UpdateSiteResponse> {
    try {
      const response = await apiClient.put(API_ENDPOINTS.SITES.UPDATE(id), sitePayload(input));
      return normalizeSite(unwrapData(response.data));
    } catch (error) {
      if (error instanceof MockInterceptError) return mockSiteApi.update(id, input);
      throw error;
    }
  },

  async deleteSite(id: string): Promise<void> {
    try {
      await apiClient.delete(API_ENDPOINTS.SITES.DELETE(id));
    } catch (error) {
      if (error instanceof MockInterceptError) return mockSiteApi.remove(id);
      throw error;
    }
  },

  async list(query?: ListQuery): Promise<Site[]> {
    try {
      const response = await apiClient.get(API_ENDPOINTS.SITES.LIST, {
        params: queryParams(query),
      });
      return unwrapList<unknown>(response.data).map(normalizeSite);
    } catch (error) {
      if (error instanceof MockInterceptError) return mockSiteApi.list(query);
      throw error;
    }
  },

  async getById(id: string): Promise<Site> {
    try {
      const response = await apiClient.get(API_ENDPOINTS.SITES.DETAIL(id));
      return normalizeSite(unwrapData(response.data));
    } catch (error) {
      if (error instanceof MockInterceptError) return mockSiteApi.getById(id);
      throw error;
    }
  },

  async create(input: SiteFormInput): Promise<Site> {
    try {
      const response = await apiClient.post(API_ENDPOINTS.SITES.CREATE, sitePayload(input));
      return normalizeSite(unwrapData(response.data));
    } catch (error) {
      if (error instanceof MockInterceptError) return mockSiteApi.create(input);
      throw error;
    }
  },

  async update(id: string, input: SiteFormInput): Promise<Site> {
    try {
      const response = await apiClient.put(API_ENDPOINTS.SITES.UPDATE(id), sitePayload(input));
      return normalizeSite(unwrapData(response.data));
    } catch (error) {
      if (error instanceof MockInterceptError) return mockSiteApi.update(id, input);
      throw error;
    }
  },

  async remove(id: string): Promise<void> {
    try {
      await apiClient.delete(API_ENDPOINTS.SITES.DELETE(id));
    } catch (error) {
      if (error instanceof MockInterceptError) return mockSiteApi.remove(id);
      throw error;
    }
  },
};
