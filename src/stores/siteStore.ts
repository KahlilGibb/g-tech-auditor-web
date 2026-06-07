import { create } from 'zustand';
import { getApiErrorMessage } from '../lib/apiResponse';
import { siteService } from '../services/managementService';
import type { ListQuery, Site, SiteFormInput } from '../types/management';

interface SiteStoreState {
  sites: Site[];
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  fetchSites: (query?: ListQuery) => Promise<void>;
  createSite: (input: SiteFormInput) => Promise<void>;
  updateSite: (id: string, input: SiteFormInput) => Promise<void>;
  deleteSite: (id: string) => Promise<void>;
  clearError: () => void;
}

export const useSiteStore = create<SiteStoreState>()((set, get) => ({
  sites: [],
  isLoading: false,
  isSaving: false,
  error: null,

  fetchSites: async query => {
    set({ isLoading: true, error: null });
    try {
      const sites = await siteService.list(query);
      set({ sites, isLoading: false });
    } catch (error) {
      set({ isLoading: false, error: getApiErrorMessage(error, 'Failed to load sites') });
    }
  },

  createSite: async input => {
    set({ isSaving: true, error: null });
    try {
      const site = await siteService.create(input);
      set(state => ({ sites: [site, ...state.sites], isSaving: false }));
    } catch (error) {
      set({ isSaving: false, error: getApiErrorMessage(error, 'Failed to create site') });
      throw error;
    }
  },

  updateSite: async (id, input) => {
    set({ isSaving: true, error: null });
    try {
      const site = await siteService.update(id, input);
      set(state => ({
        sites: state.sites.map(item => (item.id === id ? site : item)),
        isSaving: false,
      }));
    } catch (error) {
      set({ isSaving: false, error: getApiErrorMessage(error, 'Failed to update site') });
      throw error;
    }
  },

  deleteSite: async id => {
    const snapshot = get().sites;
    set({ sites: snapshot.filter(site => site.id !== id), error: null });
    try {
      await siteService.remove(id);
    } catch (error) {
      set({ sites: snapshot, error: getApiErrorMessage(error, 'Failed to delete site') });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));
