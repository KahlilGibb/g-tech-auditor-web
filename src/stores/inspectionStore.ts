import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { InspectionSummary, DashboardData } from '../types/inspection';
import { inspectionService } from '../services/inspectionService';
import { getApiErrorMessage } from '../lib/apiResponse';

interface DashboardStats {
  totalInspections: number;
  totalInspectionsChange: string;
  activeIssues: number;
  activeIssuesChange: string;
  auditorsOnline: number;
  auditorsOnlineChange: string;
  avgCompliance: string;
  avgComplianceChange: string;
}

interface InspectionStoreState {
  inspections: InspectionSummary[];
  stats: DashboardStats | null;
  dashboardData: DashboardData | null;
  isLoading: boolean;
  isFetched: boolean;
  error: string | null;
  
  fetchDashboardData: () => Promise<void>;
  clearError: () => void;
}

export const useInspectionStore = create<InspectionStoreState>()(
  persist(
    (set) => ({
      inspections: [],
      stats: null,
      dashboardData: null,
      isLoading: false,
      isFetched: false,
      error: null,

      fetchDashboardData: async () => {
        set({ isLoading: true, error: null });
        try {
          const dashboardData = await inspectionService.getDashboard(30);
          const inspections = await inspectionService.getInspections();
          set({ dashboardData, inspections, isLoading: false, isFetched: true });
        } catch (e) {
          set({ 
            isLoading: false, 
            error: getApiErrorMessage(e, 'Failed to load dashboard data') 
          });
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'gtech-inspection-store',
      partialize: (state) => ({ 
        inspections: state.inspections, 
        stats: state.stats,
        dashboardData: state.dashboardData,
        isFetched: state.isFetched 
      }),
    }
  )
);
