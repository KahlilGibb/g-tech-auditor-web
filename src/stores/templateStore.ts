import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { FormType } from '../types/template';
import { templateService, type TemplateListItem, type CreateTemplateResult } from '../services/templateService';
import { getApiErrorMessage } from '../lib/apiResponse';

interface TemplateStoreState {
  templates: TemplateListItem[];
  isLoading: boolean;
  isFetched: boolean;
  error: string | null;
  
  fetchTemplates: () => Promise<void>;
  createTemplate: (formType: FormType) => Promise<CreateTemplateResult>;
  clearError: () => void;
}

export const useTemplateStore = create<TemplateStoreState>()(
  persist(
    (set, get) => ({
      templates: [],
      isLoading: false,
      isFetched: false,
      error: null,

      fetchTemplates: async () => {
        if (get().isFetched && get().templates.length > 0) return;
        set({ isLoading: true, error: null });
        try {
          const templates = await templateService.getTemplates();
          set({ templates, isLoading: false, isFetched: true });
        } catch (e) {
          set({ isLoading: false, error: getApiErrorMessage(e, 'Failed to load templates') });
        }
      },

      createTemplate: async (formType) => {
        set({ isLoading: true, error: null });
        try {
          const result = await templateService.createTemplate(formType);
          // Invalidate fetch cache so that the new template appears in the list
          set({ isFetched: false, isLoading: false });
          return result;
        } catch (e) {
          set({ isLoading: false, error: getApiErrorMessage(e, 'Failed to create template') });
          throw e;
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'gtech-template-store',
      partialize: (state) => ({ 
        templates: state.templates, 
        isFetched: state.isFetched 
      }),
    }
  )
);
