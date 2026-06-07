import { useEffect } from 'react';
import { useOrganizationStore } from '../stores/organizationStore';

export function useOrganizations() {
  const {
    organizations,
    isLoading,
    isSaving,
    error,
    fetchOrganizations,
    clearError,
  } = useOrganizationStore();

  useEffect(() => {
    fetchOrganizations({ limit: 100 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    organizations,
    isLoading,
    isSaving,
    error,
    refresh: fetchOrganizations,
    clearError,
  };
}
