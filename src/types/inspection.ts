export type InspectionStatus = 'In Progress' | 'Complete' | 'Draft' | 'Overdue';

export interface InspectionSummary {
  id: string;
  templateId: string;
  title: string;
  site: string;
  assignee: string;
  dueDate: string;
  templateName: string;
  status: InspectionStatus;
  progress: { completed: number; total: number };
  score?: string;
  startedAt?: string;
}

export interface Attachment {
  uri: string;
  attachment_id?: string;
  file_url?: string;
  file_type?: string;
  filename?: string;
  type?: 'issue' | 'general';
  uploading?: boolean;
}

export interface InspectionResponse {
  fieldId: string;
  fieldValueId?: string;
  value: unknown;
  note?: string;
  noteType?: string;
  flagged?: boolean;
  attachments?: Attachment[];
  mediaUris?: string[];
  actionIds?: string[];
  answeredAt?: string;
}

export interface InspectionDetail extends InspectionSummary {
  responses: InspectionResponse[];
  createdAt: string;
  submittedAt?: string | null;
}

export interface InspectionSection {
  id: string;
  title: string;
  order: number;
  fields: import('./template').TemplateField[];
}

export interface InspectionSession {
  inspectionId: string;
  templateId: string;
  templateTitle: string;
  sections: InspectionSection[];
  responses: Record<string, InspectionResponse>;
  currentSectionIndex: number;
  status: 'active' | 'submitting' | 'submitted';
  site: string;
  assignee: string;
  dueDate: string;
  startedAt: string;
  lastSavedAt?: string;
}

export interface CreateInspectionPayload {
  templateId: string;
  site: string;
  assignee: string;
  dueDate: string;
  groupId?: string;
  title?: string;
}

export interface DashboardCounts {
  completed: number;
  active: number;
  draft: number;
  overdue: number;
}

export interface DashboardInProgressItem {
  id: string;
  title: string;
  groupName: string;
  templateTitle: string;
  templateType: string;
  updatedAt: string;
  status?: string;
  progress?: { completed: number; total: number } | string;
}

export interface DashboardTopDealer {
  groupId: string;
  groupName: string;
  total: number;
  completed: number;
  percent: number;
}

export interface DashboardData {
  counts: DashboardCounts;
  inProgress: DashboardInProgressItem[];
  topDealers: DashboardTopDealer[];
}
