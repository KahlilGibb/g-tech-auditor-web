export type FileStatus = 'Verified' | 'Pending' | 'Archived';
export type ReferenceType = 'template' | 'inspection' | 'cps' | 'manual';
export type SharePermission = 'read' | 'write';
export type TrashItemType = 'document' | 'folder';

// ─── Folder ────────────────────────────────────────────────────────────────

export interface DocumentFolder {
  id: string;
  org_id: string;
  name: string;
  totalFiles?: number;
  parent_id: string | null;
  created_by_id: string;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

export interface CreateFolderRequest {
  name: string;
  parent_id: string | null;
}

export interface UpdateFolderRequest {
  name: string;
}

export interface ShareFolderRequest {
  user_id: string;
  permission: SharePermission;
}

// ─── File / Document ────────────────────────────────────────────────────────

export interface DocumentFile {
  id: string;
  org_id: string;
  name: string;
  type: string; // e.g., 'pdf', 'docx', 'jpg', 'png', 'xlsx'
  size: string; // human-readable, e.g., '2.4 MB'
  size_bytes: number;
  status: FileStatus;
  folder_id: string | null;
  uploaded_by_id: string;
  uploaded_by_name: string;
  r2_key: string;
  reference_type: ReferenceType | null;
  reference_id: string | null;
  upload_date: string; // YYYY-MM-DD
  created_at: string;
}

export interface UpdateDocumentRequest {
  name?: string;
  folder_id?: string | null;
}

export interface ShareDocumentRequest {
  user_id: string;
  permission: SharePermission;
}

export interface DownloadUrlResponse {
  url: string;
}

// ─── Trash ──────────────────────────────────────────────────────────────────

export interface TrashItem {
  id: string;
  type: TrashItemType;
  name: string;
  deleted_at: string;
  org_id: string;
}

// ─── UI-only (no API backing) ────────────────────────────────────────────────

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
  color_class: string;
}
