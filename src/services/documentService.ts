import { API_ENDPOINTS } from '../constants/api';
import { apiClient } from '../lib/apiClient';
import { unwrapData, unwrapList, toStringValue } from '../lib/apiResponse';
import type {
  CreateFolderRequest,
  DocumentFile,
  DocumentFolder,
  DownloadUrlResponse,
  ShareDocumentRequest,
  ShareFolderRequest,
  TrashItem,
  UpdateDocumentRequest,
  UpdateFolderRequest,
} from '../types/document';

// ─── Folder operations ──────────────────────────────────────────────────────

export interface FolderContentsResponse {
  folders: DocumentFolder[];
  documents: DocumentFile[];
}

async function getFolders(parentId?: string | null): Promise<FolderContentsResponse> {
  const params = parentId ? { parent_id: parentId } : undefined;
  const res = await apiClient.get<unknown>(API_ENDPOINTS.DOCUMENTS.FOLDERS, { params });
  const data = unwrapData<{ folders?: DocumentFolder[]; documents?: DocumentFile[] } | null>(res.data);
  const folders = Array.isArray(data?.folders)
    ? data.folders.map(f => ({
        ...f,
        parent_id: f.parent_id !== undefined && f.parent_id !== null ? f.parent_id : null,
      }))
    : [];
  const documents = Array.isArray(data?.documents) ? data.documents : [];
  return { folders, documents };
}

async function createFolder(req: CreateFolderRequest): Promise<DocumentFolder> {
  const res = await apiClient.post<unknown>(API_ENDPOINTS.DOCUMENTS.FOLDERS, req);
  const folder = unwrapData<DocumentFolder>(res.data);
  return {
    ...folder,
    parent_id: folder.parent_id !== undefined && folder.parent_id !== null ? folder.parent_id : null,
  };
}

async function getFolder(id: string): Promise<DocumentFolder> {
  const res = await apiClient.get<unknown>(API_ENDPOINTS.DOCUMENTS.FOLDER(id));
  const folder = unwrapData<DocumentFolder>(res.data);
  return {
    ...folder,
    parent_id: folder.parent_id !== undefined && folder.parent_id !== null ? folder.parent_id : null,
  };
}

async function updateFolder(id: string, req: UpdateFolderRequest): Promise<DocumentFolder> {
  const res = await apiClient.put<unknown>(API_ENDPOINTS.DOCUMENTS.FOLDER(id), req);
  const folder = unwrapData<DocumentFolder>(res.data);
  return {
    ...folder,
    parent_id: folder.parent_id !== undefined && folder.parent_id !== null ? folder.parent_id : null,
  };
}

async function deleteFolder(id: string): Promise<void> {
  await apiClient.delete(API_ENDPOINTS.DOCUMENTS.FOLDER(id));
}

async function shareFolder(id: string, req: ShareFolderRequest): Promise<void> {
  await apiClient.post(API_ENDPOINTS.DOCUMENTS.FOLDER_SHARE(id), req);
}

async function unshareFolder(folderId: string, shareId: string): Promise<void> {
  await apiClient.delete(API_ENDPOINTS.DOCUMENTS.FOLDER_UNSHARE(folderId, shareId));
}

// ─── File / Document operations ─────────────────────────────────────────────

async function uploadFile(file: File, folderId?: string | null): Promise<DocumentFile> {
  const formData = new FormData();
  formData.append('file', file);
  if (folderId) {
    formData.append('folder_id', folderId);
  }
  const res = await apiClient.post<unknown>(API_ENDPOINTS.DOCUMENTS.UPLOAD, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return unwrapData<DocumentFile>(res.data);
}

async function getDocument(id: string): Promise<DocumentFile> {
  const res = await apiClient.get<unknown>(API_ENDPOINTS.DOCUMENTS.DETAIL(id));
  return unwrapData<DocumentFile>(res.data);
}

async function getDownloadUrl(id: string): Promise<DownloadUrlResponse> {
  const res = await apiClient.get<unknown>(API_ENDPOINTS.DOCUMENTS.DOWNLOAD(id));
  const data = unwrapData<any>(res.data);
  return {
    url: toStringValue(data?.download_url) || toStringValue(data?.url) || '',
  };
}

async function updateDocument(id: string, req: UpdateDocumentRequest): Promise<DocumentFile> {
  const res = await apiClient.put<unknown>(API_ENDPOINTS.DOCUMENTS.UPDATE(id), req);
  return unwrapData<DocumentFile>(res.data);
}

async function deleteDocument(id: string): Promise<void> {
  await apiClient.delete(API_ENDPOINTS.DOCUMENTS.DETAIL(id));
}

async function shareDocument(id: string, req: ShareDocumentRequest): Promise<void> {
  await apiClient.post(API_ENDPOINTS.DOCUMENTS.SHARE(id), req);
}

async function unshareDocument(documentId: string, shareId: string): Promise<void> {
  await apiClient.delete(API_ENDPOINTS.DOCUMENTS.UNSHARE(documentId, shareId));
}

// ─── Trash operations ────────────────────────────────────────────────────────

async function getTrash(): Promise<TrashItem[]> {
  const res = await apiClient.get<unknown>(API_ENDPOINTS.DOCUMENTS.TRASH);
  return unwrapList<TrashItem>(res.data);
}

async function restoreFromTrash(id: string): Promise<void> {
  await apiClient.post(API_ENDPOINTS.DOCUMENTS.RESTORE(id), null, {
    params: { type: 'document' },
  });
}

async function permanentDelete(id: string): Promise<void> {
  await apiClient.delete(API_ENDPOINTS.DOCUMENTS.PERMANENT_DELETE(id), {
    params: { type: 'document' },
  });
}

// ─── Exported service ────────────────────────────────────────────────────────

export const documentService = {
  // Folders
  getFolders,
  createFolder,
  getFolder,
  updateFolder,
  deleteFolder,
  shareFolder,
  unshareFolder,
  // Files
  uploadFile,
  getDocument,
  getDownloadUrl,
  updateDocument,
  deleteDocument,
  shareDocument,
  unshareDocument,
  // Trash
  getTrash,
  restoreFromTrash,
  permanentDelete,
};
