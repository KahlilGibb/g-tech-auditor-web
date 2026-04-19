export type ActionPriority = 'High' | 'Medium' | 'Low';

export interface ActionWorkflowStatus {
  id: string;
  label: string;
  color: string;
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
  source: string;
  assignee: string;
  dueDate: string;
  priority: ActionPriority;
  workflowStatusId: string;
  contentItems: string[];
  labels?: string[];
  site?: string;
  asset?: string;
  timeline: ActionTimelineEntry[];
  createdAt: string;
}

export interface CreateActionPayload {
  title: string;
  workflowStatusId: string;
  priority: ActionPriority;
  dueDate?: string;
  assignee?: string;
  source?: string;
}
