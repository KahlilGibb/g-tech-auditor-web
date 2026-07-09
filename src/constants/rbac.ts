import type { AuthPermission } from '../types/auth';
import type { Permission } from '../types/management';

export type PermissionAction =
  | 'read'
  | 'create'
  | 'update'
  | 'delete'
  | 'write'
  | 'submit'
  | 'export'
  | 'publish'
  | 'assign'
  | 'share'
  | 'manage';

export interface PermissionRequirement {
  resource: string;
  action?: PermissionAction | string;
}

export interface NavPermissionRequirement extends PermissionRequirement {
  fallback?: PermissionRequirement[];
}

export const READ_ACTION = 'read';

export const NAV_PERMISSIONS = {
  inspections: { resource: 'inspections', action: 'read' },
  inspectionSession: { resource: 'inspections', action: 'submit' },
  templates: { resource: 'templates', action: 'read' },
  templateBuilder: { resource: 'templates', action: 'write' },
  masterFields: { resource: 'templates', action: 'write' },
  documents: { resource: 'documents', action: 'read' },
  actions: { resource: 'actions', action: 'read' },
  cps: { resource: 'cps', action: 'read', fallback: [{ resource: 'inspections', action: 'read' }] },
  training: { resource: 'training', action: 'read' },
  users: { resource: 'users', action: 'read' },
  roles: { resource: 'roles', action: 'read' },
  permissions: {
    resource: 'permissions',
    action: 'read',
    fallback: [{ resource: 'roles', action: 'read' }],
  },
  organizations: { resource: 'organizations', action: 'read' },
  branches: { resource: 'branches', action: 'read' },
  sites: { resource: 'sites', action: 'read' },
  actionStatuses: {
    resource: 'action-statuses',
    action: 'read',
    fallback: [{ resource: 'actions', action: 'read' }],
  },
  trashBin: {
    resource: 'users',
    action: 'read',
  },
} satisfies Record<string, NavPermissionRequirement>;

export const isAdminRole = (role?: string | null) => {
  if (!role) return false;
  return [
    'admin',
    'administrator',
    'super admin',
    'superadmin',
    'platform_admin',
    'org_admin',
  ].includes(role.toLowerCase());
};

export const getPermissionKey = (permission: AuthPermission | Permission) => {
  const name = permission.name?.trim();
  if (name) return name.toLowerCase();

  const resource = permission.resource?.trim();
  const action = permission.action?.trim();
  if (!resource || !action) return '';

  return `${resource}:${action}`.toLowerCase();
};

const buildPermissionKey = (resource: string, action = READ_ACTION) =>
  `${resource}:${action}`.toLowerCase();

const getFallbackKeys = (resource: string, action = READ_ACTION) => {
  const normalizedResource = resource.toLowerCase();
  const normalizedAction = action.toLowerCase();
  const keys = new Set<string>([
    buildPermissionKey(normalizedResource, normalizedAction),
    buildPermissionKey(normalizedResource, 'manage'),
  ]);

  if (normalizedAction === 'read') {
    ['write', 'create', 'update', 'delete', 'submit', 'publish', 'export', 'assign', 'share'].forEach(
      fallbackAction => keys.add(buildPermissionKey(normalizedResource, fallbackAction)),
    );
  }

  if (['create', 'update', 'delete', 'submit', 'publish', 'export', 'assign', 'share'].includes(normalizedAction)) {
    keys.add(buildPermissionKey(normalizedResource, 'write'));
  }

  return keys;
};

export const hasPermission = (
  permissions: Array<AuthPermission | Permission>,
  requirement: PermissionRequirement,
) => {
  const resource = requirement.resource.trim().toLowerCase();
  const action = (requirement.action ?? READ_ACTION).trim().toLowerCase();
  if (!resource) return true;

  const ownedKeys = new Set(
    permissions
      .map(permission => getPermissionKey(permission))
      .filter(Boolean),
  );

  for (const key of getFallbackKeys(resource, action)) {
    if (ownedKeys.has(key)) return true;
  }

  return false;
};
