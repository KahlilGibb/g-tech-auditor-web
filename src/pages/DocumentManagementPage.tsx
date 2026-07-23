import React, { useMemo, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Folder,
  File,
  MoreVertical,
  Plus,
  Search,
  UploadCloud,
  Download,
  Eye,
  Trash2,
  ChevronRight,
  HardDrive,
  Activity,
  FileText,
  CheckCircle2,
  AlertCircle,
  Archive,
  FolderPlus,
  RefreshCcw,
  Edit2,
  Move,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  Link as LinkIcon,
} from 'lucide-react';
import { cn } from '../utils/cn';
import { appSwal } from '../lib/appSwal';
import { getApiErrorMessage } from '../lib/apiResponse';
import { SkeletonRow } from '../components/ui/SkeletonLoader';
import { useDocuments } from '../hooks/useDocuments';
import { documentService } from '../services/documentService';
import type {
  DocumentFolder,
  DocumentFile,
  ActivityLog,
  StorageCategory,
  FileStatus,
  ReferenceType,
} from '../types/document';
import { Can } from '../components/rbac/Can';
import {
  Badge,
  Button,
  Card,
  Eyebrow,
  EmptyState,
  Field,
  IconButton,
  Input,
  Modal,
  PageHeader,
  RowAction,
  Select,
} from '../components/ui';

const INITIAL_ACTIVITIES: ActivityLog[] = [];

const INITIAL_STORAGE: StorageCategory[] = [
  { name: 'Documents', used: 0, total: 20, color_class: 'bg-primary-blue' },
  { name: 'Images', used: 0, total: 10, color_class: 'bg-success-green' },
  { name: 'Spreadsheets', used: 0, total: 5, color_class: 'bg-warning-amber' },
  { name: 'Other', used: 0, total: 5, color_class: 'bg-muted-foreground' },
];

const ITEMS_PER_PAGE = 5;

