import { useEffect } from 'react';
import { useDocumentStore } from '../stores/documentStore';

/**
 * Hook that provides document management state and operations.
 * Automatically fetches root folders on mount.
 * Re-fetches folders whenever activeFolderId changes (navigation).
 */
export function useDocuments(activeFolderId: string | null = null) {
  const {
    folders,
    files,
    isLoading,
    isSaving,
    error,
    fetchFolders,
    createFolder,
    updateFolder,
    deleteFolder,
    uploadFile,
    updateDocument,
    deleteDocument,
    downloadDocument,
    clearError,
  } = useDocumentStore();

  // Fetch folders for the current folder (root or sub-folder)
  useEffect(() => {
    fetchFolders(activeFolderId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFolderId]);

  return {
    folders,
    files,
    isLoading,
    isSaving,
    error,
    fetchFolders,
    createFolder,
    updateFolder,
    deleteFolder,
    uploadFile,
    updateDocument,
    deleteDocument,
    downloadDocument,
    clearError,
  };
}
