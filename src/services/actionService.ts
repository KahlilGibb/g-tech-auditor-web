import type { ActionItem, ActionStatusFormInput, ActionWorkflowStatus, CreateActionPayload } from '../types/action';
import { apiClient, MockInterceptError } from '../lib/apiClient';
import { API_ENDPOINTS } from '../constants/api';
import { toRecord, toStringValue, unwrapData, unwrapList } from '../lib/apiResponse';

export let MOCK_WORKFLOW_STATUSES: ActionWorkflowStatus[] = [
  { id: 'todo', label: 'To Do', color: '#6B7280', order: 1, isDefault: true },
  { id: 'in_progress', label: 'In Progress', color: '#2563EB', order: 2 },
  { id: 'completed', label: 'Completed', color: '#10B981', order: 3 },
  { id: 'cancelled', label: 'Cancelled', color: '#DC2626', order: 4 },
];

// TODO: Remove MOCK_ACTIONS when real API is connected.
let MOCK_ACTIONS: ActionItem[] = [
  {
    id: 'ACT-001',
    code: '10293',
    title: 'Repair broken light in aisle 4',
    description: 'Broken LED fixture needs replacement.',
    source: 'Warehouse Safety Check',
    assignee: 'Mark Green',
    assigneeIds: ['user-riko'],
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
    description: 'Replace faded signs and test emergency lighting.',
    source: 'Fire Drill Audit',
    assignee: 'Safety Team',
    assigneeIds: ['user-dina'],
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

function toDateString(value: unknown, fallback = new Date().toISOString()) {
  const text = toStringValue(value);
  return text || fallback;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      const record = toRecord(item);
      return toStringValue(item, toStringValue(record.label ?? record.name ?? record.title ?? record.description));
    })
    .filter(Boolean);
}

function normalizePriority(value: unknown): ActionItem['priority'] {
  const text = toStringValue(value, 'Medium').toLowerCase();
  if (text === 'high' || text === 'tinggi') return 'High';
  if (text === 'low' || text === 'rendah') return 'Low';
  return 'Medium';
}

function apiPriority(value: ActionItem['priority']) {
  return value.toLowerCase();
}

function slugStatus(value: unknown, fallback = 'todo') {
  const text = toStringValue(value, fallback).trim();
  return text ? text.toLowerCase().replace(/\s+/g, '_') : fallback;
}

function defaultStatusColor(statusId: string) {
  const colors: Record<string, string> = {
    todo: '#6B7280',
    open: '#6B7280',
    in_progress: '#2563EB',
    completed: '#10B981',
    done: '#10B981',
    cancelled: '#DC2626',
    canceled: '#DC2626',
  };
  return colors[statusId] ?? '#6B7280';
}

function normalizeStatus(raw: unknown): ActionWorkflowStatus {
  const item = toRecord(raw);
  const id = slugStatus(item.id ?? item.status_id ?? item.code ?? item.name ?? item.label);

  return {
    id,
    label: toStringValue(item.label ?? item.name ?? item.title, id.replace(/_/g, ' ')),
    color: toStringValue(item.color ?? item.hex_color ?? item.color_code, defaultStatusColor(id)),
    order: Number(item.ord ?? item.order ?? 0) || undefined,
    isDefault: Boolean(item.is_default ?? item.isDefault),
  };
}

function statusPayload(input: ActionStatusFormInput) {
  return {
    name: input.name,
    ord: input.order,
    is_default: Boolean(input.isDefault),
    color: input.color,
  };
}

function actionPayload(input: CreateActionPayload) {
  return {
    title: input.title,
    description: input.description,
    priority: apiPriority(input.priority),
    status_id: input.workflowStatusId,
    due_date: input.dueDate,
    assignee_ids: input.assigneeIds ?? [],
  };
}

function normalizeTimeline(raw: unknown): ActionItem['timeline'] {
  if (!Array.isArray(raw)) return [];

  return raw.map((entry, index) => {
    const item = toRecord(entry);
    return {
      id: toStringValue(item.id, String(index + 1)),
      label: toStringValue(item.label ?? item.title ?? item.status ?? item.action, 'Updated'),
      date: toDateString(item.date ?? item.created_at ?? item.updated_at),
    };
  });
}

function nestedName(value: unknown) {
  const item = toRecord(value);
  return toStringValue(item.name ?? item.full_name ?? item.email ?? item.title);
}

