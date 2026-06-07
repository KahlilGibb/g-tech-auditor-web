import { create } from 'zustand';
import { getApiErrorMessage } from '../lib/apiResponse';
import { organizationService } from '../services/managementService';
import type { ListQuery, Organization, OrganizationFormInput } from '../types/management';

interface OrganizationStoreState {
  organizations: Organization[];
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  fetchOrganizations: (query?: ListQuery) => Promise<void>;
  createOrganization: (input: OrganizationFormInput) => Promise<void>;
  updateOrganization: (id: string, input: OrganizationFormInput) => Promise<void>;
  deleteOrganization: (id: string) => Promise<void>;
  clearError: () => void;
}

export const useOrganizationStore = create<OrganizationStoreState>()((set, get) => ({
  organizations: [],
  isLoading: false,
  isSaving: false,
  error: null,

  fetchOrganizations: async query => {
    set({ isLoading: true, error: null });
    try {
      const { organizations } = await organizationService.getOrganizations(query);
      set({ organizations, isLoading: false });
    } catch (error) {
      set({ isLoading: false, error: getApiErrorMessage(error, 'Failed to load organizations') });
    }
  },

  createOrganization: async input => {
    set({ isSaving: true, error: null });
    try {
      const organization = await organizationService.create(input);
      set(state => ({ organizations: [organization, ...state.organizations], isSaving: false }));
    } catch (error) {
      set({ isSaving: false, error: getApiErrorMessage(error, 'Failed to create organization') });
      throw error;
    }
  },

  updateOrganization: async (id, input) => {
    set({ isSaving: true, error: null });
    try {
      const organization = await organizationService.update(id, input);
      set(state => ({
        organizations: state.organizations.map(item => (item.id === id ? organization : item)),
        isSaving: false,
      }));
    } catch (error) {
      set({ isSaving: false, error: getApiErrorMessage(error, 'Failed to update organization') });
      throw error;
    }
  },

  deleteOrganization: async id => {
    const snapshot = get().organizations;
    set({ organizations: snapshot.filter(organization => organization.id !== id), error: null });
    try {
      await organizationService.remove(id);
    } catch (error) {
      set({ organizations: snapshot, error: getApiErrorMessage(error, 'Failed to delete organization') });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));
