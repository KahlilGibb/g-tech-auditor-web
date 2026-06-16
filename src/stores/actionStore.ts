import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ActionItem, ActionStatusFormInput, ActionWorkflowStatus, CreateActionPayload } from '../types/action';
import { actionService } from '../services/actionService';
import { getApiErrorMessage } from '../lib/apiResponse';

interface ActionStoreState {
  actions: ActionItem[];
  workflowStatuses: ActionWorkflowStatus[];
  isLoading: boolean;
  isSaving: boolean;
  isFetched: boolean;
  error: string | null;
  
  fetchActions: (force?: boolean) => Promise<void>;
  createAction: (input: CreateActionPayload) => Promise<ActionItem>;
  updateAction: (id: string, input: CreateActionPayload) => Promise<ActionItem>;
  deleteAction: (id: string) => Promise<void>;
  updateActionStatus: (id: string, statusId: string) => Promise<void>;
  createWorkflowStatus: (input: ActionStatusFormInput) => Promise<ActionWorkflowStatus>;
  updateWorkflowStatus: (id: string, input: ActionStatusFormInput) => Promise<ActionWorkflowStatus>;
  deleteWorkflowStatus: (id: string) => Promise<void>;
  clearError: () => void;
}

export const useActionStore = create<ActionStoreState>()(
  persist(
    (set, get) => ({
      actions: [],
      workflowStatuses: [],
      isLoading: false,
      isSaving: false,
      isFetched: false,
      error: null,

      fetchActions: async (force = false) => {
        if (!force && get().isFetched && get().actions.length > 0) return;
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

      createAction: async input => {
        set({ isSaving: true, error: null });
        try {
          const action = await actionService.createAction(input);
          set(state => ({ actions: [action, ...state.actions], isSaving: false, isFetched: true }));
          return action;
        } catch (e) {
          set({ isSaving: false, error: getApiErrorMessage(e, 'Failed to create action') });
          throw e;
        }
      },

      updateAction: async (id, input) => {
        set({ isSaving: true, error: null });
        try {
          const action = await actionService.updateAction(id, input);
          set(state => ({
            actions: state.actions.map(item => item.id === id ? action : item),
            isSaving: false,
          }));
          return action;
        } catch (e) {
          set({ isSaving: false, error: getApiErrorMessage(e, 'Failed to update action') });
          throw e;
        }
      },

      deleteAction: async id => {
        const snapshot = get().actions;
        set({ actions: snapshot.filter(action => action.id !== id), isSaving: true, error: null });
        try {
          await actionService.deleteAction(id);
          set({ isSaving: false });
        } catch (e) {
          set({ actions: snapshot, isSaving: false, error: getApiErrorMessage(e, 'Failed to delete action') });
          throw e;
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
      },

      createWorkflowStatus: async input => {
        set({ isSaving: true, error: null });
        try {
          const status = await actionService.createWorkflowStatus(input);
          set(state => ({ workflowStatuses: [status, ...state.workflowStatuses], isSaving: false }));
          return status;
        } catch (e) {
          set({ isSaving: false, error: getApiErrorMessage(e, 'Failed to create workflow status') });
          throw e;
        }
      },

      updateWorkflowStatus: async (id, input) => {
        set({ isSaving: true, error: null });
        try {
          const status = await actionService.updateWorkflowStatus(id, input);
          set(state => ({
            workflowStatuses: state.workflowStatuses.map(item => item.id === id ? status : item),
            actions: state.actions.map(action =>
              action.workflowStatusId === id ? { ...action, workflowStatusId: status.id } : action,
            ),
            isSaving: false,
          }));
          return status;
        } catch (e) {
          set({ isSaving: false, error: getApiErrorMessage(e, 'Failed to update workflow status') });
          throw e;
        }
      },

      deleteWorkflowStatus: async id => {
        const statusSnapshot = get().workflowStatuses;
        set({
          workflowStatuses: statusSnapshot.filter(status => status.id !== id),
          isSaving: true,
          error: null,
        });
        try {
          await actionService.deleteWorkflowStatus(id);
          set({ isSaving: false });
        } catch (e) {
          set({
            workflowStatuses: statusSnapshot,
            isSaving: false,
            error: getApiErrorMessage(e, 'Failed to delete workflow status'),
          });
          throw e;
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'gtech-action-store',
      partialize: (state) => ({
        actions: state.actions,
        workflowStatuses: state.workflowStatuses,
        isFetched: state.isFetched,
      }),
    }
  )
);
