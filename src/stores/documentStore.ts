import { create } from 'zustand';
import { getApiErrorMessage } from '../lib/apiResponse';
import { documentService } from '../services/documentService';
import type {
  CreateFolderRequest,
  DocumentFolder,
  DocumentFile,
  UpdateDocumentRequest,
  UpdateFolderRequest,
} from '../types/document';

interface DocumentStoreState {
  folders: DocumentFolder[];
  files: DocumentFile[];
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;

  // Folders
  fetchFolders: (parentId?: string | null) => Promise<void>;
  createFolder: (req: CreateFolderRequest) => Promise<DocumentFolder>;
  updateFolder: (id: string, req: UpdateFolderRequest) => Promise<DocumentFolder>;
  deleteFolder: (id: string) => Promise<void>;

  // Files
  fetchFiles: (folderId?: string | null) => Promise<void>;
  uploadFile: (file: File, folderId?: string | null) => Promise<DocumentFile>;
  updateDocument: (id: string, req: UpdateDocumentRequest) => Promise<DocumentFile>;
  deleteDocument: (id: string) => Promise<void>;
  downloadDocument: (id: string) => Promise<void>;

  clearError: () => void;
}

export const useDocumentStore = create<DocumentStoreState>()((set, get) => ({
  folders: [],
  files: [],
  isLoading: false,
  isSaving: false,
  error: null,

  // ─── Folders ───────────────────────────────────────────────────────────────

  fetchFolders: async (parentId) => {
    set({ isLoading: true, error: null });
    try {
      const { folders, documents } = await documentService.getFolders(parentId);
      set({ folders, files: documents, isLoading: false });
    } catch (error) {
      set({ isLoading: false, error: getApiErrorMessage(error, 'Failed to load folders') });
    }
  },

  createFolder: async (req) => {
    set({ isSaving: true, error: null });
    try {
      const folder = await documentService.createFolder(req);
      set(state => ({ folders: [...state.folders, folder], isSaving: false }));
      return folder;
    } catch (error) {
      set({ isSaving: false, error: getApiErrorMessage(error, 'Failed to create folder') });
      throw error;
    }
  },

  updateFolder: async (id, req) => {
    set({ isSaving: true, error: null });
    try {
      const folder = await documentService.updateFolder(id, req);
      set(state => ({
        folders: state.folders.map(f => (f.id === id ? folder : f)),
        isSaving: false,
      }));
      return folder;
    } catch (error) {
      set({ isSaving: false, error: getApiErrorMessage(error, 'Failed to update folder') });
      throw error;
    }
  },

  deleteFolder: async (id) => {
    const snapshot = get().folders;
    // Optimistic: remove folder + its children + its files
    set(state => ({
      folders: state.folders.filter(f => f.id !== id && f.parent_id !== id),
      files: state.files.filter(f => f.folder_id !== id),
    }));
    try {
      await documentService.deleteFolder(id);
    } catch (error) {
      set({ folders: snapshot, error: getApiErrorMessage(error, 'Failed to delete folder') });
      throw error;
    }
  },

  // ─── Files ─────────────────────────────────────────────────────────────────

  fetchFiles: async () => {
    // NOTE: No dedicated list-files endpoint in the API collection.
    // Files are tracked locally after upload/delete. This is a no-op placeholder.
  },

  uploadFile: async (file, folderId) => {
    set({ isSaving: true, error: null });
    try {
      const uploaded = await documentService.uploadFile(file, folderId);
      set(state => ({ files: [uploaded, ...state.files], isSaving: false }));
      return uploaded;
    } catch (error) {
      set({ isSaving: false, error: getApiErrorMessage(error, 'Failed to upload file') });
      throw error;
    }
  },

  updateDocument: async (id, req) => {
    set({ isSaving: true, error: null });
    try {
      const updated = await documentService.updateDocument(id, req);
      set(state => ({
        files: state.files.map(f => (f.id === id ? updated : f)),
        isSaving: false,
      }));
      return updated;
    } catch (error) {
      set({ isSaving: false, error: getApiErrorMessage(error, 'Failed to update document') });
      throw error;
    }
  },

  deleteDocument: async (id) => {
    const snapshot = get().files;
    set(state => ({ files: state.files.filter(f => f.id !== id) }));
    try {
      await documentService.deleteDocument(id);
    } catch (error) {
      set({ files: snapshot, error: getApiErrorMessage(error, 'Failed to delete document') });
      throw error;
    }
  },

  downloadDocument: async (id) => {
    try {
      const { url } = await documentService.getDownloadUrl(id);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      set({ error: getApiErrorMessage(error, 'Failed to get download URL') });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));
