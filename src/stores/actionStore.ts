import { create } from 'zustand';
import type {
  ActionItem,
  ActionStatusFormInput,
  ActionWorkflowStatus,
  CreateActionPayload,
  ResolveActionPayload,
} from '../types/action';
import { actionService } from '../services/actionService';
import { getApiErrorMessage } from '../lib/apiResponse';
import { ApiRequestError } from '../lib/apiClient';

let actionsFetch: Promise<void> | null = null;

interface ActionStoreState {
  actions: ActionItem[];
  workflowStatuses: ActionWorkflowStatus[];
  isLoading: boolean;
  isSaving: boolean;
  isFetched: boolean;
  lastFetchedAt: number;
  lastFetchAttemptAt: number;
  error: string | null;
  
  fetchActions: (force?: boolean, options?: { background?: boolean; minAgeMs?: number }) => Promise<void>;
  createAction: (input: CreateActionPayload) => Promise<ActionItem>;
  updateAction: (id: string, input: CreateActionPayload) => Promise<ActionItem>;
  deleteAction: (id: string) => Promise<void>;
  updateActionStatus: (id: string, statusId: string) => Promise<void>;
  resolveAction: (id: string, input: ResolveActionPayload) => Promise<ActionItem>;
  createWorkflowStatus: (input: ActionStatusFormInput) => Promise<ActionWorkflowStatus>;
  updateWorkflowStatus: (id: string, input: ActionStatusFormInput) => Promise<ActionWorkflowStatus>;
  deleteWorkflowStatus: (id: string) => Promise<void>;
  clearError: () => void;
}

export const useActionStore = create<ActionStoreState>()((set, get) => ({
      actions: [],
      workflowStatuses: [],
      isLoading: false,
      isSaving: false,
      isFetched: false,
      lastFetchedAt: 0,
      lastFetchAttemptAt: 0,
      error: null,

      fetchActions: async (force = false, options = {}) => {
        if (actionsFetch) return actionsFetch;
        if (options.minAgeMs && Date.now() - get().lastFetchAttemptAt < options.minAgeMs) return;
        if (!force && get().isFetched && get().actions.length > 0) return;
        const beforeActions = get().actions;
        const beforeStatuses = get().workflowStatuses;
        set({ isLoading: !options.background || !get().isFetched, error: null, lastFetchAttemptAt: Date.now() });
        actionsFetch = (async () => {
          try {
            const [actions, statuses] = await Promise.all([
              actionService.getActions(),
              actionService.getWorkflowStatuses()
            ]);
            // A read started before a local save/delete must not put its older
            // snapshot back over the server-confirmed mutation result.
            if (get().isSaving || get().actions !== beforeActions || get().workflowStatuses !== beforeStatuses) {
              set({ isLoading: false });
              return;
            }
            set({ actions, workflowStatuses: statuses, isLoading: false, isFetched: true, lastFetchedAt: Date.now() });
          } catch (e) {
            set({ isLoading: false, ...(get().actions === beforeActions ? { error: getApiErrorMessage(e, 'Failed to load actions') } : {}) });
          } finally {
            actionsFetch = null;
          }
        })();
        return actionsFetch;
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
          if (e instanceof ApiRequestError && e.status === 409) {
            // A conflict requires a new read, not a joined poll that may have
            // started before the competing writer committed.
            if (actionsFetch) await actionsFetch;
            await get().fetchActions(true);
          }
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
          const revision = previousActions.find(action => action.id === id)?.updatedAt;
          const updatedAction = await actionService.updateActionStatus(id, statusId, revision);
          set({
            actions: get().actions.map(a => 
              a.id === id ? { ...a, ...updatedAction } : a
            )
          });
        } catch (e) {
          // Rollback on failure
          set({ actions: previousActions, error: getApiErrorMessage(e, 'Failed to update action') });
          if (e instanceof ApiRequestError && e.status === 409) {
            if (actionsFetch) await actionsFetch;
            await get().fetchActions(true);
          }
          throw e;
        }
      },

      resolveAction: async (id, input) => {
        set({ isSaving: true, error: null });
        try {
          const action = await actionService.resolveAction(id, input);
          set(state => ({
            actions: state.actions.map(item => item.id === id ? action : item),
            isSaving: false,
          }));
          return action;
        } catch (error) {
          set({ isSaving: false, error: getApiErrorMessage(error, 'Failed to resolve action') });
          throw error;
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
    }));
