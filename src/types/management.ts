export type EntityStatus = 'active' | 'inactive' | 'archived' | string;

export interface ListQuery {
  page?: number;
  limit?: number;
  search?: string;
}

export interface ManagementUser {
  id: string;
  username: string;
  email: string;
  name: string;
  roleName: string;
  roleId?: string;
  branchId?: string;
  groupId?: string;
  orgId?: string;
  status?: EntityStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserFormInput {
  username: string;
  email: string;
  name: string;
  password?: string;
  roleName: string;
  roleId?: string;
  groupId?: string;
  orgId?: string;
  status?: EntityStatus;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  status?: EntityStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface RoleFormInput {
  name: string;
  description?: string;
}

export interface Permission {
  id: string;
  name: string;
  resource?: string;
  action?: string;
}

export interface PermissionFormInput {
  name: string;
  resource: string;
  action: string;
}

export interface Branch {
  id: string;
  name: string;
  code: string;
  address: string;
  orgId?: string;
  status?: EntityStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface BranchFormInput {
  name: string;
  code: string;
  address: string;
  status?: EntityStatus;
}

export interface Organization {
  id: string;
  name: string;
  code: string;
  address?: string;
  phone?: string;
  email?: string;
  status?: EntityStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface OrganizationFormInput {
  name: string;
  code: string;
  address?: string;
  phone?: string;
  email?: string;
  status?: EntityStatus;
}

export interface Site {
  id: string;
  name: string;
  code: string;
  address?: string;
  organizationId?: string;
  organizationName?: string;
  branchId?: string;
  branchName?: string;
  status?: EntityStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface SiteFormInput {
  name: string;
  code: string;
  address?: string;
  organizationId?: string;
  branchId?: string;
  status?: EntityStatus;
}

export interface GetOrganizationsRequest extends ListQuery {}
export interface GetOrganizationsResponse {
  organizations: Organization[];
}

export interface GetGroupsRequest extends ListQuery {}
export interface GetGroupsResponse {
  branches: Branch[];
}

export interface GetSitesRequest extends ListQuery {}
export interface GetSitesResponse {
  sites: Site[];
}

export interface CreateSiteRequest extends SiteFormInput {}
export interface CreateSiteResponse extends Site {}

export interface UpdateSiteRequest extends SiteFormInput {}
export interface UpdateSiteResponse extends Site {}

