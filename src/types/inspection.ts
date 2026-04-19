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
}

export interface InspectionDetail extends InspectionSummary {
  responses: InspectionResponse[];
  createdAt: string;
}