const DocumentManagementPage: React.FC = () => {
  const { t } = useTranslation();

  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);

  const {
    folders,
    files,
    isLoading,
    isSaving,
    fetchFolders,
    createFolder,
    updateFolder,
    deleteFolder,
    uploadFile,
    updateDocument,
    deleteDocument,
    downloadDocument,
  } = useDocuments(activeFolderId);
  const [activities, setActivities] = useState<ActivityLog[]>(INITIAL_ACTIVITIES);
  const [storageBreakdown, setStorageBreakdown] = useState<StorageCategory[]>(INITIAL_STORAGE);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<FileStatus | 'All'>('All');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'size'>('name');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);


  // Modals state
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<DocumentFile | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');

  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<{ id: string; type: 'folder' | 'file'; currentName: string } | null>(null);
  const [renameInputValue, setRenameInputValue] = useState('');

  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [moveTarget, setMoveTarget] = useState<{ id: string; type: 'folder' | 'file' } | null>(null);
  const [selectedDestinationFolder, setSelectedDestinationFolder] = useState<string | 'root'>('root');

  // Dropdown Active states (for card menu / table actions)
  const [activeFolderMenuId, setActiveFolderMenuId] = useState<string | null>(null);
  const [activeFileMenuId, setActiveFileMenuId] = useState<string | null>(null);

  // Drag-and-drop state
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Calculated Storage summary
  const totalStorageUsed = useMemo(() => {
    return parseFloat(storageBreakdown.reduce((acc, cat) => acc + cat.used, 0).toFixed(1));
  }, [storageBreakdown]);

  const totalStorageCapacity = useMemo(() => {
    return storageBreakdown.reduce((acc, cat) => acc + cat.total, 0);
  }, [storageBreakdown]);

  // Current folder details
  const activeFolder = useMemo(() => {
    return folders.find(f => f.id === activeFolderId) ?? null;
  }, [folders, activeFolderId]);

  // Path navigation calculation (Breadcrumbs)
  const breadcrumbs = useMemo(() => {
    const path: { id: string | null; name: string }[] = [{ id: null, name: t('documents.allFolders') }];
    if (!activeFolderId) return path;

    let current = folders.find(f => f.id === activeFolderId);
    const tempPath: { id: string | null; name: string }[] = [];

    while (current) {
      tempPath.unshift({ id: current.id, name: current.name });
      const parentId = current.parent_id;
      current = parentId ? folders.find(f => f.id === parentId) : undefined;
    }

    return [...path, ...tempPath];
  }, [folders, activeFolderId, t]);

  // Filtered/Sorted folders in current directory
  const currentFolders = useMemo(() => {
    let list = folders.filter(f => f.parent_id === activeFolderId);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(f => f.name.toLowerCase().includes(q));
    }
    return list;
  }, [folders, activeFolderId, searchQuery]);

  // Filtered/Sorted files in current directory
  const filteredFiles = useMemo(() => {
    let list = files.filter(f => f.folder_id === activeFolderId);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        f => f.name.toLowerCase().includes(q) || f.uploaded_by_name.toLowerCase().includes(q),
      );
    }
    if (statusFilter !== 'All') {
      list = list.filter(f => f.status === statusFilter);
    }
    list.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'date') return new Date(b.upload_date).getTime() - new Date(a.upload_date).getTime();
      if (sortBy === 'size') return b.size_bytes - a.size_bytes;
      return 0;
    });
    return list;
  }, [files, activeFolderId, searchQuery, statusFilter, sortBy]);

  // Paginated files
  const paginatedFiles = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredFiles.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredFiles, currentPage]);

  const totalPages = useMemo(() => {
    return Math.ceil(filteredFiles.length / ITEMS_PER_PAGE) || 1;
  }, [filteredFiles]);

  // Drag and Drop triggers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  // Real upload — sends file to POST /documents/upload via FormData
  const processUpload = async (file: File) => {
    try {
      const uploaded = await uploadFile(file, activeFolderId);
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      const ext = file.name.split('.').pop()?.toLowerCase() ?? 'other';

      // Update local storage breakdown (no API backing)
      const increment = file.size / (1024 * 1024 * 1024); // bytes -> GB
      setStorageBreakdown(prev =>
        prev.map(cat => {
          if (cat.name === 'Documents' && ['pdf', 'docx'].includes(ext)) {
            return { ...cat, used: parseFloat((cat.used + increment).toFixed(3)) };
          }
          if (cat.name === 'Images' && ['png', 'jpg', 'jpeg'].includes(ext)) {
            return { ...cat, used: parseFloat((cat.used + increment).toFixed(3)) };
          }
          if (cat.name === 'Spreadsheets' && ['xlsx', 'xls', 'csv'].includes(ext)) {
            return { ...cat, used: parseFloat((cat.used + increment).toFixed(3)) };
          }
          return cat;
        }),
      );

      setActivities(prev => [
        {
          id: `act-${Date.now()}`,
          action: 'uploaded' as const,
          details: `Uploaded ${uploaded.name}${activeFolder ? ` in ${activeFolder.name}` : ''}`,
          time: 'Baru saja',
          user: 'You',
        },
        ...prev,
      ]);

      appSwal.success({
        title: t('swal.success.saved.title', { entity: 'file' }),
        text: `${uploaded.name} (${sizeMB} MB) uploaded to R2.`,
      });
    } catch (err) {
      await appSwal.errorCreateFailed('file', getApiErrorMessage(err));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.[0]) {
      void processUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      void processUpload(e.target.files[0]);
      // Reset input so the same file can be re-selected
      e.target.value = '';
    }
  };

  // Create folder action
  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    try {
      const folder = await createFolder({ name: newFolderName.trim(), parent_id: activeFolderId });
      setNewFolderName('');
      setIsFolderModalOpen(false);
      setActivities(prev => [
        {
          id: `act-${Date.now()}`,
          action: 'created_folder' as const,
          details: `Created folder ${folder.name}`,
          time: 'Baru saja',
          user: 'You',
        },
        ...prev,
      ]);
      appSwal.successCreated('folder', folder.name);
    } catch (err) {
      await appSwal.errorCreateFailed('folder', getApiErrorMessage(err));
    }
  };

  // Delete folder
  const handleDeleteFolder = async (folder: DocumentFolder) => {
    const confirmed = await appSwal.confirmDelete(folder.name, 'folder');
    if (!confirmed) return;
    try {
      await deleteFolder(folder.id);
      setActivities(prev => [
        {
          id: `act-${Date.now()}`,
          action: 'deleted' as const,
          details: `Deleted folder ${folder.name} and its contents`,
          time: 'Baru saja',
          user: 'You',
        },
        ...prev,
      ]);
      appSwal.successDeleted('folder', folder.name);
    } catch (err) {
      await appSwal.errorDeleteFailed('folder', getApiErrorMessage(err));
    }
  };

  const handleDeleteFile = async (file: DocumentFile) => {
    const confirmed = await appSwal.confirmDelete(file.name, 'file');
    if (!confirmed) return;
    try {
      await deleteDocument(file.id);
      setActivities(prev => [
        {
          id: `act-${Date.now()}`,
          action: 'deleted' as const,
          details: `Deleted ${file.name} from R2`,
          time: 'Baru saja',
          user: 'You',
        },
        ...prev,
      ]);
      appSwal.successDeleted('file', file.name);
    } catch (err) {
      await appSwal.errorDeleteFailed('file', getApiErrorMessage(err));
    }
  };

  // Rename item
  const openRenameModal = (id: string, type: 'folder' | 'file', name: string) => {
    setRenameTarget({ id, type, currentName: name });
    setRenameInputValue(name);
    setIsRenameModalOpen(true);
    setActiveFolderMenuId(null);
    setActiveFileMenuId(null);
  };

  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameTarget || !renameInputValue.trim()) return;
    try {
      if (renameTarget.type === 'folder') {
        await updateFolder(renameTarget.id, { name: renameInputValue.trim() });
        appSwal.successUpdated('folder', renameInputValue);
      } else {
        await updateDocument(renameTarget.id, { name: renameInputValue.trim() });
        appSwal.successUpdated('file', renameInputValue);
      }
      setActivities(prev => [
        {
          id: `act-${Date.now()}`,
          action: 'renamed' as const,
          details: `Renamed ${renameTarget.currentName} → ${renameInputValue}`,
          time: 'Baru saja',
          user: 'You',
        },
        ...prev,
      ]);
      setIsRenameModalOpen(false);
      setRenameTarget(null);
    } catch (err) {
      await appSwal.errorUpdateFailed(renameTarget.type, getApiErrorMessage(err));
    }
  };

  // Move folder/file destination modal
  const openMoveModal = (id: string, type: 'folder' | 'file') => {
    setMoveTarget({ id, type });
    setSelectedDestinationFolder(activeFolderId ?? 'root');
    setIsMoveModalOpen(true);
    setActiveFolderMenuId(null);
    setActiveFileMenuId(null);
  };

  const handleMoveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!moveTarget) return;

    const destFolderId = selectedDestinationFolder === 'root' ? null : selectedDestinationFolder;
    const destFolderName =
      selectedDestinationFolder === 'root'
        ? t('documents.modals.rootFolder')
        : folders.find(f => f.id === selectedDestinationFolder)?.name ?? 'Destination Folder';

    if (moveTarget.type === 'folder' && moveTarget.id === destFolderId) {
      appSwal.error({
        title: 'Gagal Memindahkan',
        text: 'Tidak dapat memindahkan folder ke dalam dirinya sendiri.',
      });
      return;
    }

    const itemName =
      moveTarget.type === 'folder'
        ? folders.find(f => f.id === moveTarget.id)?.name ?? 'Folder'
        : files.find(f => f.id === moveTarget.id)?.name ?? 'File';

    try {
      if (moveTarget.type === 'folder') {
        await updateFolder(moveTarget.id, { name: itemName }); // API only supports rename for folders, no parent_id update
      } else {
        await updateDocument(moveTarget.id, { folder_id: destFolderId });
      }
      setActivities(prev => [
        {
          id: `act-${Date.now()}`,
          action: 'moved' as const,
          details: `Moved ${itemName} to ${destFolderName}`,
          time: 'Baru saja',
          user: 'You',
        },
        ...prev,
      ]);
      appSwal.success({ title: 'Item Dipindahkan', text: `${itemName} dipindahkan ke ${destFolderName}.` });
      setIsMoveModalOpen(false);
      setMoveTarget(null);
    } catch (err) {
      await appSwal.errorUpdateFailed(moveTarget.type, getApiErrorMessage(err));
    }
  };

  const handlePreview = async (file: DocumentFile) => {
    setPreviewFile(file);
    setPreviewUrl('');
    setIsPreviewOpen(true);
    setActiveFileMenuId(null);

    if (['png', 'jpg', 'jpeg'].includes(file.type.toLowerCase())) {
      try {
        const { url } = await documentService.getDownloadUrl(file.id);
        setPreviewUrl(url);
      } catch (err) {
        console.error('Failed to fetch preview URL', err);
      }
    }
  };

  // Download via presigned R2 URL
  const handleDownload = async (fileId: string, fileName: string) => {
    try {
      await downloadDocument(fileId);
    } catch {
      appSwal.info({
        title: t('documents.actions.download'),
        text: `Gagal mendapatkan URL unduhan untuk ${fileName}.`,
      });
    }
  };

  // Render Status Badge
  const renderStatus = (status: FileStatus) => {
    const tones = {
      Verified: 'success',
      Pending: 'warning',
      Archived: 'neutral',
    } as const;

    const icons = {
      Verified: <CheckCircle2 className="h-3.5 w-3.5" />,
      Pending: <AlertCircle className="h-3.5 w-3.5" />,
      Archived: <Archive className="h-3.5 w-3.5" />,
    };

    return (
      <Badge tone={tones[status]} className="uppercase tracking-wider">
        {icons[status]}
        {status}
      </Badge>
    );
  };

  // Helper to render linked type badges (Template, Inspection, CPS)
  const renderReferenceBadge = (type: ReferenceType | null, id: string | null) => {
    if (!type) return null;

    const styles = {
      template: 'bg-primary-blue/5 text-primary-blue border border-primary-blue/15',
      inspection: 'bg-success-green/5 text-success-green border border-success-green/15',
      cps: 'bg-warning-amber/5 text-warning-amber border border-warning-amber/15',
      manual: 'bg-secondary text-muted-foreground border border-divider',
    };

    const labels = {
      template: 'Template',
      inspection: 'Inspection',
      cps: 'CPS Audit',
      manual: 'Manual SOP',
    };

    return (
      <div className="flex items-center gap-1">
        <span
          className={cn(
            'inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider',
            styles[type],
          )}
        >
          <LinkIcon className="w-3 h-3" />
          {labels[type]}
        </span>
        {id && (
          <span className="text-[10px] font-semibold text-muted-foreground bg-secondary px-1 py-0.5 rounded">
            #{id}
          </span>
        )}
      </div>
    );
  };

  // Helper for folder parent options in Move modal
  const assignableFoldersForMove = useMemo(() => {
    if (!moveTarget) return [];
    if (moveTarget.type === 'folder') {
      return folders.filter(f => f.id !== moveTarget.id);
    }
    return folders;
  }, [folders, moveTarget]);

  return (
    <div className="page-shell">

      {/* Header */}
      <PageHeader
        eyebrow="Dokumen"
        title={t('documents.title')}
        subtitle={t('documents.subtitle')}
        actions={
          <>
            <IconButton
              onClick={() => fetchFolders(activeFolderId)}
              disabled={isLoading}
              aria-label="Refresh"
            >
              <RefreshCcw className={cn('h-5 w-5', isLoading && 'animate-spin')} />
            </IconButton>
            <Can resource="documents" action="create">
              <Button
                variant="secondary"
                onClick={() => setIsFolderModalOpen(true)}
                disabled={isLoading || isSaving}
                icon={<FolderPlus className="h-4 w-4" />}
              >
                {t('documents.actions.createFolder')}
              </Button>
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading || isSaving}
                icon={<UploadCloud className="h-4 w-4" />}
              >
                {t('documents.actions.upload')}
              </Button>
            </Can>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
              accept=".pdf,.docx,.xlsx,.xls,.png,.jpg,.jpeg,.csv"
            />
          </>
        }
      />

      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-sm">
        {breadcrumbs.map((crumb, idx) => (
          <React.Fragment key={idx}>
            {idx > 0 && <ChevronRight className="h-4 w-4 text-stone/60" />}
            <button
              onClick={() => {
                setActiveFolderId(crumb.id);
                setCurrentPage(1);
              }}
              className={cn(
                'font-medium transition hover:text-primary-blue',
                idx === breadcrumbs.length - 1 ? 'font-semibold text-ink-deep' : 'text-stone',
              )}
            >
              {crumb.name}
            </button>
          </React.Fragment>
        ))}
      </div>

      {/* Toolbar / Search & Filters */}
      <div className="toolbar">
        <div className="relative w-full sm:max-w-md">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone" />
          <input
            value={searchQuery}
            onChange={e => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="form-input pl-11"
            placeholder={t('documents.searchPlaceholder')}
            disabled={isLoading}
          />
        </div>

        <div className="flex w-full items-center justify-end gap-3 sm:w-auto">
          {/* Status Filter */}
          <Select
            value={statusFilter}
            onChange={e => {
              setStatusFilter(e.target.value as FileStatus | 'All');
              setCurrentPage(1);
            }}
            className="w-auto"
            disabled={isLoading}
          >
            <option value="All">{t('documents.status.all')}</option>
            <option value="Verified">{t('documents.status.verified')}</option>
            <option value="Pending">{t('documents.status.pending')}</option>
            <option value="Archived">{t('documents.status.archived')}</option>
          </Select>

          {/* Sort Filter */}
          <Select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as 'name' | 'date' | 'size')}
            className="w-auto"
            disabled={isLoading}
          >
            <option value="name">{t('documents.sort.name')}</option>
            <option value="date">{t('documents.sort.date')}</option>
            <option value="size">{t('documents.sort.size')}</option>
          </Select>
        </div>
      </div>

      {/* Grid: 2 columns layout on large screens */}
      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
        
        {/* Main Work Area */}
        <div className="space-y-6 min-w-0">
          
          {/* FOLDERS GRID SECTION */}
          {(isLoading || currentFolders.length > 0) && (
            <div className="space-y-3">
              <Eyebrow>
                {t('documents.foldersTitle')} ({currentFolders.length})
              </Eyebrow>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, idx) => (
                    <div
                      key={idx}
                      className="panel flex animate-pulse items-center gap-3 p-4"
                    >
                      <div className="h-10 w-10 shrink-0 rounded-full bg-surface"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-3/4 rounded bg-surface"></div>
                        <div className="h-3 w-1/2 rounded bg-surface"></div>
                      </div>
                    </div>
                  ))
                ) : (
                  currentFolders.map(folder => (
                    <Card
                      key={folder.id}
                      interactive
                      className="group relative flex items-center justify-between p-4"
                      onClick={() => {
                        setActiveFolderId(folder.id);
                        setCurrentPage(1);
                      }}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-blue/10 text-primary-blue">
                          <Folder className="h-5 w-5 fill-primary-blue/10" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-semibold text-ink-deep">
                            {folder.name}
                          </h3>
                          <p className="mt-0.5 text-xs text-stone">
                            {folder.totalFiles} files · {folder.created_by_name}
                          </p>
                        </div>
                      </div>

                      {/* Dropdown Menu actions */}
                      <div
                        className="relative"
                        onClick={e => {
                          e.stopPropagation();
                        }}
                      >
                        <RowAction
                          onClick={() =>
                            setActiveFolderMenuId(activeFolderMenuId === folder.id ? null : folder.id)
                          }
                          aria-label="Menu"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </RowAction>
                        {activeFolderMenuId === folder.id && (
                          <div className="absolute right-0 top-full z-10 mt-1 w-36 rounded-2xl border border-hairline-soft bg-card p-1 shadow-lg animate-fade-in">
                            <Can resource="documents" action="update">
                              <button
                                onClick={() => openRenameModal(folder.id, 'folder', folder.name)}
                                className="flex w-full items-center gap-2 rounded-full px-3 py-2 text-left text-xs font-medium text-ink-deep hover:bg-surface"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                                {t('documents.actions.rename')}
                              </button>
                              <button
                                onClick={() => openMoveModal(folder.id, 'folder')}
                                className="flex w-full items-center gap-2 rounded-full px-3 py-2 text-left text-xs font-medium text-ink-deep hover:bg-surface"
                              >
                                <Move className="h-3.5 w-3.5" />
                                {t('documents.actions.move')}
                              </button>
                            </Can>
                            <Can resource="documents" action="delete">
                              <hr className="my-1 border-hairline-soft" />
                              <button
                                onClick={() => handleDeleteFolder(folder)}
                                className="flex w-full items-center gap-2 rounded-full px-3 py-2 text-left text-xs font-semibold text-danger-red hover:bg-danger-red/5"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                {t('documents.actions.delete')}
                              </button>
                            </Can>
                          </div>
                        )}
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </div>
          )}

          {/* FILES TABLE SECTION */}
          <div className="space-y-3">
            <Eyebrow>
              {t('documents.filesTitle')} ({filteredFiles.length})
            </Eyebrow>

            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="table-header">
                    <tr>
                      <th className="px-6 py-3.5">{t('documents.table.name')}</th>
                      <th className="px-6 py-3.5">{t('documents.table.reference')}</th>
                      <th className="px-6 py-3.5">{t('documents.table.uploadedBy')}</th>
                      <th className="px-6 py-3.5">{t('documents.table.size')}</th>
                      <th className="px-6 py-3.5">{t('documents.table.date')}</th>
                      <th className="px-6 py-3.5">{t('documents.table.status')}</th>
                      <th className="px-6 py-3.5 text-right">{t('documents.table.actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline-soft">
                    {isLoading ? (
                      <>
                        <SkeletonRow />
                        <SkeletonRow />
                        <SkeletonRow />
                      </>
                    ) : filteredFiles.length === 0 ? (
                      <tr>
                        <td colSpan={7}>
                          <EmptyState
                            icon={<File className="h-6 w-6" />}
                            title={t('documents.empty.title')}
                            description={t('documents.empty.subtitle')}
                          />
                        </td>
                      </tr>
                    ) : (
                      paginatedFiles.map(file => (
                        <tr
                          key={file.id}
                          className="transition-colors hover:bg-surface/60"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-surface text-slate">
                                <FileText className="h-4 w-4" />
                              </div>
                              <div className="min-w-0 max-w-[200px]">
                                <p className="truncate text-sm font-semibold leading-snug text-ink-deep">
                                  {file.name}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-ink-deep">
                            {renderReferenceBadge(file.reference_type, file.reference_id)}
                          </td>
                          <td className="px-6 py-4 text-sm text-ink-deep">
                            {file.uploaded_by_name}
                          </td>
                          <td className="px-6 py-4 text-sm text-stone">
                            {file.size}
                          </td>
                          <td className="px-6 py-4 text-sm text-stone">
                            {file.upload_date}
                          </td>
                          <td className="px-6 py-4">
                            {renderStatus(file.status)}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div
                              className="relative inline-block text-left"
                              onClick={e => e.stopPropagation()}
                            >
                              <RowAction
                                onClick={() =>
                                  setActiveFileMenuId(activeFileMenuId === file.id ? null : file.id)
                                }
                                aria-label="Menu"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </RowAction>
                              {activeFileMenuId === file.id && (
                                <div className="absolute right-0 top-full z-10 mt-1 w-40 rounded-2xl border border-hairline-soft bg-card p-1 shadow-lg animate-fade-in">
                                  <button
                                    onClick={() => handlePreview(file)}
                                    className="flex w-full items-center gap-2 rounded-full px-3 py-2 text-left text-xs font-medium text-ink-deep hover:bg-surface"
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                    {t('documents.actions.preview')}
                                  </button>
                                  <button
                                    onClick={() => handleDownload(file.id, file.name)}
                                    className="flex w-full items-center gap-2 rounded-full px-3 py-2 text-left text-xs font-medium text-ink-deep hover:bg-surface"
                                  >
                                    <Download className="h-3.5 w-3.5" />
                                    {t('documents.actions.download')}
                                  </button>
                                  <Can resource="documents" action="update">
                                    <button
                                      onClick={() => openRenameModal(file.id, 'file', file.name)}
                                      className="flex w-full items-center gap-2 rounded-full px-3 py-2 text-left text-xs font-medium text-ink-deep hover:bg-surface"
                                    >
                                      <Edit2 className="h-3.5 w-3.5" />
                                      {t('documents.actions.rename')}
                                    </button>
                                    <button
                                      onClick={() => openMoveModal(file.id, 'file')}
                                      className="flex w-full items-center gap-2 rounded-full px-3 py-2 text-left text-xs font-medium text-ink-deep hover:bg-surface"
                                    >
                                      <Move className="h-3.5 w-3.5" />
                                      {t('documents.actions.move')}
                                    </button>
                                  </Can>
                                  <Can resource="documents" action="delete">
                                    <hr className="my-1 border-hairline-soft" />
                                    <button
                                      onClick={() => handleDeleteFile(file)}
                                      className="flex w-full items-center gap-2 rounded-full px-3 py-2 text-left text-xs font-semibold text-danger-red hover:bg-danger-red/5"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                      {t('documents.actions.delete')}
                                    </button>
                                  </Can>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination UI */}
              {filteredFiles.length > ITEMS_PER_PAGE && !isLoading && (
                <div className="flex items-center justify-between border-t border-hairline-soft bg-card px-6 py-4">
                  <span className="text-xs text-stone">
                    {t('documents.table.paginationText', {
                      start: (currentPage - 1) * ITEMS_PER_PAGE + 1,
                      end: Math.min(currentPage * ITEMS_PER_PAGE, filteredFiles.length),
                      total: filteredFiles.length,
                    })}
                  </span>
                  <div className="flex items-center gap-2">
                    <IconButton
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="h-9 w-9"
                      aria-label="Previous"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </IconButton>
                    <span className="flex items-center rounded-full border border-hairline-soft bg-surface px-3 text-xs font-semibold tabular-nums">
                      {currentPage} / {totalPages}
                    </span>
                    <IconButton
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="h-9 w-9"
                      aria-label="Next"
                    >
                      <ChevronRightIcon className="h-4 w-4" />
                    </IconButton>
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* DRAG-AND-DROP FILE UPLOAD AREA */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              'flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-8 text-center transition',
              isDragging
                ? 'border-primary-blue bg-primary-blue/5'
                : 'border-hairline bg-card hover:border-primary-blue/40',
            )}
            onClick={() => fileInputRef.current?.click()}
          >
            <UploadCloud className="h-10 w-10 animate-bounce text-primary-blue" />
            <div>
              <p className="text-sm font-semibold text-ink-deep">
                {t('documents.uploadArea.dragDrop')}
              </p>
              <p className="mt-1 text-xs text-stone">
                {t('documents.uploadArea.supportText')}
              </p>
            </div>
            <Button variant="subtle" size="sm">
              {t('documents.uploadArea.orBrowse')}
            </Button>
          </div>
        </div>

        {/* Sidebar Info Panels */}
        <div className="space-y-5">

          {/* STORAGE USAGE PANEL */}
          <Card className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-primary-blue" />
              <h2 className="text-sm font-semibold text-ink-deep">
                {t('documents.storage.title')}
              </h2>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-2xl font-semibold tracking-tight text-ink-deep tabular-nums">
                  {totalStorageUsed} GB
                </p>
                <p className="mt-0.5 text-xs text-stone">
                  {t('documents.storage.usedOf')} {totalStorageCapacity} GB
                </p>
              </div>

              {/* Progress visual bar */}
              <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-surface">
                {storageBreakdown.map(cat => (
                  <div
                    key={cat.name}
                    className={cat.color_class}
                    style={{ width: `${(cat.used / totalStorageCapacity) * 100}%` }}
                    title={`${cat.name}: ${cat.used} GB`}
                  />
                ))}
              </div>

              {/* Category legends */}
              <div className="space-y-2 border-t border-hairline-soft pt-2">
                {storageBreakdown.map(cat => (
                  <div key={cat.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', cat.color_class)} />
                      <span className="font-medium text-stone">{cat.name}</span>
                    </div>
                    <span className="font-semibold text-ink-deep">{cat.used} GB</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* RECENT ACTIVITY STREAM */}
          <Card className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary-blue" />
              <h2 className="text-sm font-semibold text-ink-deep">
                {t('documents.activity.title')}
              </h2>
            </div>

            <div className="max-h-[300px] space-y-4 overflow-y-auto pr-1">
              {activities.length === 0 ? (
                <p className="py-4 text-center text-xs text-stone">{t('documents.activity.empty')}</p>
              ) : (
                activities.map(log => (
                  <div key={log.id} className="relative flex items-start gap-3 border-l-2 border-hairline-soft pl-3">
                    <span className="absolute -left-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-primary-blue" />
                    <div className="min-w-0">
                      <p className="break-words text-xs font-semibold leading-snug text-ink-deep">
                        {log.details}
                      </p>
                      <p className="mt-1 text-[10px] text-stone">
                        {log.time} · {log.user}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* CREATE FOLDER MODAL */}
      <Modal
        open={isFolderModalOpen}
        onClose={() => setIsFolderModalOpen(false)}
        eyebrow="Baru"
        title={t('documents.modals.createFolderTitle')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsFolderModalOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" form="folder-form" icon={<Plus className="h-4 w-4" />}>
              {t('common.create')}
            </Button>
          </>
        }
      >
        <form id="folder-form" onSubmit={handleCreateFolder} className="space-y-4">
          <Field label={t('documents.modals.folderName')}>
            <Input
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              placeholder={t('documents.modals.folderPlaceholder')}
              autoFocus
            />
          </Field>
        </form>
      </Modal>

      {/* RENAME MODAL */}
      <Modal
        open={isRenameModalOpen && !!renameTarget}
        onClose={() => setIsRenameModalOpen(false)}
        eyebrow="Edit"
        title={renameTarget ? `${t('documents.modals.renameTitle')}: ${renameTarget.currentName}` : ''}
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsRenameModalOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" form="rename-form">
              {t('common.save')}
            </Button>
          </>
        }
      >
        <form id="rename-form" onSubmit={handleRenameSubmit} className="space-y-4">
          <Field label={t('documents.modals.renamePlaceholder')}>
            <Input
              value={renameInputValue}
              onChange={e => setRenameInputValue(e.target.value)}
              autoFocus
            />
          </Field>
        </form>
      </Modal>

      {/* MOVE MODAL */}
      <Modal
        open={isMoveModalOpen && !!moveTarget}
        onClose={() => setIsMoveModalOpen(false)}
        eyebrow="Pindah"
        title={t('documents.modals.moveTitle')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsMoveModalOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" form="move-form" icon={<Move className="h-4 w-4" />}>
              {t('documents.actions.move')}
            </Button>
          </>
        }
      >
        <form id="move-form" onSubmit={handleMoveSubmit} className="space-y-4">
          <Field label={t('documents.modals.selectFolder')}>
            <Select
              value={selectedDestinationFolder}
              onChange={e => setSelectedDestinationFolder(e.target.value)}
            >
              <option value="root">{t('documents.modals.rootFolder')}</option>
              {assignableFoldersForMove.map(f => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </Select>
          </Field>
        </form>
      </Modal>

      {/* PREVIEW MODAL */}
      <Modal
        open={isPreviewOpen && !!previewFile}
        onClose={() => setIsPreviewOpen(false)}
        eyebrow="Preview"
        title={t('documents.modals.previewMetadata')}
        size="xl"
      >
        {previewFile && (
          <div className="-mx-6 -my-5 flex flex-col overflow-hidden md:flex-row">
            {/* Left Box: Graphic / File View */}
            <div className="flex max-h-[450px] min-h-[300px] flex-1 items-center justify-center border-b border-hairline-soft bg-surface p-6 md:border-b-0 md:border-r">
              {['png', 'jpg', 'jpeg'].includes(previewFile.type.toLowerCase()) ? (
                <div className="flex w-full flex-col items-center justify-center text-center">
                  {previewUrl ? (
                    <div className="max-h-[320px] max-w-full overflow-hidden rounded-2xl border border-hairline-soft bg-card shadow-soft-sm">
                      <img
                        src={previewUrl}
                        alt={previewFile.name}
                        className="max-h-[320px] object-contain"
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCcw className="h-8 w-8 animate-spin text-primary-blue" />
                      <span className="text-xs text-stone">Memuat gambar...</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-4 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-blue/10 text-primary-blue shadow-inner">
                    <FileText className="h-8 w-8" />
                  </div>
                  <div>
                    <p className="text-base font-semibold text-ink-deep">{previewFile.name}</p>
                    <p className="mt-1 text-xs uppercase text-stone">
                      {previewFile.type} DOCUMENT
                    </p>
                  </div>
                  <span className="max-w-xs text-[11px] leading-relaxed text-stone">
                    {t('documents.modals.unsupportedPreview', { type: previewFile.type.toUpperCase() })}
                  </span>
                </div>
              )}
            </div>

            {/* Right Box: Metadata Details */}
            <div className="flex w-full flex-col justify-between p-5 md:w-[280px]">
              <div className="space-y-3.5">
                <div>
                  <Eyebrow>{t('documents.table.name')}</Eyebrow>
                  <p className="mt-0.5 break-all text-xs font-semibold leading-snug text-ink-deep">
                    {previewFile.name}
                  </p>
                </div>

                <div>
                  <Eyebrow>{t('documents.table.type')}</Eyebrow>
                  <p className="mt-0.5 text-xs font-semibold uppercase text-ink-deep">
                    {previewFile.type}
                  </p>
                </div>

                <div>
                  <Eyebrow>{t('documents.table.size')}</Eyebrow>
                  <p className="mt-0.5 text-xs font-semibold text-ink-deep">
                    {previewFile.size}
                  </p>
                </div>

                <div>
                  <Eyebrow>R2 Object Key</Eyebrow>
                  <p className="mt-0.5 break-all rounded-lg bg-surface p-1 font-mono text-[10px] text-stone">
                    {previewFile.r2_key}
                  </p>
                </div>

                <div>
                  <Eyebrow>{t('documents.table.reference')}</Eyebrow>
                  <div className="mt-1">
                    {renderReferenceBadge(previewFile.reference_type, previewFile.reference_id)}
                  </div>
                </div>

                <div>
                  <Eyebrow>{t('documents.table.date')}</Eyebrow>
                  <p className="mt-0.5 text-xs font-semibold text-ink-deep">
                    {previewFile.upload_date}
                  </p>
                </div>

                <div>
                  <Eyebrow className="mb-1">{t('documents.table.status')}</Eyebrow>
                  {renderStatus(previewFile.status)}
                </div>
              </div>

              {/* Modal footer CTA */}
              <div className="mt-5 flex gap-2 border-t border-hairline-soft pt-5">
                <Button variant="secondary" size="sm" block onClick={() => setIsPreviewOpen(false)}>
                  {t('common.close')}
                </Button>
                <Button
                  size="sm"
                  block
                  onClick={() => handleDownload(previewFile.id, previewFile.name)}
                  icon={<Download className="h-3 w-3" />}
                >
                  {t('common.download')}
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
};

export default DocumentManagementPage;
