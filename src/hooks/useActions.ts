import { useEffect } from 'react';
import { useActionStore } from '../stores/actionStore';

export function useActions() {
  const { 
    actions, 
    workflowStatuses, 
    isLoading, 
    isSaving,
    error, 
    fetchActions, 
    createAction,
    updateAction,
    deleteAction,
    updateActionStatus,
    resolveAction,
    createWorkflowStatus,
    updateWorkflowStatus,
    deleteWorkflowStatus,
  } = useActionStore();

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    const visible = () => document.visibilityState !== 'hidden' && navigator.onLine !== false;
    const refreshIfVisible = (initial = false) => {
      if (!visible() || useActionStore.getState().isSaving) return;
      void fetchActions(true, { background: true, minAgeMs: initial ? 0 : 15_000 });
    };
    const restartTimer = () => {
      if (timer !== undefined) clearInterval(timer);
      timer = undefined;
      if (!visible()) return;
      timer = setInterval(refreshIfVisible, 30_000);
    };
    const sync = () => { refreshIfVisible(); restartTimer(); };
    refreshIfVisible(true);
    restartTimer();
    document.addEventListener('visibilitychange', sync);
    window.addEventListener('focus', sync);
    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    return () => {
      if (timer !== undefined) clearInterval(timer);
      document.removeEventListener('visibilitychange', sync);
      window.removeEventListener('focus', sync);
      window.removeEventListener('online', sync);
      window.removeEventListener('offline', sync);
    };
  }, [fetchActions]);

  return {
    actions,
    workflowStatuses,
    isLoading,
    isSaving,
    error,
    refresh: fetchActions,
    createAction,
    updateAction,
    deleteAction,
    updateStatus: updateActionStatus,
    resolveAction,
    createWorkflowStatus,
    updateWorkflowStatus,
    deleteWorkflowStatus,
  };
}
