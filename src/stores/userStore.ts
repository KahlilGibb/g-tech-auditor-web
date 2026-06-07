import { create } from 'zustand';
import { getApiErrorMessage } from '../lib/apiResponse';
import { userService } from '../services/managementService';
import type { ListQuery, ManagementUser, UserFormInput } from '../types/management';

interface UserStoreState {
  users: ManagementUser[];
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  fetchUsers: (query?: ListQuery) => Promise<void>;
  createUser: (input: UserFormInput) => Promise<void>;
  updateUser: (id: string, input: UserFormInput) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  clearError: () => void;
}

export const useUserStore = create<UserStoreState>()((set, get) => ({
  users: [],
  isLoading: false,
  isSaving: false,
  error: null,

  fetchUsers: async query => {
    set({ isLoading: true, error: null });
    try {
      const users = await userService.list(query);
      set({ users, isLoading: false });
    } catch (error) {
      set({ isLoading: false, error: getApiErrorMessage(error, 'Failed to load users') });
    }
  },

  createUser: async input => {
    set({ isSaving: true, error: null });
    try {
      const user = await userService.create(input);
      set(state => ({ users: [user, ...state.users], isSaving: false }));
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
        users: state.users.map(item => (item.id === id ? user : item)),
        isSaving: false,
      }));
    } catch (error) {
      set({ isSaving: false, error: getApiErrorMessage(error, 'Failed to update user') });
      throw error;
    }
  },

  deleteUser: async id => {
    const snapshot = get().users;
    set({ users: snapshot.filter(user => user.id !== id), error: null });
    try {
      await userService.remove(id);
    } catch (error) {
      set({ users: snapshot, error: getApiErrorMessage(error, 'Failed to delete user') });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));
