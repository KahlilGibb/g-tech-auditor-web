import { create } from 'zustand';
import { getApiErrorMessage } from '../lib/apiResponse';
import { permissionService, roleService } from '../services/managementService';
import type { Permission, Role, RoleFormInput } from '../types/management';

interface RoleStoreState {
  roles: Role[];
  permissions: Permission[];
  permissionsByRoleId: Record<string, Permission[]>;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  fetchRoles: () => Promise<void>;
  createRole: (input: RoleFormInput) => Promise<void>;
  updateRole: (id: string, input: RoleFormInput) => Promise<void>;
  deleteRole: (id: string) => Promise<void>;
  fetchPermissions: () => Promise<void>;
  fetchRolePermissions: (id: string) => Promise<void>;
  addPermissionToRole: (roleId: string, permissionId: string) => Promise<void>;
  removePermissionFromRole: (roleId: string, permissionId: string) => Promise<void>;
  clearError: () => void;
}

export const useRoleStore = create<RoleStoreState>()((set, get) => ({
  roles: [],
  permissions: [],
  permissionsByRoleId: {},
  isLoading: false,
  isSaving: false,
  error: null,

  fetchRoles: async () => {
    set({ isLoading: true, error: null });
    try {
      const roles = await roleService.list();
      set({ roles, isLoading: false });
    } catch (error) {
      set({ isLoading: false, error: getApiErrorMessage(error, 'Failed to load roles') });
    }
  },

  createRole: async input => {
    set({ isSaving: true, error: null });
    try {
      const role = await roleService.create(input);
      set(state => ({ roles: [role, ...state.roles], isSaving: false }));
    } catch (error) {
      set({ isSaving: false, error: getApiErrorMessage(error, 'Failed to create role') });
      throw error;
    }
  },

  updateRole: async (id, input) => {
    set({ isSaving: true, error: null });
    try {
      const role = await roleService.update(id, input);
      set(state => ({
        roles: state.roles.map(item => (item.id === id ? role : item)),
        isSaving: false,
      }));
    } catch (error) {
      set({ isSaving: false, error: getApiErrorMessage(error, 'Failed to update role') });
      throw error;
    }
  },

  deleteRole: async id => {
    const snapshot = get().roles;
    set({ roles: snapshot.filter(role => role.id !== id), error: null });
    try {
      await roleService.remove(id);
    } catch (error) {
      set({ roles: snapshot, error: getApiErrorMessage(error, 'Failed to delete role') });
      throw error;
    }
  },

  fetchPermissions: async () => {
    try {
      const permissions = await permissionService.list();
      set({ permissions });
    } catch (error) {
      set({ error: getApiErrorMessage(error, 'Failed to load permissions') });
    }
  },

  fetchRolePermissions: async id => {
    try {
      const permissions = await roleService.getPermissions(id);
      set(state => ({
        permissionsByRoleId: { ...state.permissionsByRoleId, [id]: permissions },
      }));
    } catch (error) {
      set({ error: getApiErrorMessage(error, 'Failed to load role permissions') });
    }
  },

  addPermissionToRole: async (roleId, permissionId) => {
    try {
      await roleService.addPermission(roleId, permissionId);
      const permissions = await roleService.getPermissions(roleId);
      set(state => ({
        permissionsByRoleId: { ...state.permissionsByRoleId, [roleId]: permissions },
      }));
    } catch (error) {
      set({ error: getApiErrorMessage(error, 'Failed to add role permission') });
      throw error;
    }
  },

  removePermissionFromRole: async (roleId, permissionId) => {
    const snapshot = get().permissionsByRoleId[roleId] ?? [];
    set(state => ({
      permissionsByRoleId: {
        ...state.permissionsByRoleId,
        [roleId]: snapshot.filter(permission => permission.id !== permissionId),
      },
    }));
    try {
      await roleService.removePermission(roleId, permissionId);
    } catch (error) {
      set(state => ({
        permissionsByRoleId: { ...state.permissionsByRoleId, [roleId]: snapshot },
        error: getApiErrorMessage(error, 'Failed to remove role permission'),
      }));
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));
