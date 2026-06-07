import { useEffect } from 'react';
import { useBranchStore } from '../stores/branchStore';

export function useBranches() {
  const {
    branches,
    isLoading,
    isSaving,
    error,
    fetchBranches,
    clearError,
  } = useBranchStore();

  useEffect(() => {
    fetchBranches({ limit: 100 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    branches,
    isLoading,
    isSaving,
    error,
    refresh: fetchBranches,
    clearError,
  };
}
