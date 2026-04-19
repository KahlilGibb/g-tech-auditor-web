import { useEffect } from 'react';
import { useInspectionStore } from '../stores/inspectionStore';

export function useDashboard() {
  const { 
    inspections, 
    stats, 
    isLoading, 
    error, 
    fetchDashboardData, 
    clearError 
  } = useInspectionStore();

  useEffect(() => {
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    inspections,
    stats,
    isLoading,
    error,
    refresh: fetchDashboardData,
    clearError,
  };
}
