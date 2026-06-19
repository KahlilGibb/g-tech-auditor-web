import { useCallback, useEffect, useMemo } from 'react';
import { hasPermission, isAdminRole, READ_ACTION, type PermissionRequirement } from '../constants/rbac';
import { useAuth } from './useAuth';
import { useRoleStore } from '../stores/roleStore';

export const useRbac = () => {
  const { user, isAuthenticated } = useAuth();
  const permissionsByRoleId = useRoleStore(state => state.permissionsByRoleId);
  const fetchRolePermissions = useRoleStore(state => state.fetchRolePermissions);

  const isAdmin = isAdminRole(user?.role);
  const roleId = user?.roleId;
  const rolePermissions = roleId ? permissionsByRoleId[roleId] : undefined;
  const isLoadingPermissions = Boolean(isAuthenticated && roleId && !rolePermissions && !isAdmin);

  useEffect(() => {
    if (!isAuthenticated || !roleId || rolePermissions || isAdmin) return;

    void fetchRolePermissions(roleId);
  }, [fetchRolePermissions, isAdmin, isAuthenticated, roleId, rolePermissions]);

  const permissions = useMemo(
    () => [...(user?.permissions ?? []), ...(rolePermissions ?? [])],
    [rolePermissions, user?.permissions],
  );

  const can = useCallback(
    (resourceOrRequirement: string | PermissionRequirement, action = READ_ACTION) => {
      if (!isAuthenticated) return false;
      if (isAdmin) return true;

      const requirement =
        typeof resourceOrRequirement === 'string'
          ? { resource: resourceOrRequirement, action }
          : resourceOrRequirement;

      return hasPermission(permissions, requirement);
    },
    [isAdmin, isAuthenticated, permissions],
  );

  const canAny = useCallback(
    (requirements: PermissionRequirement[]) => requirements.some(requirement => can(requirement)),
    [can],
  );

  const canRequirement = useCallback(
    (requirement?: PermissionRequirement & { fallback?: PermissionRequirement[] }) => {
      if (!requirement) return true;
      return can(requirement) || canAny(requirement.fallback ?? []);
    },
    [can, canAny],
  );

  return {
    can,
    canAny,
    canRequirement,
    isAdmin,
    isLoadingPermissions,
    permissions,
  };
};
