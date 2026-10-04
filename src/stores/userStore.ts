import { create } from 'zustand';
import { getApiErrorMessage } from '../lib/apiResponse';
import { userService } from '../services/managementService';
import type { ListQuery, ManagementUser, UserFormInput } from '../types/management';

interface UserStoreState {
  users: ManagementUser[];
  total: number;
  page: number;
  limit: number;
  lastQuery: ListQuery;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  fetchUsers: (query?: ListQuery) => Promise<void>;
  createUser: (input: UserFormInput) => Promise<void>;
  updateUser: (id: string, input: UserFormInput) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  provisionGotify: (id: string) => Promise<void>;
  reconcileGotify: () => Promise<void>;
  logoutAllDevices: (id: string) => Promise<void>;
  clearError: () => void;
}

let latestUserRequest = 0;

export const useUserStore = create<UserStoreState>()((set, get) => ({
  users: [],
  total: 0,
  page: 1,
  limit: 20,
  lastQuery: { page: 1, limit: 20 },
  isLoading: false,
  isSaving: false,
  error: null,

  fetchUsers: async query => {
    const requestId = ++latestUserRequest;
    const resolvedQuery = {
      page: query?.page ?? 1,
      limit: query?.limit ?? 20,
      search: query?.search?.trim() || undefined,
    };
    set({ isLoading: true, error: null });
    try {
      const result = await userService.list(resolvedQuery);
      const withDeviceCounts = await Promise.all(result.items.map(async user => ({
        ...user,
        activeDeviceCount: await userService.getActiveDeviceCount(user.id).catch(() => undefined),
      })));
      if (requestId !== latestUserRequest) return;
      set({
        users: withDeviceCounts,
        total: result.meta.total,
        page: result.meta.page,
        limit: result.meta.limit,
        lastQuery: resolvedQuery,
        isLoading: false,
      });
    } catch (error) {
      if (requestId !== latestUserRequest) return;
      set({ isLoading: false, error: getApiErrorMessage(error, 'Failed to load users') });
    }
  },

  createUser: async input => {
    set({ isSaving: true, error: null });
    try {
      await userService.create(input);
      set({ isSaving: false });
      await get().fetchUsers(get().lastQuery);
    } catch (error) {
      set({ isSaving: false, error: getApiErrorMessage(error, 'Failed to create user') });
      throw error;
    }
  },

  updateUser: async (id, input) => {
    set({ isSaving: true, error: null });
    try {
      const user = await userService.update(id, input);
      set(state => ({
        users: state.users.map(item => (
          item.id === id ? { ...user, activeDeviceCount: item.activeDeviceCount } : item
        )),
        isSaving: false,
      }));
    } catch (error) {
      set({ isSaving: false, error: getApiErrorMessage(error, 'Failed to update user') });
      throw error;
    }
  },

  deleteUser: async id => {
    const snapshot = get().users;
    const previousTotal = get().total;
    set({
      users: snapshot.filter(user => user.id !== id),
      total: Math.max(0, previousTotal - 1),
      error: null,
    });
    try {
      await userService.remove(id);
    } catch (error) {
      set({ users: snapshot, total: previousTotal, error: getApiErrorMessage(error, 'Failed to delete user') });
      throw error;
    }
  },

  provisionGotify: async id => {
    set({ isSaving: true, error: null });
    try {
      await userService.provisionGotify(id);
      set({ isSaving: false });
    } catch (error) {
      set({ isSaving: false, error: getApiErrorMessage(error, 'Failed to provision Gotify') });
      throw error;
    }
  },

  reconcileGotify: async () => {
    set({ isSaving: true, error: null });
    try {
      await userService.reconcileGotify();
      set({ isSaving: false });
    } catch (error) {
      set({ isSaving: false, error: getApiErrorMessage(error, 'Failed to reconcile Gotify') });
      throw error;
    }
  },

  logoutAllDevices: async id => {
    set({ isSaving: true, error: null });
    try {
      await userService.logoutAllDevices(id);
      set(state => ({
        users: state.users.map(user => user.id === id ? { ...user, activeDeviceCount: 0 } : user),
        isSaving: false,
      }));
    } catch (error) {
      set({ isSaving: false, error: getApiErrorMessage(error, 'Failed to logout user devices') });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));
