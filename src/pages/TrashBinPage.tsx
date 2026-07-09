import React, { useEffect, useState } from 'react';
import {
  RotateCcw,
  Trash2,
  Users,
  UserCog,
  KeyRound,
  Building2,
  MapPinned,
  ClipboardList,
  LayoutGrid,
  FileText,
  Sliders,
  Play,
  Search,
  RefreshCcw,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { userService, roleService, permissionService, branchService, organizationService, siteService } from '../services/managementService';
import { templateService } from '../services/templateService';
import { inspectionService } from '../services/inspectionService';
import { actionService } from '../services/actionService';
import { appSwal } from '../lib/appSwal';
import { getApiErrorMessage } from '../lib/apiResponse';
import { cn } from '../utils/cn';

type TabKey =
  | 'users'
  | 'roles'
  | 'permissions'
  | 'organizations'
  | 'branches'
  | 'sites'
  | 'masterFields'
  | 'templates'
  | 'inspections'
  | 'actionStatuses'
  | 'actions';

interface TrashItem {
  id: string;
  title: string;
  subtitle?: string;
  metadata?: string;
}

const TrashBinPage: React.FC = () => {
  useTranslation();
  const [activeTab, setActiveTab] = useState<TabKey>('users');
  const [items, setItems] = useState<TrashItem[]>([]);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const tabsConfig: Array<{ key: TabKey; label: string; icon: React.ElementType }> = [
    { key: 'users', label: 'User', icon: Users },
    { key: 'roles', label: 'Role', icon: UserCog },
    { key: 'permissions', label: 'Permission', icon: KeyRound },
    { key: 'organizations', label: 'Organization', icon: Building2 },
    { key: 'branches', label: 'Branch', icon: Building2 },
    { key: 'sites', label: 'Site', icon: MapPinned },
    { key: 'templates', label: 'Template', icon: ClipboardList },
    { key: 'masterFields', label: 'Master Field', icon: Sliders },
    { key: 'inspections', label: 'Inspeksi', icon: FileText },
    { key: 'actionStatuses', label: 'Status Tindakan', icon: LayoutGrid },
    { key: 'actions', label: 'Tindakan', icon: Play },
  ];

  const fetchTrashedItems = async () => {
    setIsLoading(true);
    try {
      let data: TrashItem[] = [];
      switch (activeTab) {
        case 'users': {
          const list = await userService.listTrash();
          data = list.map(item => ({
            id: item.id,
            title: item.name,
            subtitle: item.email,
            metadata: `Role: ${item.roleName || '-'}`,
          }));
          break;
        }
        case 'roles': {
          const list = await roleService.listTrash();
          data = list.map(item => ({
            id: item.id,
            title: item.name,
            subtitle: item.description || '',
          }));
          break;
        }
        case 'permissions': {
          const list = await permissionService.listTrash();
          data = list.map(item => ({
            id: item.id,
            title: item.name,
            subtitle: `${item.resource} : ${item.action}`,
          }));
          break;
        }
        case 'organizations': {
          const list = await organizationService.listTrash();
          data = list.map(item => ({
            id: item.id,
            title: item.name,
            subtitle: item.code,
          }));
          break;
        }
        case 'branches': {
          const list = await branchService.listTrash();
          data = list.map(item => ({
            id: item.id,
            title: item.name,
            subtitle: item.code,
          }));
          break;
        }
        case 'sites': {
          const list = await siteService.listTrash();
          data = list.map(item => ({
            id: item.id,
            title: item.name,
            subtitle: item.code,
            metadata: item.address || '',
          }));
          break;
        }
        case 'templates': {
          const list = await templateService.listTrashedTemplates();
          data = list.map(item => ({
            id: item.id,
            title: item.title,
            subtitle: item.description || '',
            metadata: `Type: ${item.form_type}`,
          }));
          break;
        }
        case 'masterFields': {
          const list = await templateService.listTrashedMasterFields();
          data = list.map(item => ({
            id: item.id,
            title: item.name,
            subtitle: `Type: ${item.field_type}`,
          }));
          break;
        }
        case 'inspections': {
          const list = await inspectionService.listTrashedInspections();
          data = list.map(item => ({
            id: item.id,
            title: item.title,
            subtitle: `Dealer: ${item.site || '-'}`,
            metadata: `Auditor: ${item.assignee || '-'}`,
          }));
          break;
        }
        case 'actionStatuses': {
          const list = await actionService.listTrashedWorkflowStatuses();
          data = list.map(item => ({
            id: item.id,
            title: item.label,
            subtitle: `Color: ${item.color}`,
          }));
          break;
        }
        case 'actions': {
          const list = await actionService.listTrashedActions();
          data = list.map(item => ({
            id: item.id,
            title: item.title,
            subtitle: item.description || '',
            metadata: `Due: ${item.dueDate ? new Date(item.dueDate).toLocaleDateString() : '-'}`,
          }));
          break;
        }
      }
      setItems(data);
    } catch (err) {
      console.error(err);
      await appSwal.error({
        title: 'Gagal mengambil data sampah',
        text: getApiErrorMessage(err),
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTrashedItems();
  }, [activeTab]);

  const handleRestore = async (item: TrashItem) => {
    const confirmed = await appSwal.confirm({
      title: 'Pulihkan Item?',
      text: `Apakah Anda yakin ingin memulihkan "${item.title}"?`,
      confirmText: 'Pulihkan',
    });
    if (!confirmed) return;

    setIsProcessing(true);
    try {
      switch (activeTab) {
        case 'users':
          await userService.restore(item.id);
          break;
        case 'roles':
          await roleService.restore(item.id);
          break;
        case 'permissions':
          await permissionService.restore(item.id);
          break;
        case 'organizations':
          await organizationService.restore(item.id);
          break;
        case 'branches':
          await branchService.restore(item.id);
          break;
        case 'sites':
          await siteService.restore(item.id);
          break;
        case 'templates':
          await templateService.restoreTemplate(item.id);
          break;
        case 'masterFields':
          await templateService.restoreMasterField(item.id);
          break;
        case 'inspections':
          await inspectionService.restoreInspection(item.id);
          break;
        case 'actionStatuses':
          await actionService.restoreWorkflowStatus(item.id);
          break;
        case 'actions':
          await actionService.restoreAction(item.id);
          break;
      }
      await appSwal.success({
        title: 'Berhasil dipulihkan',
        text: `"${item.title}" telah dipulihkan ke daftar aktif.`,
      });
      fetchTrashedItems();
    } catch (err) {
      await appSwal.error({
        title: 'Gagal memulihkan',
        text: getApiErrorMessage(err),
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePermanentDelete = async (item: TrashItem) => {
    const confirmed = await appSwal.confirm({
      title: 'Hapus Permanen?',
      text: `Tindakan ini tidak dapat dibatalkan! "${item.title}" akan dihapus selamanya.`,
      confirmText: 'Hapus Selamanya',
      tone: 'danger',
    });
    if (!confirmed) return;

    setIsProcessing(true);
    try {
      switch (activeTab) {
        case 'users':
          await userService.permanentDelete(item.id);
          break;
        case 'roles':
          await roleService.permanentDelete(item.id);
          break;
        case 'permissions':
          await permissionService.permanentDelete(item.id);
          break;
        case 'organizations':
          await organizationService.permanentDelete(item.id);
          break;
        case 'branches':
          await branchService.permanentDelete(item.id);
          break;
        case 'sites':
          await siteService.permanentDelete(item.id);
          break;
        case 'templates':
          await templateService.permanentDeleteTemplate(item.id);
          break;
        case 'masterFields':
          await templateService.permanentDeleteMasterField(item.id);
          break;
        case 'inspections':
          await inspectionService.permanentDeleteInspection(item.id);
          break;
        case 'actionStatuses':
          await actionService.permanentDeleteWorkflowStatus(item.id);
          break;
        case 'actions':
          await actionService.permanentDeleteAction(item.id);
          break;
      }
      await appSwal.success({
        title: 'Hapus Permanen',
        text: `"${item.title}" telah dihapus secara permanen.`,
      });
      fetchTrashedItems();
    } catch (err) {
      await appSwal.error({
        title: 'Gagal menghapus permanen',
        text: getApiErrorMessage(err),
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredItems = items.filter(item =>
    [item.title, item.subtitle, item.metadata]
      .join(' ')
      .toLowerCase()
      .includes(query.toLowerCase())
  );

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <h1 className="page-title">Tempat Sampah</h1>
          <p className="page-subtitle">Pulihkan data yang telah dihapus sementara atau bersihkan secara permanen.</p>
        </div>
        <button className="icon-button" onClick={fetchTrashedItems} disabled={isLoading}>
          <RefreshCcw className={cn('h-5 w-5', isLoading && 'animate-spin')} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-divider overflow-x-auto scrollbar-none mb-6">
        <div className="flex space-x-6 min-w-max px-1">
          {tabsConfig.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key);
                  setQuery('');
                }}
                className={cn(
                  'flex items-center gap-2 border-b-2 py-3 text-sm font-semibold transition-all',
                  active
                    ? 'border-primary-blue text-primary-blue'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="toolbar">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="form-input pl-9"
            placeholder="Cari item di tempat sampah..."
          />
        </div>
        <div className="rounded-lg border border-divider bg-card px-3 py-2 text-sm text-muted-foreground shadow-sm">
          {filteredItems.length} item terhapus
        </div>
      </div>

      <div className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="table-header">
              <tr>
                <th className="px-6 py-4">Nama / Judul</th>
                <th className="px-6 py-4">Informasi Tambahan</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-divider">
              {isLoading ? (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-sm text-muted-foreground">
                    Memuat data terhapus...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-14 text-center">
                    <Trash2 className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
                    <p className="text-sm font-semibold text-foreground">Tempat sampah kosong</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Tidak ada data terhapus untuk kategori "{tabsConfig.find(t => t.key === activeTab)?.label}".
                    </p>
                  </td>
                </tr>
              ) : (
                filteredItems.map(item => (
                  <tr key={item.id} className="transition hover:bg-surface/60">
                    <td className="px-6 py-4">
                      <p className="text-sm font-semibold text-foreground">{item.title}</p>
                      {item.subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{item.subtitle}</p>}
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {item.metadata || '-'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          className="btn-secondary h-8 px-2 flex items-center gap-1 text-xs text-primary-blue border-primary-blue/20 hover:bg-primary-blue/5"
                          disabled={isProcessing}
                          onClick={() => handleRestore(item)}
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Pulihkan
                        </button>
                        <button
                          className="btn-secondary h-8 px-2 flex items-center gap-1 text-xs text-danger-red border-danger-red/20 hover:bg-danger-red/5"
                          disabled={isProcessing}
                          onClick={() => handlePermanentDelete(item)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Hapus Permanen
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TrashBinPage;