function normalizeAction(raw: unknown): ActionItem {
  const item = toRecord(raw);
  const status = toRecord(item.status ?? item.workflow_status ?? item.action_status);
  const assignee = item.assignee ?? item.assigned_to ?? item.pic ?? item.user;
  const site = item.site ?? item.location;
  const createdAt = toDateString(item.created_at ?? item.createdAt ?? item.created_date);
  const id = toStringValue(item.id ?? item.action_id ?? item.uuid ?? item.code, crypto.randomUUID());
  const statusId = slugStatus(
    item.workflowStatusId ??
      item.workflow_status_id ??
      item.action_status_id ??
      item.status_id ??
      status.id ??
      status.code ??
      status.name ??
      item.status,
  );
  const contentItems = toStringArray(item.content_items ?? item.contentItems ?? item.findings ?? item.items);

  return {
    id,
    code: toStringValue(item.code ?? item.action_code ?? item.number ?? item.reference_no, id),
    title: toStringValue(item.title ?? item.name ?? item.summary ?? item.description, 'Untitled action'),
    description: toStringValue(item.description ?? item.notes) || undefined,
    source: toStringValue(
      item.source ??
        item.source_title ??
        item.inspection_title ??
        toRecord(item.inspection).title ??
        toRecord(item.template).title,
      '-',
    ),
    assignee: toStringValue(item.assignee_name ?? item.assigned_to_name ?? item.pic_name, nestedName(assignee) || '-'),
    assigneeIds: Array.isArray(item.assignee_ids)
      ? item.assignee_ids.map(value => toStringValue(value)).filter(Boolean)
      : Array.isArray(item.assignees)
        ? item.assignees.map(value => toStringValue(toRecord(value).id)).filter(Boolean)
        : undefined,
    dueDate: toDateString(item.due_date ?? item.dueDate ?? item.deadline ?? item.target_date, createdAt),
    priority: normalizePriority(item.priority ?? item.severity),
    workflowStatusId: statusId,
    contentItems: contentItems.length > 0 ? contentItems : [toStringValue(item.description ?? item.notes)].filter(Boolean),
    labels: toStringArray(item.labels ?? item.tags),
    site: toStringValue(item.site_name ?? item.location_name, nestedName(site)),
    asset: toStringValue(item.asset_name, nestedName(item.asset)),
    timeline: normalizeTimeline(item.timeline ?? item.histories ?? item.history),
    createdAt,
  };
}

