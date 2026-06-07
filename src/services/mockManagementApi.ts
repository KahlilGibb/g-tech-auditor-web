import type { AuthUser } from '../types/auth';
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
} from '../types/management';

const wait = (ms = 250) => new Promise<void>(resolve => setTimeout(resolve, ms));
const id = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
const now = () => new Date().toISOString();

let roles: Role[] = [
  {
    id: 'role-admin',
    name: 'admin',
    description: 'Full access to administration and inspection modules.',
    status: 'active',
    createdAt: '2026-01-10T08:00:00Z',
  },
  {
    id: 'role-manager',
    name: 'manager',
    description: 'Can manage branches, inspections, and corrective actions.',
    status: 'active',
    createdAt: '2026-01-12T08:00:00Z',
  },
  {
    id: 'role-inspector',
    name: 'inspector',
    description: 'Can conduct inspections and submit field findings.',
    status: 'active',
    createdAt: '2026-01-15T08:00:00Z',
  },
];

const permissions: Permission[] = [
  { id: 'perm-users-read', name: 'users:read', resource: 'users', action: 'read' },
  { id: 'perm-users-write', name: 'users:write', resource: 'users', action: 'write' },
  { id: 'perm-roles-read', name: 'roles:read', resource: 'roles', action: 'read' },
  { id: 'perm-branches-write', name: 'branches:write', resource: 'branches', action: 'write' },
  { id: 'perm-inspections-submit', name: 'inspections:submit', resource: 'inspections', action: 'submit' },
];

const rolePermissions: Record<string, string[]> = {
  'role-admin': permissions.map(permission => permission.id),
  'role-manager': ['perm-users-read', 'perm-roles-read', 'perm-branches-write', 'perm-inspections-submit'],
  'role-inspector': ['perm-inspections-submit'],
};

let users: ManagementUser[] = [
  {
    id: 'user-admin',
    username: 'admin',
    email: 'admin@example.com',
    name: 'Admin Auditor',
    roleName: 'admin',
    roleId: 'role-admin',
    branchId: 'branch-sunter',
    groupId: 'branch-sunter',
    status: 'active',
    createdAt: '2026-01-10T08:00:00Z',
  },
  {
    id: 'user-riko',
    username: 'riko',
    email: 'riko.pratama@example.com',
    name: 'Riko Pratama',
    roleName: 'inspector',
    roleId: 'role-inspector',
    branchId: 'branch-sunter',
    groupId: 'branch-sunter',
    status: 'active',
    createdAt: '2026-02-04T09:00:00Z',
  },
  {
    id: 'user-dina',
    username: 'dina',
    email: 'dina.wicaksana@example.com',
    name: 'Dina Wicaksana',
    roleName: 'manager',
    roleId: 'role-manager',
    branchId: 'branch-bsd',
    groupId: 'branch-bsd',
    status: 'active',
    createdAt: '2026-02-14T09:00:00Z',
  },
  {
    id: 'user-arif',
    username: 'arif',
    email: 'arif.nugraha@example.com',
    name: 'Arif Nugraha',
    roleName: 'inspector',
    roleId: 'role-inspector',
    branchId: 'branch-pik',
    groupId: 'branch-pik',
    status: 'inactive',
    createdAt: '2026-03-01T09:00:00Z',
  },
];

let branches: Branch[] = [
  {
    id: 'branch-sunter',
    name: 'Dealer Sunter',
    code: 'DLR-SNT',
    address: 'Jl. Danau Sunter Selatan No. 10, Jakarta Utara',
    status: 'active',
    createdAt: '2026-01-08T08:00:00Z',
  },
  {
    id: 'branch-bsd',
    name: 'Dealer Audi VW BSD',
    code: 'DLR-BSD',
    address: 'Jl. BSD Grand Boulevard, Tangerang Selatan',
    status: 'active',
    createdAt: '2026-01-09T08:00:00Z',
  },
  {
    id: 'branch-pik',
    name: 'Dealer KIA PIK',
    code: 'DLR-PIK',
    address: 'Pantai Indah Kapuk, Jakarta Utara',
    status: 'active',
    createdAt: '2026-01-11T08:00:00Z',
  },
];

