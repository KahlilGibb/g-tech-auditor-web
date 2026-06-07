import type { InspectionSummary } from '../types/inspection';
import { apiClient, MockInterceptError } from '../lib/apiClient';
import { API_ENDPOINTS } from '../constants/api';

// TODO: Remove MOCK_DATA when real API is connected.
const MOCK_INSPECTIONS: InspectionSummary[] = [
  {
    id: 'INS-001',
    templateId: 'TEMP-W01',
    title: 'Warehouse Safety Check',
    site: 'Central Logistics Park',
    assignee: 'John Doe',
    dueDate: '2026-04-20T10:00:00Z',
    templateName: 'Monthly Safety Audit',
    status: 'Complete',
    progress: { completed: 24, total: 24 },
    score: '92%',
    startedAt: '2026-04-19T08:00:00Z',
  },
  {
    id: 'INS-002',
    templateId: 'TEMP-E01',
    title: 'Electrical Maintenance',
    site: 'East Wing Production',
    assignee: 'Sarah Smith',
    dueDate: '2026-04-19T17:00:00Z',
    templateName: 'Equipment Service Log',
    status: 'In Progress',
    progress: { completed: 12, total: 40 },
    startedAt: '2026-04-19T13:00:00Z',
  },
  {
    id: 'INS-003',
    templateId: 'TEMP-F01',
    title: 'Fire Drill Audit',
    site: 'HQ Office',
    assignee: 'Mike Ross',
    dueDate: '2026-04-18T09:00:00Z',
    templateName: 'Emergency Readiness',
    status: 'Complete',
    progress: { completed: 15, total: 15 },
    score: '100%',
    startedAt: '2026-04-18T08:30:00Z',
  },
  {
    id: 'INS-004',
    templateId: 'TEMP-Q01',
    title: 'Equipment Inspection',
    site: 'Main Workshop',
    assignee: 'Anna Bell',
    dueDate: '2026-04-17T15:00:00Z',
    templateName: 'Daily QC Check',
    status: 'Overdue',
    progress: { completed: 5, total: 20 },
    score: '64%',
    startedAt: '2026-04-17T09:00:00Z',
  },
];

export interface DashboardStatsResponse {
  totalInspections: number;
  totalInspectionsChange: string;
  activeIssues: number;
  activeIssuesChange: string;
  auditorsOnline: number;
  auditorsOnlineChange: string;
  avgCompliance: string;
  avgComplianceChange: string;
}

export const inspectionService = {
  async getInspections(): Promise<InspectionSummary[]> {
    try {
      const res = await apiClient.get<InspectionSummary[]>(API_ENDPOINTS.INSPECTIONS.LIST);
      return res.data;
    } catch (e) {
      if (e instanceof MockInterceptError) {
        await new Promise<void>(r => setTimeout(r, 600));
        return [...MOCK_INSPECTIONS];
      }
      throw e;
    }
  },

  async getDashboardStats(): Promise<DashboardStatsResponse> {
    try {
      const res = await apiClient.get<DashboardStatsResponse>(API_ENDPOINTS.INSPECTIONS.DASHBOARD_STATS);
      return res.data;
    } catch (e) {
      if (e instanceof MockInterceptError) {
        await new Promise<void>(r => setTimeout(r, 400));
        return {
          totalInspections: 1284,
          totalInspectionsChange: '+12%',
          activeIssues: 24,
          activeIssuesChange: '+4',
          auditorsOnline: 18,
          auditorsOnlineChange: '+2',
          avgCompliance: '88.4%',
          avgComplianceChange: '+2.4%',
        };
      }
      throw e;
    }
  }
};
