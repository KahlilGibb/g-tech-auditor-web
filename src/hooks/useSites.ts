import { useEffect } from 'react';
import { useSiteStore } from '../stores/siteStore';

export function useSites() {
  const {
    sites,
    isLoading,
    isSaving,
    error,
    fetchSites,
    createSite,
    updateSite,
    deleteSite,
    clearError,
  } = useSiteStore();

  useEffect(() => {
    fetchSites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    sites,
    isLoading,
    isSaving,
    error,
    refresh: fetchSites,
    createSite,
    updateSite,
    deleteSite,
    clearError,
  };
}
