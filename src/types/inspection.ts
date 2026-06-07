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

export interface InspectionResponse {
  fieldId: string;
  value: unknown;
  note?: string;
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
}
