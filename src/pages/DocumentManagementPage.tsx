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
  X,
  Edit2,
  Move,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  Link as LinkIcon,
} from 'lucide-react';
import { cn } from '../utils/cn';
import { appSwal } from '../lib/appSwal';
import { SkeletonRow } from '../components/ui/SkeletonLoader';
import type {
  DocumentFolder,
  DocumentFile,
  ActivityLog,
  StorageCategory,
  FileStatus,
  ReferenceType,
} from '../types/document';

// Refactored Mock Data to strictly match the Golang snake_case schema
const INITIAL_FOLDERS: DocumentFolder[] = [
  {
    id: 'fld-1',
    org_id: 'org-gtech-001',
    name: 'Standard Operating Procedures (SOP)',
    totalFiles: 3,
    created_at: '2026-05-10T14:32:00Z',
    updated_at: '2026-05-10T14:32:00Z',
    created_by_id: 'user-01',
    created_by_name: 'Budi Santoso',
    parent_id: null,
  },
  {
    id: 'fld-2',
    org_id: 'org-gtech-001',
    name: 'Inspection Photos',
    totalFiles: 3,
    created_at: '2026-05-22T09:15:00Z',
    updated_at: '2026-05-22T09:15:00Z',
    created_by_id: 'user-02',
    created_by_name: 'Riko Pratama',
    parent_id: null,
  },
  {
    id: 'fld-3',
    org_id: 'org-gtech-001',
    name: 'Dealer Certifications',
    totalFiles: 2,
    created_at: '2026-05-18T10:00:00Z',
    updated_at: '2026-05-18T10:00:00Z',
    created_by_id: 'user-03',
    created_by_name: 'Dewi Lestari',
    parent_id: null,
  },
  {
    id: 'fld-4',
    org_id: 'org-gtech-001',
    name: 'Avanza PDI Reports',
    totalFiles: 2,
    created_at: '2026-05-20T11:00:00Z',
    updated_at: '2026-05-20T11:00:00Z',
    created_by_id: 'user-02',
    created_by_name: 'Riko Pratama',
    parent_id: 'fld-2', // Nesting under Inspection Photos
  },
];

