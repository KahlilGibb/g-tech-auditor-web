import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { InspectionSummary } from '../types/inspection';
import { inspectionService } from '../services/inspectionService';

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
  isLoading: boolean;
  isFetched: boolean;
  error: string | null;
  
  fetchDashboardData: () => Promise<void>;
  clearError: () => void;
}

export const useInspectionStore = create<InspectionStoreState>()(
  persist(
    (set, get) => ({
      inspections: [],
      stats: null,
      isLoading: false,
      isFetched: false,
      error: null,

      fetchDashboardData: async () => {
        // If already fetched and not empty, don't re-fetch immediately unless needed
        if (get().isFetched && get().inspections.length > 0) {
            // Optional: Background re-fetch logic can go here
        }
        
        set({ isLoading: true, error: null });
        try {
          const [inspections, stats] = await Promise.all([
            inspectionService.getInspections(),
            inspectionService.getDashboardStats()
          ]);
          set({ inspections, stats, isLoading: false, isFetched: true });
        } catch (e) {
          set({ 
            isLoading: false, 
            error: e instanceof Error ? e.message : 'Failed to load dashboard data' 
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
        isFetched: state.isFetched 
      }),
    }
  )
);