export const actionService = {
  async getActions(filters?: {
    statusId?: string;
    priority?: ActionItem['priority'] | 'all';
    assigneeId?: string;
    inspectionId?: string;
  }): Promise<ActionItem[]> {
    try {
      const res = await apiClient.get<unknown>(API_ENDPOINTS.ACTIONS.LIST, {
        params: {
          page: 1,
          limit: 50,
          status_id: filters?.statusId && filters.statusId !== 'all' ? filters.statusId : undefined,
          priority: filters?.priority && filters.priority !== 'all' ? apiPriority(filters.priority) : undefined,
          assignee_id: filters?.assigneeId,
          inspection_id: filters?.inspectionId,
        },
      });
      return unwrapList(res.data).map(normalizeAction);
    } catch (e) {
      if (e instanceof MockInterceptError) {
        await new Promise<void>(r => setTimeout(r, 500));
        return [...MOCK_ACTIONS];
      }
      throw e;
    }
  },

  async createAction(input: CreateActionPayload): Promise<ActionItem> {
    try {
      const res = await apiClient.post<unknown>(API_ENDPOINTS.ACTIONS.CREATE, actionPayload(input));
      return normalizeAction(unwrapData(res.data));
    } catch (e) {
      if (e instanceof MockInterceptError) {
        await new Promise<void>(r => setTimeout(r, 300));
        const action: ActionItem = {
          id: `ACT-${Date.now()}`,
          code: String(10000 + MOCK_ACTIONS.length + 1),
          title: input.title,
          description: input.description,
          source: input.source || '-',
          assignee: input.assigneeIds?.length ? `${input.assigneeIds.length} assignee` : '-',
          assigneeIds: input.assigneeIds,
          dueDate: input.dueDate || new Date().toISOString(),
          priority: input.priority,
          workflowStatusId: input.workflowStatusId,
          contentItems: [input.description || input.title],
          site: input.site,
          asset: input.asset,
          timeline: [{ id: 'created', label: 'Created', date: new Date().toISOString() }],
          createdAt: new Date().toISOString(),
        };
        MOCK_ACTIONS = [action, ...MOCK_ACTIONS];
        return action;
      }
      throw e;
    }
  },

  async updateAction(id: string, input: CreateActionPayload): Promise<ActionItem> {
    try {
      const res = await apiClient.put<unknown>(API_ENDPOINTS.ACTIONS.UPDATE(id), actionPayload(input));
      return normalizeAction(unwrapData(res.data));
    } catch (e) {
      if (e instanceof MockInterceptError) {
        await new Promise<void>(r => setTimeout(r, 300));
        const current = MOCK_ACTIONS.find(action => action.id === id);
        const updated: ActionItem = {
          ...(current ?? MOCK_ACTIONS[0]),
          id,
          title: input.title,
          description: input.description,
          priority: input.priority,
          workflowStatusId: input.workflowStatusId,
          dueDate: input.dueDate || current?.dueDate || new Date().toISOString(),
          assigneeIds: input.assigneeIds,
          assignee: input.assigneeIds?.length ? `${input.assigneeIds.length} assignee` : current?.assignee ?? '-',
          source: input.source || current?.source || '-',
        };
        MOCK_ACTIONS = MOCK_ACTIONS.map(action => action.id === id ? updated : action);
        return updated;
      }
      throw e;
    }
  },

  async deleteAction(id: string): Promise<void> {
    try {
      await apiClient.delete(API_ENDPOINTS.ACTIONS.DELETE(id));
    } catch (e) {
      if (e instanceof MockInterceptError) {
        await new Promise<void>(r => setTimeout(r, 250));
        MOCK_ACTIONS = MOCK_ACTIONS.filter(action => action.id !== id);
        return;
      }
      throw e;
    }
  },
  
  async getWorkflowStatuses(): Promise<ActionWorkflowStatus[]> {
    try {
      const res = await apiClient.get<unknown>(API_ENDPOINTS.ACTION_STATUSES.LIST, {
        params: { page: 1, limit: 50 },
      });
      const statuses = unwrapList(res.data).map(normalizeStatus);
      return statuses.length > 0 ? statuses : [...MOCK_WORKFLOW_STATUSES];
    } catch (e) {
      if (e instanceof MockInterceptError) {
        return [...MOCK_WORKFLOW_STATUSES];
      }
      throw e;
    }
  },

  async createWorkflowStatus(input: ActionStatusFormInput): Promise<ActionWorkflowStatus> {
    try {
      const res = await apiClient.post<unknown>(API_ENDPOINTS.ACTION_STATUSES.CREATE, statusPayload(input));
      return normalizeStatus(unwrapData(res.data));
    } catch (e) {
      if (e instanceof MockInterceptError) {
        const status: ActionWorkflowStatus = {
          id: slugStatus(input.name),
          label: input.name,
          color: input.color || defaultStatusColor(slugStatus(input.name)),
          order: input.order,
          isDefault: input.isDefault,
        };
        MOCK_WORKFLOW_STATUSES = [status, ...MOCK_WORKFLOW_STATUSES];
        return status;
      }
      throw e;
    }
  },

  async updateWorkflowStatus(id: string, input: ActionStatusFormInput): Promise<ActionWorkflowStatus> {
    try {
      const res = await apiClient.put<unknown>(API_ENDPOINTS.ACTION_STATUSES.UPDATE(id), statusPayload(input));
      return normalizeStatus(unwrapData(res.data));
    } catch (e) {
      if (e instanceof MockInterceptError) {
        const updated: ActionWorkflowStatus = {
          id,
          label: input.name,
          color: input.color || defaultStatusColor(id),
          order: input.order,
          isDefault: input.isDefault,
        };
        MOCK_WORKFLOW_STATUSES = MOCK_WORKFLOW_STATUSES.map(status => status.id === id ? updated : status);
        return updated;
      }
      throw e;
    }
  },

  async deleteWorkflowStatus(id: string): Promise<void> {
    try {
      await apiClient.delete(API_ENDPOINTS.ACTION_STATUSES.DELETE(id));
    } catch (e) {
      if (e instanceof MockInterceptError) {
        MOCK_WORKFLOW_STATUSES = MOCK_WORKFLOW_STATUSES.filter(status => status.id !== id);
        return;
      }
      throw e;
    }
  },

  async updateActionStatus(id: string, statusId: string): Promise<ActionItem> {
    try {
      const res = await apiClient.patch<unknown>(API_ENDPOINTS.ACTIONS.UPDATE(id), {
        workflow_status_id: statusId,
        action_status_id: statusId,
        status_id: statusId,
      });
      return normalizeAction(res.data);
    } catch (e) {
      if (e instanceof MockInterceptError) {
        await new Promise<void>(r => setTimeout(r, 300));
        const current = MOCK_ACTIONS.find(action => action.id === id);
        return { ...(current ?? MOCK_ACTIONS[0]), id, workflowStatusId: statusId };
      }
      throw e;
    }
  },

  async addAssignee(actionId: string, userId: string): Promise<void> {
    try {
      await apiClient.post(API_ENDPOINTS.ACTIONS.ASSIGNEES(actionId), { user_id: userId });
    } catch (e) {
      if (e instanceof MockInterceptError) return;
      throw e;
    }
  },

  async removeAssignee(actionId: string, userId: string): Promise<void> {
    try {
      await apiClient.delete(API_ENDPOINTS.ACTIONS.ASSIGNEE(actionId, userId));
    } catch (e) {
      if (e instanceof MockInterceptError) return;
      throw e;
    }
  },
};
