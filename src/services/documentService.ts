import { API_ENDPOINTS } from '../constants/api';
import { apiClient } from '../lib/apiClient';
import { unwrapData, unwrapList } from '../lib/apiResponse';
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

async function getFolders(parentId?: string | null): Promise<DocumentFolder[]> {
  const params = parentId ? { parent_id: parentId } : undefined;
  const res = await apiClient.get<unknown>(API_ENDPOINTS.DOCUMENTS.FOLDERS, { params });
  return unwrapList<DocumentFolder>(res.data);
}

async function createFolder(req: CreateFolderRequest): Promise<DocumentFolder> {
  const res = await apiClient.post<unknown>(API_ENDPOINTS.DOCUMENTS.FOLDERS, req);
  return unwrapData<DocumentFolder>(res.data);
}

async function getFolder(id: string): Promise<DocumentFolder> {
  const res = await apiClient.get<unknown>(API_ENDPOINTS.DOCUMENTS.FOLDER(id));
  return unwrapData<DocumentFolder>(res.data);
}

async function updateFolder(id: string, req: UpdateFolderRequest): Promise<DocumentFolder> {
  const res = await apiClient.put<unknown>(API_ENDPOINTS.DOCUMENTS.FOLDER(id), req);
  return unwrapData<DocumentFolder>(res.data);
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
  return unwrapData<DownloadUrlResponse>(res.data);
}

async function updateDocument(id: string, req: UpdateDocumentRequest): Promise<DocumentFile> {
  const res = await apiClient.put<unknown>(API_ENDPOINTS.DOCUMENTS.DETAIL(id), req);
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