const INITIAL_FILES: DocumentFile[] = [
  {
    id: 'file-1',
    org_id: 'org-gtech-001',
    name: 'SOP_Body_Repair_v2.pdf',
    type: 'pdf',
    uploaded_by_id: 'user-01',
    uploaded_by_name: 'Budi Santoso',
    size: '3.2 MB',
    size_bytes: 3355443,
    status: 'Verified',
    folder_id: 'fld-1',
    r2_key: 'org-gtech-001/documents/file-1.pdf',
    reference_type: 'template',
    reference_id: 'tpl-001',
    upload_date: '2026-05-10',
    created_at: '2026-05-10T14:32:00Z',
  },
  {
    id: 'file-2',
    org_id: 'org-gtech-001',
    name: 'SOP_Engine_Grooming.docx',
    type: 'docx',
    uploaded_by_id: 'user-01',
    uploaded_by_name: 'Budi Santoso',
    size: '1.8 MB',
    size_bytes: 1887436,
    status: 'Verified',
    folder_id: 'fld-1',
    r2_key: 'org-gtech-001/documents/file-2.docx',
    reference_type: 'template',
    reference_id: 'tpl-002',
    upload_date: '2026-05-08',
    created_at: '2026-05-08T09:12:00Z',
  },
  {
    id: 'file-3',
    org_id: 'org-gtech-001',
    name: 'Safety_Audit_Checklist.xlsx',
    type: 'xlsx',
    uploaded_by_id: 'user-01',
    uploaded_by_name: 'Budi Santoso',
    size: '750 KB',
    size_bytes: 768000,
    status: 'Pending',
    folder_id: 'fld-1',
    r2_key: 'org-gtech-001/documents/file-3.xlsx',
    reference_type: 'cps',
    reference_id: 'cps-551',
    upload_date: '2026-05-12',
    created_at: '2026-05-12T10:45:00Z',
  },
  {
    id: 'file-4',
    org_id: 'org-gtech-001',
    name: 'Dealer_Front_Audi_BSD.jpg',
    type: 'jpg',
    uploaded_by_id: 'user-02',
    uploaded_by_name: 'Riko Pratama',
    size: '4.1 MB',
    size_bytes: 4300000,
    status: 'Verified',
    folder_id: 'fld-4',
    r2_key: 'org-gtech-001/inspections/file-4.jpg',
    reference_type: 'inspection',
    reference_id: 'insp-9082',
    upload_date: '2026-05-22',
    created_at: '2026-05-22T11:40:00Z',
  },
  {
    id: 'file-5',
    org_id: 'org-gtech-001',
    name: 'Engine_Compartment_Detail.png',
    type: 'png',
    uploaded_by_id: 'user-02',
    uploaded_by_name: 'Riko Pratama',
    size: '3.8 MB',
    size_bytes: 3984588,
    status: 'Verified',
    folder_id: 'fld-4',
    r2_key: 'org-gtech-001/inspections/file-5.png',
    reference_type: 'inspection',
    reference_id: 'insp-9082',
    upload_date: '2026-05-21',
    created_at: '2026-05-21T15:20:00Z',
  },
  {
    id: 'file-6',
    org_id: 'org-gtech-001',
    name: 'Laporan_Kelayakan_Bengkel.pdf',
    type: 'pdf',
    uploaded_by_id: 'user-02',
    uploaded_by_name: 'Riko Pratama',
    size: '2.1 MB',
    size_bytes: 2202009,
    status: 'Archived',
    folder_id: 'fld-2',
    r2_key: 'org-gtech-001/documents/file-6.pdf',
    reference_type: 'manual',
    reference_id: null,
    upload_date: '2026-05-20',
    created_at: '2026-05-20T09:15:00Z',
  },
  {
    id: 'file-7',
    org_id: 'org-gtech-001',
    name: 'Sertifikat_Kepatuhan_ISO.pdf',
    type: 'pdf',
    uploaded_by_id: 'user-03',
    uploaded_by_name: 'Dewi Lestari',
    size: '1.5 MB',
    size_bytes: 1572864,
    status: 'Verified',
    folder_id: 'fld-3',
    r2_key: 'org-gtech-001/certs/file-7.pdf',
    reference_type: 'manual',
    reference_id: null,
    upload_date: '2026-05-18',
    created_at: '2026-05-18T10:00:00Z',
  },
  {
    id: 'file-8',
    org_id: 'org-gtech-001',
    name: 'Branch_Licensing_A1.pdf',
    type: 'pdf',
    uploaded_by_id: 'user-03',
    uploaded_by_name: 'Dewi Lestari',
    size: '950 KB',
    size_bytes: 972800,
    status: 'Pending',
    folder_id: 'fld-3',
    r2_key: 'org-gtech-001/certs/file-8.pdf',
    reference_type: 'manual',
    reference_id: null,
    upload_date: '2026-05-17',
    created_at: '2026-05-17T11:30:00Z',
  },
  {
    id: 'file-9',
    org_id: 'org-gtech-001',
    name: 'Unsorted_Auditor_Manual.pdf',
    type: 'pdf',
    uploaded_by_id: 'system',
    uploaded_by_name: 'System',
    size: '5.4 MB',
    size_bytes: 5662310,
    status: 'Verified',
    folder_id: null, // Root
    r2_key: 'org-gtech-001/documents/file-9.pdf',
    reference_type: 'manual',
    reference_id: null,
    upload_date: '2026-05-24',
    created_at: '2026-05-24T08:15:00Z',
  },
  {
    id: 'file-10',
    org_id: 'org-gtech-001',
    name: 'Grooming_Guidelines.pdf',
    type: 'pdf',
    uploaded_by_id: 'system',
    uploaded_by_name: 'System',
    size: '2.8 MB',
    size_bytes: 2936012,
    status: 'Pending',
    folder_id: null, // Root
    r2_key: 'org-gtech-001/documents/file-10.pdf',
    reference_type: 'template',
    reference_id: 'tpl-003',
    upload_date: '2026-05-23',
    created_at: '2026-05-23T10:05:00Z',
  },
];

const INITIAL_ACTIVITIES: ActivityLog[] = [
  {
    id: 'act-1',
    action: 'uploaded',
    details: 'Uploaded SOP_Body_Repair_v2.pdf in folder Standard Operating Procedures (SOP)',
    time: '10 Mei 2026, 14:32',
    user: 'Budi Santoso',
  },
  {
    id: 'act-2',
    action: 'created_folder',
    details: 'Created folder Avanza PDI Reports',
    time: '20 Mei 2026, 09:15',
    user: 'Riko Pratama',
  },
  {
    id: 'act-3',
    action: 'uploaded',
    details: 'Uploaded Dealer_Front_Audi_BSD.jpg',
    time: '22 Mei 2026, 11:40',
    user: 'Riko Pratama',
  },
  {
    id: 'act-4',
    action: 'renamed',
    details: 'Renamed manual_draft.pdf to Grooming_Guidelines.pdf',
    time: '23 Mei 2026, 10:05',
    user: 'System',
  },
];

const INITIAL_STORAGE: StorageCategory[] = [
  { name: 'Documents', used: 15.8, total: 20, color_class: 'bg-primary-blue' },
  { name: 'Images', used: 7.9, total: 10, color_class: 'bg-success-green' },
  { name: 'Spreadsheets', used: 1.5, total: 5, color_class: 'bg-warning-amber' },
  { name: 'Other', used: 2.2, total: 5, color_class: 'bg-muted-foreground' },
];

const ITEMS_PER_PAGE = 5;

