export type ActionPriority = 'High' | 'Medium' | 'Low';

export interface ActionWorkflowStatus {
  id: string;
  label: string;
  color: string;
  order?: number;
  isDefault?: boolean;
  isDone?: boolean;
}

export interface ActionTimelineEntry {
  id: string;
  label: string;
  date: string;
}

export interface ActionItem {
  id: string;
  code: string;
  title: string;
  description?: string;
  source: string;
  assignee: string;
  assigneeIds?: string[];
  dueDate: string;
  priority: ActionPriority;
  workflowStatusId: string;
  contentItems: string[];
  labels?: string[];
  site?: string;
  asset?: string;
  timeline: ActionTimelineEntry[];
  createdAt: string;
  resolutionNote?: string;
  resolvedAt?: string;
}

export interface CreateActionPayload {
  title: string;
  description?: string;
  workflowStatusId: string;
  priority: ActionPriority;
  dueDate?: string;
  assigneeIds?: string[];
  source?: string;
  site?: string;
  asset?: string;
}

export interface ActionStatusFormInput {
  name: string;
  order: number;
  isDefault?: boolean;
  color?: string;
}

export interface ResolveActionPayload {
  resolutionNote: string;
  files?: File[];
}
