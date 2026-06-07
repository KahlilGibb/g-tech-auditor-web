import type { AuthUser } from '../types/auth';
import type {
  Branch,
  BranchFormInput,
  ListQuery,
  ManagementUser,
  Permission,
  Role,
  RoleFormInput,
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
