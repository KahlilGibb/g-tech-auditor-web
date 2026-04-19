import type { ActionItem, ActionWorkflowStatus } from '../types/action';
import { apiClient, MockInterceptError } from '../lib/apiClient';
import { API_ENDPOINTS } from '../constants/api';

export const MOCK_WORKFLOW_STATUSES: ActionWorkflowStatus[] = [
  { id: 'todo', label: 'To Do', color: '#6B7280' },
  { id: 'in_progress', label: 'In Progress', color: '#2563EB' },
  { id: 'completed', label: 'Completed', color: '#10B981' },
  { id: 'cancelled', label: 'Cancelled', color: '#DC2626' },
];

// TODO: Remove MOCK_ACTIONS when real API is connected.
const MOCK_ACTIONS: ActionItem[] = [
  {
    id: 'ACT-001',
    code: '10293',
    title: 'Repair broken light in aisle 4',
    source: 'Warehouse Safety Check',
    assignee: 'Mark Green',
    dueDate: '2026-04-22T00:00:00Z',
    priority: 'High',
    workflowStatusId: 'todo',
    contentItems: ['Broken LED fixture', 'Aisle 4, Section B'],
    site: 'Central Logistics Park',
    timeline: [{ id: '1', label: 'Created', date: '2026-04-19T10:00:00Z' }],
    createdAt: '2026-04-19T10:00:00Z',
  },
  {
    id: 'ACT-002',
    code: '10294',
    title: 'Update fire exit signage',
    source: 'Fire Drill Audit',
    assignee: 'Safety Team',
    dueDate: '2026-04-25T00:00:00Z',
    priority: 'Medium',
    workflowStatusId: 'in_progress',
    contentItems: ['Replace faded signs', 'Test emergency lighting'],
    site: 'HQ Office',
    timeline: [
      { id: '1', label: 'Created', date: '2026-04-18T11:00:00Z' },
      { id: '2', label: 'Started', date: '2026-04-19T09:00:00Z' }
    ],
    createdAt: '2026-04-18T11:00:00Z',
  },
];

export const actionService = {
  async getActions(): Promise<ActionItem[]> {
    try {
      const res = await apiClient.get<ActionItem[]>(API_ENDPOINTS.ACTIONS.LIST);
      return res.data;
    } catch (e) {
      if (e instanceof MockInterceptError) {
        await new Promise<void>(r => setTimeout(r, 500));
        return [...MOCK_ACTIONS];
      }
      throw e;
    }
  },
  
  async getWorkflowStatuses(): Promise<ActionWorkflowStatus[]> {
    // Statics often don't need network, but we assume it might for standard APIs
    try {
      // Mocking endpoint path assuming there might be one, or just resolve immediately
      if (typeof apiClient !== 'undefined') {
         // for consistency, though it's static usually
      }
      return [...MOCK_WORKFLOW_STATUSES];
    } catch (e) {
      return [...MOCK_WORKFLOW_STATUSES];
    }
  }
};
