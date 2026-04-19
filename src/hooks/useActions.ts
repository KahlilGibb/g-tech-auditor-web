import { useEffect } from 'react';
import { useActionStore } from '../stores/actionStore';

export function useActions() {
  const { 
    actions, 
    workflowStatuses, 
    isLoading, 
    error, 
    fetchActions, 
    updateActionStatus 
  } = useActionStore();

  useEffect(() => {
    fetchActions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    actions,
    workflowStatuses,
    isLoading,
    error,
    refresh: fetchActions,
    updateStatus: updateActionStatus,
  };
}
