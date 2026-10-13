export type TrainingCategory = 'sop' | 'checklist' | 'video' | 'pdf';
export type TrainingAudience = 'all_dealers' | 'selected_dealers';
export type MaterialStatus = 'draft' | 'published' | 'archived';
export type ScheduleStatus = MaterialStatus | 'cancelled';

export interface TrainingMaterial {
  id: string;
  org_id: string;
  document_id?: string;
  document_name?: string;
  document_type?: string;
  title: string;
  description: string;
  category: TrainingCategory;
  external_url?: string;
  required: boolean;
  audience_type: TrainingAudience;
  status: MaterialStatus;
  published_at?: string;
  created_by_id: string;
  assignee_group_ids: string[];
  assignee_group_count: number;
  read_count: number;
  read_at?: string;
  created_at: string;
  updated_at: string;
}

export interface MaterialFields {
  document_id: string | null;
  title: string;
  description: string;
  category: TrainingCategory;
  external_url: string;
  required: boolean;
  audience_type: TrainingAudience;
  assignee_group_ids: string[];
}
export type CreateMaterialRequest = MaterialFields & { publish: boolean };
export type UpdateMaterialRequest = MaterialFields & { status: MaterialStatus };

export interface TrainingSchedule {
  id: string;
  org_id: string;
  title: string;
  description: string;
  starts_at: string;
  ends_at?: string;
  trainer: string;
  location: string;
  meeting_url?: string;
  audience_type: TrainingAudience;
  status: ScheduleStatus;
  published_at?: string;
  created_by_id: string;
  assignee_group_ids: string[];
  assignee_group_count: number;
  created_at: string;
  updated_at: string;
}
export interface ScheduleFields {
  title: string;
  description: string;
  starts_at: string;
  ends_at: string | null;
  trainer: string;
  location: string;
  meeting_url: string;
  audience_type: TrainingAudience;
  assignee_group_ids: string[];
}
export type CreateScheduleRequest = ScheduleFields & { publish: boolean };
export type UpdateScheduleRequest = ScheduleFields & { status: ScheduleStatus };

export interface TrainingContent {
  url: string;
  file_name?: string;
  file_type?: string;
}
export interface TrainingListQuery {
  page?: number;
  limit?: number;
  search?: string;
  category?: TrainingCategory;
  status?: ScheduleStatus;
}
export interface TrainingGroup {
  id: string;
  name: string;
  code: string;
  status: string;
  org_id: string;
}
export interface TrainingDocument {
  id: string;
  name: string;
  file_type: string;
}
