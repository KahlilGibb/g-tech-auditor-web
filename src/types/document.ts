export type FileStatus = 'Verified' | 'Pending' | 'Archived';
export type ReferenceType = 'template' | 'inspection' | 'cps' | 'manual';

export interface DocumentFolder {
  id: string;
  org_id: string;
  name: string;
  totalFiles?: number;
  parent_id: string | null; // null represents the root level
  created_by_id: string;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

export interface DocumentFile {
  id: string;
  org_id: string;
  name: string;
  type: string; // e.g., 'pdf', 'docx', 'jpg', 'png', 'xlsx'
  size: string; // e.g., '2.4 MB'
  size_bytes: number;
  status: FileStatus;
  folder_id: string | null; // null means root level
  uploaded_by_id: string;
  uploaded_by_name: string;
  r2_key: string;
  reference_type: ReferenceType | null;
  reference_id: string | null;
  upload_date: string; // YYYY-MM-DD
  created_at: string;
}

export interface ActivityLog {
  id: string;
  action: 'uploaded' | 'deleted' | 'moved' | 'renamed' | 'created_folder';
  details: string;
  time: string;
  user: string;
}

export interface StorageCategory {
  name: string;
  used: number; // in GB
  total: number; // in GB
  color_class: string; // Tailwind class name
}