const DocumentManagementPage: React.FC = () => {
  const { t } = useTranslation();

  // State Management
  const [folders, setFolders] = useState<DocumentFolder[]>(INITIAL_FOLDERS);
  const [files, setFiles] = useState<DocumentFile[]>(INITIAL_FILES);
  const [activities, setActivities] = useState<ActivityLog[]>(INITIAL_ACTIVITIES);
  const [storageBreakdown, setStorageBreakdown] = useState<StorageCategory[]>(INITIAL_STORAGE);

  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<FileStatus | 'All'>('All');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'size'>('name');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);

  // States Simulation
  const [simulatedState, setSimulatedState] = useState<'interactive' | 'loading' | 'empty'>('interactive');

  // Modals state
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<DocumentFile | null>(null);

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
    if (simulatedState === 'empty') return [];

    let list = folders.filter(f => f.parent_id === activeFolderId);

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(f => f.name.toLowerCase().includes(q));
    }

    return list;
  }, [folders, activeFolderId, searchQuery, simulatedState]);

  // Filtered/Sorted files in current directory
  const filteredFiles = useMemo(() => {
    if (simulatedState === 'empty') return [];

    let list = files.filter(f => f.folder_id === activeFolderId);

    // Search query matching
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        f => f.name.toLowerCase().includes(q) || f.uploaded_by_name.toLowerCase().includes(q),
      );
    }

    // Status filter
    if (statusFilter !== 'All') {
      list = list.filter(f => f.status === statusFilter);
    }

    // Sorting logic
    list.sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === 'date') {
        return new Date(b.upload_date).getTime() - new Date(a.upload_date).getTime();
      }
      if (sortBy === 'size') {
        return b.size_bytes - a.size_bytes;
      }
      return 0;
    });

    return list;
  }, [files, activeFolderId, searchQuery, statusFilter, sortBy, simulatedState]);

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

  // Simulating R2 presigned and confirm workflow
  const processUpload = (fileName: string, fileSizeStr: string, fileType: string) => {
    const fileId = `file-${Date.now()}`;
    const bytes = fileSizeStr.includes('MB') ? parseFloat(fileSizeStr) * 1024 * 1024 : parseFloat(fileSizeStr) * 1024;
    
    // Cloudflare R2 structure simulated properties
    const newFile: DocumentFile = {
      id: fileId,
      org_id: 'org-gtech-001',
      name: fileName,
      type: fileType,
      uploaded_by_id: 'user-mock-01',
      uploaded_by_name: 'Inspector Utama',
      size: fileSizeStr,
      size_bytes: bytes,
      status: 'Pending',
      folder_id: activeFolderId,
      r2_key: `org-gtech-001/documents/${fileId}.${fileType}`,
      reference_type: 'manual',
      reference_id: null,
      upload_date: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
    };

    setFiles(prev => [newFile, ...prev]);

    // Recalculate Storage allocation
    const numericSize = parseFloat(fileSizeStr);
    const increment = fileSizeStr.includes('MB') ? numericSize / 1024 : numericSize / 1024 / 1024;

    setStorageBreakdown(prev =>
      prev.map(cat => {
        if (cat.name === 'Documents' && ['pdf', 'docx'].includes(fileType)) {
          return { ...cat, used: parseFloat((cat.used + increment).toFixed(2)) };
        }
        if (cat.name === 'Images' && ['png', 'jpg', 'jpeg'].includes(fileType)) {
          return { ...cat, used: parseFloat((cat.used + increment).toFixed(2)) };
        }
        if (cat.name === 'Spreadsheets' && ['xlsx', 'xls', 'csv'].includes(fileType)) {
          return { ...cat, used: parseFloat((cat.used + increment).toFixed(2)) };
        }
        if (cat.name === 'Other') {
          return { ...cat, used: parseFloat((cat.used + increment).toFixed(2)) };
        }
        return cat;
      }),
    );

    // Logging Activity
    const newLog: ActivityLog = {
      id: `act-${Date.now()}`,
      action: 'uploaded',
      details: `[Cloudflare R2] Presigned & confirmed upload for ${fileName}${activeFolder ? ` in folder ${activeFolder.name}` : ''}`,
      time: 'Baru saja',
      user: 'Inspector Utama',
    };
    setActivities(prev => [newLog, ...prev]);

    // Trigger Swal notify toast
    appSwal.success({
      title: t('swal.success.saved.title', { entity: 'file' }),
      text: `${fileName} uploaded successfully to R2 bucket.`,
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const ext = file.name.split('.').pop() || 'pdf';
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      processUpload(file.name, `${sizeMB} MB`, ext.toLowerCase());
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const ext = file.name.split('.').pop() || 'pdf';
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      processUpload(file.name, `${sizeMB} MB`, ext.toLowerCase());
    }
  };

  // Create folder action
  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    const newFolder: DocumentFolder = {
      id: `fld-${Date.now()}`,
      org_id: 'org-gtech-001',
      name: newFolderName,
      totalFiles: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by_id: 'user-mock-01',
      created_by_name: 'Inspector Utama',
      parent_id: activeFolderId,
    };

    setFolders(prev => [...prev, newFolder]);
    setNewFolderName('');
    setIsFolderModalOpen(false);

    // Activity log
    setActivities(prev => [
      {
        id: `act-${Date.now()}`,
        action: 'created_folder',
        details: `Created folder ${newFolder.name}`,
        time: 'Baru saja',
        user: 'Inspector Utama',
      },
      ...prev,
    ]);

    appSwal.successCreated('folder', newFolder.name);
  };

  // Delete Action handling
  const handleDeleteFolder = async (folder: DocumentFolder) => {
    const confirmed = await appSwal.confirmDelete(folder.name, 'folder');
    if (!confirmed) return;

    setFolders(prev => prev.filter(f => f.id !== folder.id));
    // Clean up inside files folder
    setFiles(prev => prev.filter(f => f.folder_id !== folder.id));

    setActivities(prev => [
      {
        id: `act-${Date.now()}`,
        action: 'deleted',
        details: `Deleted folder ${folder.name} and its contents`,
        time: 'Baru saja',
        user: 'Inspector Utama',
      },
      ...prev,
    ]);

    appSwal.successDeleted('folder', folder.name);
  };

  const handleDeleteFile = async (file: DocumentFile) => {
    const confirmed = await appSwal.confirmDelete(file.name, 'file');
    if (!confirmed) return;

    setFiles(prev => prev.filter(f => f.id !== file.id));

    setActivities(prev => [
      {
        id: `act-${Date.now()}`,
        action: 'deleted',
        details: `Deleted file ${file.name} from R2 bucket`,
        time: 'Baru saja',
        user: 'Inspector Utama',
      },
      ...prev,
    ]);

    appSwal.successDeleted('file', file.name);
  };

  // Rename item
  const openRenameModal = (id: string, type: 'folder' | 'file', name: string) => {
    setRenameTarget({ id, type, currentName: name });
    setRenameInputValue(name);
    setIsRenameModalOpen(true);
    setActiveFolderMenuId(null);
    setActiveFileMenuId(null);
  };

  const handleRenameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameTarget || !renameInputValue.trim()) return;

    if (renameTarget.type === 'folder') {
      setFolders(prev =>
        prev.map(f => (f.id === renameTarget.id ? { ...f, name: renameInputValue, updated_at: new Date().toISOString() } : f)),
      );
      appSwal.successUpdated('folder', renameInputValue);
    } else {
      setFiles(prev =>
        prev.map(f => (f.id === renameTarget.id ? { ...f, name: renameInputValue } : f)),
      );
      appSwal.successUpdated('file', renameInputValue);
    }

    setActivities(prev => [
      {
        id: `act-${Date.now()}`,
        action: 'renamed',
        details: `Renamed ${renameTarget.currentName} to ${renameInputValue}`,
        time: 'Baru saja',
        user: 'Inspector Utama',
      },
      ...prev,
    ]);

    setIsRenameModalOpen(false);
    setRenameTarget(null);
  };

  // Move folder/file destination modal
  const openMoveModal = (id: string, type: 'folder' | 'file') => {
    setMoveTarget({ id, type });
    setSelectedDestinationFolder(activeFolderId ?? 'root');
    setIsMoveModalOpen(true);
    setActiveFolderMenuId(null);
    setActiveFileMenuId(null);
  };

  const handleMoveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!moveTarget) return;

    const destFolderId = selectedDestinationFolder === 'root' ? null : selectedDestinationFolder;
    const destFolderName =
      selectedDestinationFolder === 'root'
        ? t('documents.modals.rootFolder')
        : folders.find(f => f.id === selectedDestinationFolder)?.name ?? 'Destination Folder';

    if (moveTarget.type === 'folder') {
      // Prevent cyclic moving folder into itself
      if (moveTarget.id === destFolderId) {
        appSwal.error({
          title: 'Gagal Memindahkan',
          text: 'Tidak dapat memindahkan folder ke dalam dirinya sendiri.',
        });
        return;
      }
      setFolders(prev =>
        prev.map(f => (f.id === moveTarget.id ? { ...f, parent_id: destFolderId, updated_at: new Date().toISOString() } : f)),
      );
    } else {
      setFiles(prev =>
        prev.map(f => (f.id === moveTarget.id ? { ...f, folder_id: destFolderId } : f)),
      );
    }

    const itemName =
      moveTarget.type === 'folder'
        ? folders.find(f => f.id === moveTarget.id)?.name ?? 'Folder'
        : files.find(f => f.id === moveTarget.id)?.name ?? 'File';

    setActivities(prev => [
      {
        id: `act-${Date.now()}`,
        action: 'moved',
        details: `Moved ${itemName} to ${destFolderName}`,
        time: 'Baru saja',
        user: 'Inspector Utama',
      },
      ...prev,
    ]);

    appSwal.success({
      title: 'Item Dipindahkan',
      text: `${itemName} dipindahkan ke ${destFolderName}.`,
    });

    setIsMoveModalOpen(false);
    setMoveTarget(null);
  };

  const handlePreview = (file: DocumentFile) => {
    setPreviewFile(file);
    setIsPreviewOpen(true);
    setActiveFileMenuId(null);
  };

  // Mock download prompt
  const handleDownload = (fileName: string) => {
    appSwal.info({
      title: t('documents.actions.download'),
      text: `Simulasi pengunduhan file R2: ${fileName}`,
    });
  };

  // Render Status Badge
  const renderStatus = (status: FileStatus) => {
    const styles = {
      Verified: 'bg-success-green/10 text-success-green border border-success-green/10',
      Pending: 'bg-warning-amber/10 text-warning-amber border border-warning-amber/10',
      Archived: 'bg-muted-foreground/10 text-muted-foreground border border-muted-foreground/10',
    };

    const icons = {
      Verified: <CheckCircle2 className="w-3.5 h-3.5" />,
      Pending: <AlertCircle className="w-3.5 h-3.5" />,
      Archived: <Archive className="w-3.5 h-3.5" />,
    };

    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider',
          styles[status],
        )}
      >
        {icons[status]}
        {status}
      </span>
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
      {/* Simulation Toggles */}
      <div className="flex items-center justify-between rounded-lg bg-surface px-4 py-2 border border-divider">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
          {t('documents.simulator.label')}
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => setSimulatedState('interactive')}
            className={cn(
              'px-3 py-1 text-xs font-semibold rounded transition',
              simulatedState === 'interactive'
                ? 'bg-primary-blue text-white'
                : 'bg-white border border-divider text-muted-foreground hover:text-foreground',
            )}
          >
            {t('documents.simulator.interactive')}
          </button>
          <button
            onClick={() => setSimulatedState('loading')}
            className={cn(
              'px-3 py-1 text-xs font-semibold rounded transition',
              simulatedState === 'loading'
                ? 'bg-primary-blue text-white'
                : 'bg-white border border-divider text-muted-foreground hover:text-foreground',
            )}
          >
            {t('documents.simulator.loading')}
          </button>
          <button
            onClick={() => setSimulatedState('empty')}
            className={cn(
              'px-3 py-1 text-xs font-semibold rounded transition',
              simulatedState === 'empty'
                ? 'bg-primary-blue text-white'
                : 'bg-white border border-divider text-muted-foreground hover:text-foreground',
            )}
          >
            {t('documents.simulator.empty')}
          </button>
        </div>
      </div>

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('documents.title')}</h1>
          <p className="page-subtitle">{t('documents.subtitle')}</p>
        </div>
        <div className="flex w-full items-center gap-3 sm:w-auto">
          <button
            onClick={() => setIsFolderModalOpen(true)}
            className="btn-secondary"
            disabled={simulatedState === 'loading'}
          >
            <FolderPlus className="h-4.5 w-4.5" />
            {t('documents.actions.createFolder')}
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="btn-primary"
            disabled={simulatedState === 'loading'}
          >
            <UploadCloud className="h-4.5 w-4.5" />
            {t('documents.actions.upload')}
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
            accept=".pdf,.docx,.xlsx,.xls,.png,.jpg,.jpeg,.csv"
          />
        </div>
      </div>

      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-sm">
        {breadcrumbs.map((crumb, idx) => (
          <React.Fragment key={idx}>
            {idx > 0 && <ChevronRight className="h-4 w-4 text-muted-foreground/60" />}
            <button
              onClick={() => {
                setActiveFolderId(crumb.id);
                setCurrentPage(1);
              }}
              className={cn(
                'font-medium transition hover:text-primary-blue',
                idx === breadcrumbs.length - 1 ? 'text-foreground font-semibold' : 'text-muted-foreground',
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
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={searchQuery}
            onChange={e => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="form-input pl-9"
            placeholder={t('documents.searchPlaceholder')}
            disabled={simulatedState === 'loading'}
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          {/* Status Filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={e => {
                setStatusFilter(e.target.value as FileStatus | 'All');
                setCurrentPage(1);
              }}
              className="form-input pr-8"
              disabled={simulatedState === 'loading'}
            >
              <option value="All">{t('documents.status.all')}</option>
              <option value="Verified">{t('documents.status.verified')}</option>
              <option value="Pending">{t('documents.status.pending')}</option>
              <option value="Archived">{t('documents.status.archived')}</option>
            </select>
          </div>

          {/* Sort Filter */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as 'name' | 'date' | 'size')}
              className="form-input pr-8"
              disabled={simulatedState === 'loading'}
            >
              <option value="name">{t('documents.sort.name')}</option>
              <option value="date">{t('documents.sort.date')}</option>
              <option value="size">{t('documents.sort.size')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid: 2 columns layout on large screens */}
      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
        
        {/* Main Work Area */}
        <div className="space-y-6 min-w-0">
          
          {/* FOLDERS GRID SECTION */}
          {(simulatedState === 'loading' || currentFolders.length > 0) && (
            <div className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {t('documents.foldersTitle')} ({currentFolders.length})
              </h2>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {simulatedState === 'loading' ? (
                  Array.from({ length: 3 }).map((_, idx) => (
                    <div
                      key={idx}
                      className="bg-white p-4 rounded-lg border border-divider shadow-sm animate-pulse flex items-center gap-3"
                    >
                      <div className="h-10 w-10 bg-surface rounded-lg shrink-0"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-surface rounded w-3/4"></div>
                        <div className="h-3 bg-surface rounded w-1/2"></div>
                      </div>
                    </div>
                  ))
                ) : (
                  currentFolders.map(folder => (
                    <div
                      key={folder.id}
                      className="group relative flex items-center justify-between rounded-lg border border-divider bg-white p-4 transition hover:border-primary-blue/30 hover:shadow-md cursor-pointer"
                      onClick={() => {
                        setActiveFolderId(folder.id);
                        setCurrentPage(1);
                      }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-blue/10 text-primary-blue">
                          <Folder className="h-5 w-5 fill-primary-blue/10" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-semibold text-foreground">
                            {folder.name}
                          </h3>
                          <p className="mt-0.5 text-xs text-muted-foreground">
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
                        <button
                          onClick={() =>
                            setActiveFolderMenuId(activeFolderMenuId === folder.id ? null : folder.id)
                          }
                          className="rounded-lg p-2 text-muted-foreground hover:bg-surface hover:text-foreground transition"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                        {activeFolderMenuId === folder.id && (
                          <div className="absolute right-0 top-full z-10 mt-1 w-36 rounded-lg border border-divider bg-white p-1 shadow-lg animate-fade-in">
                            <button
                              onClick={() => openRenameModal(folder.id, 'folder', folder.name)}
                              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs font-medium text-foreground hover:bg-surface"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                              {t('documents.actions.rename')}
                            </button>
                            <button
                              onClick={() => openMoveModal(folder.id, 'folder')}
                              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs font-medium text-foreground hover:bg-surface"
                            >
                              <Move className="h-3.5 w-3.5" />
                              {t('documents.actions.move')}
                            </button>
                            <hr className="my-1 border-divider" />
                            <button
                              onClick={() => handleDeleteFolder(folder)}
                              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs font-semibold text-danger-red hover:bg-danger-red/5"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              {t('documents.actions.delete')}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* FILES TABLE SECTION */}
          <div className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {t('documents.filesTitle')} ({filteredFiles.length})
            </h2>

            <div className="panel overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="table-header">
                    <tr>
                      <th className="px-6 py-4">{t('documents.table.name')}</th>
                      <th className="px-6 py-4">{t('documents.table.reference')}</th>
                      <th className="px-6 py-4">{t('documents.table.uploadedBy')}</th>
                      <th className="px-6 py-4">{t('documents.table.size')}</th>
                      <th className="px-6 py-4">{t('documents.table.date')}</th>
                      <th className="px-6 py-4">{t('documents.table.status')}</th>
                      <th className="px-6 py-4 text-right">{t('documents.table.actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-divider">
                    {simulatedState === 'loading' ? (
                      <>
                        <SkeletonRow />
                        <SkeletonRow />
                        <SkeletonRow />
                      </>
                    ) : filteredFiles.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-14 text-center">
                          <File className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
                          <p className="text-sm font-semibold text-foreground">
                            {t('documents.empty.title')}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {t('documents.empty.subtitle')}
                          </p>
                        </td>
                      </tr>
                    ) : (
                      paginatedFiles.map(file => (
                        <tr
                          key={file.id}
                          className="hover:bg-surface/50 transition-colors"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface text-muted-foreground">
                                <FileText className="h-4.5 w-4.5" />
                              </div>
                              <div className="min-w-0 max-w-[200px]">
                                <p className="truncate text-sm font-semibold text-foreground leading-snug">
                                  {file.name}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-foreground">
                            {renderReferenceBadge(file.reference_type, file.reference_id)}
                          </td>
                          <td className="px-6 py-4 text-sm text-foreground">
                            {file.uploaded_by_name}
                          </td>
                          <td className="px-6 py-4 text-sm text-muted-foreground">
                            {file.size}
                          </td>
                          <td className="px-6 py-4 text-sm text-muted-foreground">
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
                              <button
                                onClick={() =>
                                  setActiveFileMenuId(activeFileMenuId === file.id ? null : file.id)
                                }
                                className="rounded-lg p-2 text-muted-foreground hover:bg-surface hover:text-foreground transition"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </button>
                              {activeFileMenuId === file.id && (
                                <div className="absolute right-0 top-full z-10 mt-1 w-40 rounded-lg border border-divider bg-white p-1 shadow-lg animate-fade-in">
                                  <button
                                    onClick={() => handlePreview(file)}
                                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs font-medium text-foreground hover:bg-surface"
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                    {t('documents.actions.preview')}
                                  </button>
                                  <button
                                    onClick={() => handleDownload(file.name)}
                                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs font-medium text-foreground hover:bg-surface"
                                  >
                                    <Download className="h-3.5 w-3.5" />
                                    {t('documents.actions.download')}
                                  </button>
                                  <button
                                    onClick={() => openRenameModal(file.id, 'file', file.name)}
                                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs font-medium text-foreground hover:bg-surface"
                                  >
                                    <Edit2 className="h-3.5 w-3.5" />
                                    {t('documents.actions.rename')}
                                  </button>
                                  <button
                                    onClick={() => openMoveModal(file.id, 'file')}
                                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs font-medium text-foreground hover:bg-surface"
                                  >
                                    <Move className="h-3.5 w-3.5" />
                                    {t('documents.actions.move')}
                                  </button>
                                  <hr className="my-1 border-divider" />
                                  <button
                                    onClick={() => handleDeleteFile(file)}
                                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs font-semibold text-danger-red hover:bg-danger-red/5"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    {t('documents.actions.delete')}
                                  </button>
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
              {filteredFiles.length > ITEMS_PER_PAGE && simulatedState !== 'loading' && (
                <div className="flex items-center justify-between border-t border-divider px-6 py-4 bg-white">
                  <span className="text-xs text-muted-foreground">
                    {t('documents.table.paginationText', {
                      start: (currentPage - 1) * ITEMS_PER_PAGE + 1,
                      end: Math.min(currentPage * ITEMS_PER_PAGE, filteredFiles.length),
                      total: filteredFiles.length,
                    })}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="icon-button h-9 w-9 disabled:opacity-50"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="flex items-center text-xs font-semibold px-3 border border-divider rounded-lg bg-surface">
                      {currentPage} / {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="icon-button h-9 w-9 disabled:opacity-50"
                    >
                      <ChevronRightIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* DRAG-AND-DROP FILE UPLOAD AREA */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              'border-2 border-dashed rounded-lg p-8 text-center transition flex flex-col items-center justify-center gap-3 cursor-pointer',
              isDragging
                ? 'border-primary-blue bg-primary-blue/5'
                : 'border-divider bg-white hover:border-primary-blue/30',
            )}
            onClick={() => fileInputRef.current?.click()}
          >
            <UploadCloud className="h-10 w-10 text-primary-blue animate-bounce" />
            <div>
              <p className="text-sm font-semibold text-foreground">
                {t('documents.uploadArea.dragDrop')}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t('documents.uploadArea.supportText')}
              </p>
            </div>
            <button className="btn-secondary px-3 py-1.5 text-xs">
              {t('documents.uploadArea.orBrowse')}
            </button>
          </div>
        </div>

        {/* Sidebar Info Panels */}
        <div className="space-y-5">
          
          {/* STORAGE USAGE PANEL */}
          <section className="panel p-5">
            <div className="flex items-center gap-2 mb-4">
              <HardDrive className="h-4.5 w-4.5 text-primary-blue" />
              <h2 className="text-sm font-bold text-foreground">
                {t('documents.storage.title')}
              </h2>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-2xl font-bold tracking-tight text-foreground">
                  {totalStorageUsed} GB
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t('documents.storage.usedOf')} {totalStorageCapacity} GB
                </p>
              </div>

              {/* Progress visual bar */}
              <div className="h-2.5 w-full bg-secondary rounded-full overflow-hidden flex">
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
              <div className="space-y-2 pt-2 border-t border-divider">
                {storageBreakdown.map(cat => (
                  <div key={cat.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className={cn('h-2.5 w-2.5 rounded-full shrink-0', cat.color_class)} />
                      <span className="font-medium text-muted-foreground">{cat.name}</span>
                    </div>
                    <span className="font-semibold text-foreground">{cat.used} GB</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* RECENT ACTIVITY STREAM */}
          <section className="panel p-5">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="h-4.5 w-4.5 text-primary-blue" />
              <h2 className="text-sm font-bold text-foreground">
                {t('documents.activity.title')}
              </h2>
            </div>

            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
              {activities.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">{t('documents.activity.empty')}</p>
              ) : (
                activities.map(log => (
                  <div key={log.id} className="flex items-start gap-3 border-l-2 border-divider pl-3 relative">
                    <span className="absolute -left-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-primary-blue" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground leading-snug break-words">
                        {log.details}
                      </p>
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {log.time} · {log.user}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>

      {/* CREATE FOLDER MODAL */}
      {isFolderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <form
            onSubmit={handleCreateFolder}
            className="w-full max-w-md rounded-lg border border-divider bg-white shadow-xl animate-fade-in-scale"
          >
            <div className="flex items-center justify-between border-b border-divider px-5 py-4">
              <h2 className="text-base font-semibold text-foreground">
                {t('documents.modals.createFolderTitle')}
              </h2>
              <button
                type="button"
                onClick={() => setIsFolderModalOpen(false)}
                className="rounded-lg p-2 hover:bg-surface text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold text-muted-foreground">
                  {t('documents.modals.folderName')}
                </span>
                <input
                  value={newFolderName}
                  onChange={e => setNewFolderName(e.target.value)}
                  className="form-input"
                  placeholder={t('documents.modals.folderPlaceholder')}
                  autoFocus
                />
              </label>
            </div>

            <div className="flex justify-end gap-3 border-t border-divider px-5 py-4">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setIsFolderModalOpen(false)}
              >
                {t('common.cancel')}
              </button>
              <button type="submit" className="btn-primary">
                <Plus className="h-4 w-4" />
                {t('common.create')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* RENAME MODAL */}
      {isRenameModalOpen && renameTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <form
            onSubmit={handleRenameSubmit}
            className="w-full max-w-md rounded-lg border border-divider bg-white shadow-xl animate-fade-in-scale"
          >
            <div className="flex items-center justify-between border-b border-divider px-5 py-4">
              <h2 className="text-base font-semibold text-foreground">
                {t('documents.modals.renameTitle')}: {renameTarget.currentName}
              </h2>
              <button
                type="button"
                onClick={() => setIsRenameModalOpen(false)}
                className="rounded-lg p-2 hover:bg-surface text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold text-muted-foreground">
                  {t('documents.modals.renamePlaceholder')}
                </span>
                <input
                  value={renameInputValue}
                  onChange={e => setRenameInputValue(e.target.value)}
                  className="form-input"
                  autoFocus
                />
              </label>
            </div>

            <div className="flex justify-end gap-3 border-t border-divider px-5 py-4">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setIsRenameModalOpen(false)}
              >
                {t('common.cancel')}
              </button>
              <button type="submit" className="btn-primary">
                {t('common.save')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MOVE MODAL */}
      {isMoveModalOpen && moveTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <form
            onSubmit={handleMoveSubmit}
            className="w-full max-w-md rounded-lg border border-divider bg-white shadow-xl animate-fade-in-scale"
          >
            <div className="flex items-center justify-between border-b border-divider px-5 py-4">
              <h2 className="text-base font-semibold text-foreground">
                {t('documents.modals.moveTitle')}
              </h2>
              <button
                type="button"
                onClick={() => setIsMoveModalOpen(false)}
                className="rounded-lg p-2 hover:bg-surface text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold text-muted-foreground">
                  {t('documents.modals.selectFolder')}
                </span>
                <select
                  value={selectedDestinationFolder}
                  onChange={e => setSelectedDestinationFolder(e.target.value)}
                  className="form-input"
                >
                  <option value="root">{t('documents.modals.rootFolder')}</option>
                  {assignableFoldersForMove.map(f => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="flex justify-end gap-3 border-t border-divider px-5 py-4">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setIsMoveModalOpen(false)}
              >
                {t('common.cancel')}
              </button>
              <button type="submit" className="btn-primary">
                {t('documents.actions.move')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* PREVIEW MODAL */}
      {isPreviewOpen && previewFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="w-full max-w-3xl rounded-lg border border-divider bg-white shadow-2xl flex flex-col md:flex-row overflow-hidden animate-fade-in-scale">
            
            {/* Left Box: Graphic / File View */}
            <div className="flex-1 bg-surface p-6 flex items-center justify-center border-r border-divider min-h-[300px] max-h-[450px]">
              {['png', 'jpg', 'jpeg'].includes(previewFile.type.toLowerCase()) ? (
                // Simulated gorgeous image render
                <div className="flex flex-col items-center justify-center text-center">
                  <div className="rounded-lg border border-divider overflow-hidden bg-white max-w-full max-h-[320px] shadow-sm">
                    <img
                      src="/api/placeholder/400/300"
                      alt={previewFile.name}
                      className="object-cover max-h-[320px]"
                    />
                  </div>
                  <span className="text-xs text-muted-foreground mt-2">
                    [{t('documents.modals.simulatedPhoto')}]
                  </span>
                </div>
              ) : (
                // Non-image generic beautiful representation
                <div className="flex flex-col items-center justify-center text-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-blue/10 text-primary-blue shadow-inner">
                    <FileText className="h-8 w-8" />
                  </div>
                  <div>
                    <p className="text-base font-bold text-foreground">{previewFile.name}</p>
                    <p className="text-xs text-muted-foreground uppercase mt-1">
                      {previewFile.type} DOCUMENT
                    </p>
                  </div>
                  <span className="text-[11px] text-muted-foreground max-w-xs leading-relaxed">
                    {t('documents.modals.unsupportedPreview', { type: previewFile.type.toUpperCase() })}
                  </span>
                </div>
              )}
            </div>

            {/* Right Box: Metadata Details */}
            <div className="w-full md:w-[280px] p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4 border-b border-divider pb-3">
                  <h3 className="text-sm font-bold text-foreground">
                    {t('documents.modals.previewMetadata')}
                  </h3>
                  <button
                    onClick={() => setIsPreviewOpen(false)}
                    className="rounded-lg p-1 hover:bg-surface text-muted-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-3.5">
                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest block">
                      {t('documents.table.name')}
                    </label>
                    <p className="text-xs font-bold text-foreground mt-0.5 leading-snug break-all">
                      {previewFile.name}
                    </p>
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest block">
                      {t('documents.table.type')}
                    </label>
                    <p className="text-xs font-semibold text-foreground uppercase mt-0.5">
                      {previewFile.type}
                    </p>
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest block">
                      {t('documents.table.size')}
                    </label>
                    <p className="text-xs font-semibold text-foreground mt-0.5">
                      {previewFile.size}
                    </p>
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest block">
                      R2 Object Key
                    </label>
                    <p className="text-[10px] font-mono text-muted-foreground mt-0.5 break-all bg-secondary p-1 rounded">
                      {previewFile.r2_key}
                    </p>
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest block">
                      {t('documents.table.reference')}
                    </label>
                    <div className="mt-1">
                      {renderReferenceBadge(previewFile.reference_type, previewFile.reference_id)}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest block">
                      {t('documents.table.date')}
                    </label>
                    <p className="text-xs font-semibold text-foreground mt-0.5">
                      {previewFile.upload_date}
                    </p>
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest block mb-1">
                      {t('documents.table.status')}
                    </label>
                    {renderStatus(previewFile.status)}
                  </div>
                </div>
              </div>

              {/* Modal footer CTA */}
              <div className="flex gap-2 pt-5 border-t border-divider mt-5">
                <button
                  onClick={() => setIsPreviewOpen(false)}
                  className="btn-secondary flex-1 text-xs"
                >
                  {t('common.close')}
                </button>
                <button
                  onClick={() => handleDownload(previewFile.name)}
                  className="btn-primary flex-1 text-xs"
                >
                  <Download className="h-3 w-3" />
                  {t('common.download')}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default DocumentManagementPage;
