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
    createWorkflowStatus,
    updateWorkflowStatus,
    deleteWorkflowStatus,
  } = useActionStore();

  useEffect(() => {
    fetchActions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    createWorkflowStatus,
    updateWorkflowStatus,
    deleteWorkflowStatus,
  };
}