let organizations: Organization[] = [
  {
    id: 'org-gtech-demo',
    name: 'G-Tech Automotive',
    code: 'GTECH',
    address: 'Jakarta, Indonesia',
    phone: '+62 21 555 0101',
    email: 'ops@gtech.example',
    status: 'active',
    createdAt: '2026-01-05T08:00:00Z',
  },
  {
    id: 'org-dealer-network',
    name: 'Dealer Network Group',
    code: 'DNG',
    address: 'Tangerang Selatan, Indonesia',
    phone: '+62 21 555 0102',
    email: 'network@gtech.example',
    status: 'active',
    createdAt: '2026-01-06T08:00:00Z',
  },
];

let sites: Site[] = [
  {
    id: 'site-sunter-workshop',
    name: 'Sunter Workshop',
    code: 'SNT-WS',
    address: 'Area bengkel Dealer Sunter',
    organizationId: 'org-gtech-demo',
    organizationName: 'G-Tech Automotive',
    branchId: 'branch-sunter',
    branchName: 'Dealer Sunter',
    status: 'active',
    createdAt: '2026-01-12T08:00:00Z',
  },
  {
    id: 'site-bsd-showroom',
    name: 'BSD Showroom',
    code: 'BSD-SR',
    address: 'Area showroom Dealer Audi VW BSD',
    organizationId: 'org-dealer-network',
    organizationName: 'Dealer Network Group',
    branchId: 'branch-bsd',
    branchName: 'Dealer Audi VW BSD',
    status: 'active',
    createdAt: '2026-01-13T08:00:00Z',
  },
];

function filterBySearch<T extends object>(items: T[], query?: ListQuery) {
  const keyword = query?.search?.trim().toLowerCase();
  if (!keyword) return items;

  return items.filter(item =>
    Object.values(item as Record<string, unknown>)
      .join(' ')
      .toLowerCase()
      .includes(keyword),
  );
}

function findRoleByName(name: string) {
  return roles.find(role => role.name.toLowerCase() === name.toLowerCase());
}

function normalizeUserInput(input: UserFormInput, existing?: ManagementUser): ManagementUser {
  const role = input.roleId
    ? roles.find(item => item.id === input.roleId)
    : findRoleByName(input.roleName);

  return {
    id: existing?.id ?? id('user'),
    username: input.username,
    email: input.email,
    name: input.name,
    roleName: role?.name ?? input.roleName,
    roleId: role?.id ?? input.roleId,
    branchId: input.groupId ?? existing?.branchId,
    groupId: input.groupId ?? existing?.groupId ?? existing?.branchId,
    orgId: input.orgId ?? existing?.orgId,
    status: input.status ?? existing?.status ?? 'active',
    createdAt: existing?.createdAt ?? now(),
    updatedAt: now(),
  };
}

function authUserFromManagementUser(user: ManagementUser): AuthUser {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    name: user.name,
    role: user.roleName,
    roleId: user.roleId,
    branchId: user.branchId,
    groupId: user.groupId ?? user.branchId,
    orgId: 'org-gtech-demo',
  };
}

export const mockAuthApi = {
  async login(email: string, password: string) {
    void password;
    await wait();
    const user = users.find(item => item.email.toLowerCase() === email.toLowerCase()) ?? users[0];
    return {
      user: authUserFromManagementUser(user),
      tokens: {
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
      },
    };
  },

  async getMe() {
    await wait(120);
    return authUserFromManagementUser(users[0]);
  },

  async logout() {
    await wait(120);
  },
};

