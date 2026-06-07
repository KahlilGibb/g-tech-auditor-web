import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ActionItem, ActionWorkflowStatus } from '../types/action';
import { actionService } from '../services/actionService';
import { getApiErrorMessage } from '../lib/apiResponse';

interface ActionStoreState {
  actions: ActionItem[];
  workflowStatuses: ActionWorkflowStatus[];
  isLoading: boolean;
  isFetched: boolean;
  error: string | null;
  
  fetchActions: () => Promise<void>;
  updateActionStatus: (id: string, statusId: string) => Promise<void>;
}

export const useActionStore = create<ActionStoreState>()(
  persist(
    (set, get) => ({
      actions: [],
      workflowStatuses: [],
      isLoading: false,
      isFetched: false,
      error: null,

      fetchActions: async () => {
        if (get().isFetched && get().actions.length > 0) return;
        set({ isLoading: true, error: null });
        try {
          const [actions, statuses] = await Promise.all([
            actionService.getActions(),
            actionService.getWorkflowStatuses()
          ]);
          set({ actions, workflowStatuses: statuses, isLoading: false, isFetched: true });
        } catch (e) {
          set({ isLoading: false, error: getApiErrorMessage(e, 'Failed to load actions') });
        }
      },

      updateActionStatus: async (id, statusId) => {
        // Optimistic update
        const previousActions = get().actions;
        set({
          actions: previousActions.map(a => 
            a.id === id ? { ...a, workflowStatusId: statusId } : a
          )
        });

        try {
          const updatedAction = await actionService.updateActionStatus(id, statusId);
          set({
            actions: get().actions.map(a => 
              a.id === id ? { ...a, ...updatedAction } : a
            )
          });
        } catch (e) {
          // Rollback on failure
          set({ actions: previousActions, error: getApiErrorMessage(e, 'Failed to update action') });
        }
      }
    }),
    {
      name: 'gtech-action-store',
      partialize: (state) => ({ actions: state.actions, isFetched: state.isFetched }),
    }
  )
);
