import { create } from 'zustand';
import { getApiErrorMessage } from '../lib/apiResponse';
import { branchService } from '../services/managementService';
import type { Branch, BranchFormInput, ListQuery, ManagementUser } from '../types/management';

interface BranchStoreState {
  branches: Branch[];
  branchUsers: ManagementUser[];
  selectedBranchId: string | null;
  isLoading: boolean;
  isSaving: boolean;
  isLoadingUsers: boolean;
  error: string | null;
  fetchBranches: (query?: ListQuery) => Promise<void>;
  createBranch: (input: BranchFormInput) => Promise<void>;
  updateBranch: (id: string, input: BranchFormInput) => Promise<void>;
  deleteBranch: (id: string) => Promise<void>;
  selectBranch: (id: string | null) => void;
  fetchBranchUsers: (id: string) => Promise<void>;
  assignUserToBranch: (branchId: string, userId: string) => Promise<void>;
  removeUserFromBranch: (branchId: string, userId: string) => Promise<void>;
  clearError: () => void;
}

export const useBranchStore = create<BranchStoreState>()((set, get) => ({
  branches: [],
  branchUsers: [],
  selectedBranchId: null,
  isLoading: false,
  isSaving: false,
  isLoadingUsers: false,
  error: null,

  fetchBranches: async query => {
    set({ isLoading: true, error: null });
    try {
      const branches = await branchService.list(query);
      set({ branches, isLoading: false });
    } catch (error) {
      set({ isLoading: false, error: getApiErrorMessage(error, 'Failed to load branches') });
    }
  },

  createBranch: async input => {
    set({ isSaving: true, error: null });
    try {
      const branch = await branchService.create(input);
      set(state => ({ branches: [branch, ...state.branches], isSaving: false }));
    } catch (error) {
      set({ isSaving: false, error: getApiErrorMessage(error, 'Failed to create branch') });
      throw error;
    }
  },

  updateBranch: async (id, input) => {
    set({ isSaving: true, error: null });
    try {
      const branch = await branchService.update(id, input);
      set(state => ({
        branches: state.branches.map(item => (item.id === id ? branch : item)),
        isSaving: false,
      }));
    } catch (error) {
      set({ isSaving: false, error: getApiErrorMessage(error, 'Failed to update branch') });
      throw error;
    }
  },

  deleteBranch: async id => {
    const snapshot = get().branches;
    set({
      branches: snapshot.filter(branch => branch.id !== id),
      selectedBranchId: get().selectedBranchId === id ? null : get().selectedBranchId,
      branchUsers: get().selectedBranchId === id ? [] : get().branchUsers,
      error: null,
    });
    try {
      await branchService.remove(id);
    } catch (error) {
      set({ branches: snapshot, error: getApiErrorMessage(error, 'Failed to delete branch') });
      throw error;
    }
  },

  selectBranch: id => set({ selectedBranchId: id, branchUsers: id ? get().branchUsers : [] }),

  fetchBranchUsers: async id => {
    set({ isLoadingUsers: true, error: null, selectedBranchId: id });
    try {
      const users = await branchService.getUsers(id);
      set({ branchUsers: users, isLoadingUsers: false });
    } catch (error) {
      set({ isLoadingUsers: false, error: getApiErrorMessage(error, 'Failed to load branch users') });
    }
  },

  assignUserToBranch: async (branchId, userId) => {
    set({ isSaving: true, error: null });
    try {
      await branchService.assignUser(branchId, userId);
      const users = await branchService.getUsers(branchId);
      set({ branchUsers: users, isSaving: false });
    } catch (error) {
      set({ isSaving: false, error: getApiErrorMessage(error, 'Failed to assign user') });
      throw error;
    }
  },

  removeUserFromBranch: async (branchId, userId) => {
    const snapshot = get().branchUsers;
    set({ branchUsers: snapshot.filter(user => user.id !== userId), error: null });
    try {
      await branchService.removeUser(branchId, userId);
    } catch (error) {
      set({ branchUsers: snapshot, error: getApiErrorMessage(error, 'Failed to remove branch user') });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));