export const mockUserApi = {
  async list(query?: ListQuery) {
    await wait();
    return filterBySearch(users, query);
  },

  async getById(userId: string) {
    await wait();
    const user = users.find(item => item.id === userId);
    if (!user) throw new Error('Mock user not found');
    return user;
  },

  async create(input: UserFormInput) {
    await wait();
    const user = normalizeUserInput(input);
    users = [user, ...users];
    return user;
  },

  async update(userId: string, input: UserFormInput) {
    await wait();
    const current = users.find(item => item.id === userId);
    if (!current) throw new Error('Mock user not found');
    const user = normalizeUserInput(input, current);
    users = users.map(item => (item.id === userId ? user : item));
    return user;
  },

  async remove(userId: string) {
    await wait();
    users = users.filter(user => user.id !== userId);
  },
};

export const mockRoleApi = {
  async list() {
    await wait();
    return [...roles];
  },

  async getById(roleId: string) {
    await wait();
    const role = roles.find(item => item.id === roleId);
    if (!role) throw new Error('Mock role not found');
    return role;
  },

  async create(input: RoleFormInput) {
    await wait();
    const role: Role = {
      id: id('role'),
      name: input.name,
      description: input.description,
      status: 'active',
      createdAt: now(),
      updatedAt: now(),
    };
    roles = [role, ...roles];
    rolePermissions[role.id] = [];
    return role;
  },

  async update(roleId: string, input: RoleFormInput) {
    await wait();
    const current = roles.find(item => item.id === roleId);
    if (!current) throw new Error('Mock role not found');
    const role: Role = { ...current, ...input, updatedAt: now() };
    roles = roles.map(item => (item.id === roleId ? role : item));
    users = users.map(user =>
      user.roleId === roleId ? { ...user, roleName: role.name, updatedAt: now() } : user,
    );
    return role;
  },

  async remove(roleId: string) {
    await wait();
    roles = roles.filter(role => role.id !== roleId);
    delete rolePermissions[roleId];
  },

  async getPermissions(roleId: string) {
    await wait();
    const permissionIds = rolePermissions[roleId] ?? [];
    return permissions.filter(permission => permissionIds.includes(permission.id));
  },

  async addPermission(roleId: string, permissionId: string) {
    await wait();
    const current = rolePermissions[roleId] ?? [];
    if (!current.includes(permissionId)) {
      rolePermissions[roleId] = [...current, permissionId];
    }
  },

  async removePermission(roleId: string, permissionId: string) {
    await wait();
    rolePermissions[roleId] = (rolePermissions[roleId] ?? []).filter(id => id !== permissionId);
  },

  async listPermissions() {
    await wait();
    return [...permissions];
  },

  async getPermissionById(permissionId: string) {
    await wait();
    const permission = permissions.find(item => item.id === permissionId);
    if (!permission) throw new Error('Mock permission not found');
    return permission;
  },

  async createPermission(input: PermissionFormInput) {
    await wait();
    const permission: Permission = {
      id: id('perm'),
      name: input.name,
      resource: input.resource,
      action: input.action,
    };
    permissions.push(permission);
    return permission;
  },

  async deletePermission(permissionId: string) {
    await wait();
    const index = permissions.findIndex(permission => permission.id === permissionId);
    if (index === -1) throw new Error('Mock permission not found');
    permissions.splice(index, 1);
    for (const roleId of Object.keys(rolePermissions)) {
      rolePermissions[roleId] = rolePermissions[roleId].filter(id => id !== permissionId);
    }
  },
};

export const mockBranchApi = {
  async list(query?: ListQuery) {
    await wait();
    return filterBySearch(branches, query);
  },

  async getById(branchId: string) {
    await wait();
    const branch = branches.find(item => item.id === branchId);
    if (!branch) throw new Error('Mock branch not found');
    return branch;
  },

  async create(input: BranchFormInput) {
    await wait();
    const branch: Branch = {
      id: id('branch'),
      name: input.name,
      code: input.code,
      address: input.address,
      status: input.status ?? 'active',
      createdAt: now(),
      updatedAt: now(),
    };
    branches = [branch, ...branches];
    return branch;
  },

  async update(branchId: string, input: BranchFormInput) {
    await wait();
    const current = branches.find(item => item.id === branchId);
    if (!current) throw new Error('Mock branch not found');
    const branch: Branch = { ...current, ...input, updatedAt: now() };
    branches = branches.map(item => (item.id === branchId ? branch : item));
    return branch;
  },

  async remove(branchId: string) {
    await wait();
    branches = branches.filter(branch => branch.id !== branchId);
    users = users.map(user =>
      user.branchId === branchId || user.groupId === branchId
        ? { ...user, branchId: undefined, groupId: undefined, updatedAt: now() }
        : user,
    );
  },

  async getUsers(branchId: string, query?: ListQuery) {
    await wait();
    return filterBySearch(
      users.filter(user => user.branchId === branchId || user.groupId === branchId),
      query,
    );
  },

  async assignUser(branchId: string, userId: string) {
    await wait();
    users = users.map(user =>
      user.id === userId ? { ...user, branchId, groupId: branchId, updatedAt: now() } : user,
    );
  },

  async removeUser(branchId: string, userId: string) {
    await wait();
    users = users.map(user =>
      user.id === userId && (user.branchId === branchId || user.groupId === branchId)
        ? { ...user, branchId: undefined, groupId: undefined, updatedAt: now() }
        : user,
    );
  },
};

export const mockOrganizationApi = {
  async list(query?: ListQuery) {
    await wait();
    return filterBySearch(organizations, query);
  },

  async getById(organizationId: string) {
    await wait();
    const organization = organizations.find(item => item.id === organizationId);
    if (!organization) throw new Error('Mock organization not found');
    return organization;
  },

  async create(input: OrganizationFormInput) {
    await wait();
    const organization: Organization = {
      id: id('org'),
      ...input,
      status: input.status ?? 'active',
      createdAt: now(),
      updatedAt: now(),
    };
    organizations = [organization, ...organizations];
    return organization;
  },

  async update(organizationId: string, input: OrganizationFormInput) {
    await wait();
    const current = organizations.find(item => item.id === organizationId);
    if (!current) throw new Error('Mock organization not found');
    const organization: Organization = { ...current, ...input, updatedAt: now() };
    organizations = organizations.map(item => (item.id === organizationId ? organization : item));
    sites = sites.map(site =>
      site.organizationId === organizationId
        ? { ...site, organizationName: organization.name, updatedAt: now() }
        : site,
    );
    return organization;
  },

  async remove(organizationId: string) {
    await wait();
    organizations = organizations.filter(organization => organization.id !== organizationId);
    sites = sites.map(site =>
      site.organizationId === organizationId
        ? { ...site, organizationId: undefined, organizationName: undefined, updatedAt: now() }
        : site,
    );
  },
};

export const mockSiteApi = {
  async list(query?: ListQuery) {
    await wait();
    return filterBySearch(sites, query);
  },

  async getById(siteId: string) {
    await wait();
    const site = sites.find(item => item.id === siteId);
    if (!site) throw new Error('Mock site not found');
    return site;
  },

  async create(input: SiteFormInput) {
    await wait();
    const organization = organizations.find(item => item.id === input.organizationId);
    const branch = branches.find(item => item.id === input.branchId);
    const site: Site = {
      id: id('site'),
      ...input,
      organizationName: organization?.name,
      branchName: branch?.name,
      status: input.status ?? 'active',
      createdAt: now(),
      updatedAt: now(),
    };
    sites = [site, ...sites];
    return site;
  },

  async update(siteId: string, input: SiteFormInput) {
    await wait();
    const current = sites.find(item => item.id === siteId);
    if (!current) throw new Error('Mock site not found');
    const organization = organizations.find(item => item.id === input.organizationId);
    const branch = branches.find(item => item.id === input.branchId);
    const site: Site = {
      ...current,
      ...input,
      organizationName: organization?.name,
      branchName: branch?.name,
      updatedAt: now(),
    };
    sites = sites.map(item => (item.id === siteId ? site : item));
    return site;
  },

  async remove(siteId: string) {
    await wait();
    sites = sites.filter(site => site.id !== siteId);
  },
};
