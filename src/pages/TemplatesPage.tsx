import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import {
  RefreshCcw, PlusCircle, FileText, X,
  Upload, ClipboardList, Plus, ChevronRight,
  Share2, Bookmark, Pencil, ShieldCheck, Copy, Archive,
  Loader2, Search,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTemplates } from '../hooks/useTemplates';
import { useTemplateStore } from '../stores/templateStore';
import { SkeletonRow } from '../components/ui/SkeletonLoader';
import { cn } from '../utils/cn';
import type { TemplateListItem } from '../services/templateService';
import { appSwal } from '../lib/appSwal';
import { getApiErrorMessage } from '../lib/apiResponse';
import { Can } from '../components/rbac/Can';
import { useRbac } from '../hooks/useRbac';
import { branchService } from '../services/managementService';
import { inspectionService } from '../services/inspectionService';
import Swal from 'sweetalert2';
import { Badge, Button, EmptyState, IconButton, PageHeader, Tabs, TableWrap, Td, Th } from '../components/ui';

// ─── helpers ──────────────────────────────────────────────────────────────────

function useSheet() {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);

  const show = useCallback(() => {
    setOpen(true);
    requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
  }, []);

  const hide = useCallback(() => {
    setVisible(false);
    setTimeout(() => setOpen(false), 300);
  }, []);

  return { open, visible, show, hide };
}

// ─── CreateTemplateSheet ───────────────────────────────────────────────────────

interface CreateSheetProps {
  open: boolean;
  visible: boolean;
  onClose: () => void;
}

const CREATE_OPTIONS = [
  {
    id: 'scratch',
    icon: Plus,
    label: 'Mulai dari Awal',
    description: 'Buat template baru dari halaman kosong',
    color: '#2563EB',
    available: true,
  },
  {
    id: 'library',
    icon: ClipboardList,
    label: 'Gunakan Template Library',
    description: 'Pilih dari koleksi template yang tersedia',
    color: '#8B5CF6',
    available: false,
  },
  {
    id: 'upload',
    icon: Upload,
    label: 'Upload Dokumen',
    description: 'Impor dari file Word, Excel, atau PDF',
    color: '#10B981',
    available: false,
  },
] as const;

const CreateTemplateSheet: React.FC<CreateSheetProps & { onScratch: () => Promise<void>; isCreating: boolean }> = ({
  open, visible, onClose, onScratch, isCreating,
}) => {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        style={{ opacity: visible ? 1 : 0, transition: 'opacity 300ms ease' }}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="relative bg-card rounded-t-3xl shadow-2xl w-full max-w-2xl mx-auto"
        style={{
          transform: visible ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 300ms cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-divider" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-3 pb-4 border-b border-divider">
          <div>
            <h2 className="text-lg font-bold text-foreground">Buat Template Baru</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Pilih cara membuat template</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-surface transition-colors text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Options */}
        <div className="px-4 py-4 space-y-2 pb-8">
          {CREATE_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const isLoading = opt.id === 'scratch' && isCreating;
            return (
              <button
                key={opt.id}
                onClick={opt.id === 'scratch' ? onScratch : undefined}
                disabled={!opt.available || isCreating}
                className={cn(
                  'w-full flex items-center gap-4 p-4 rounded-2xl border transition-all text-left',
                  opt.available
                    ? 'border-divider hover:border-primary-blue/30 hover:bg-primary-blue/5 active:scale-[0.98]'
                    : 'border-divider opacity-50 cursor-not-allowed',
                )}
              >
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${opt.color}18` }}
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" style={{ color: opt.color }} />
                  ) : (
                    <Icon className="w-5 h-5" style={{ color: opt.color }} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground text-sm">{opt.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{opt.description}</p>
                  {!opt.available && (
                    <span className="inline-block mt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-surface px-2 py-0.5 rounded-full">
                      Segera Hadir
                    </span>
                  )}
                </div>
                {opt.available && (
                  <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>,
    document.body
  );
};

// ─── TemplateDetailSheet ──────────────────────────────────────────────────────

interface DetailSheetProps {
  open: boolean;
  visible: boolean;
  onClose: () => void;
  template: TemplateListItem | null;
  onEdit: (id: string) => void;
  onDuplicate: (id: string) => void;
  onShare: (id: string) => void;
  onStartInspection: (id: string) => void;
  canEdit: boolean;
}

const DETAIL_MENU = [
  { id: 'share',   icon: Share2,     label: 'Bagikan',         danger: false },
  { id: 'bookmark',icon: Bookmark,   label: 'Simpan',          danger: false },
  { id: 'edit',    icon: Pencil,     label: 'Edit Template',   danger: false },
  { id: 'access',  icon: ShieldCheck,label: 'Kelola Akses',    danger: false },
  { id: 'duplicate',icon: Copy,      label: 'Duplikat',        danger: false },
  { id: 'archive', icon: Archive,    label: 'Arsipkan',        danger: true  },
] as const;

const TemplateDetailSheet: React.FC<DetailSheetProps> = ({
  open, visible, onClose, template, onEdit, onDuplicate, onShare, onStartInspection, canEdit,
}) => {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open || !template) return null;

  const handleMenu = (id: string) => {
    if (id === 'edit') { onEdit(template.id); return; }
    if (id === 'duplicate') { onDuplicate(template.id); return; }
    if (id === 'share') { onShare(template.id); return; }
    // other menu items: show toast or no-op for now
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        style={{ opacity: visible ? 1 : 0, transition: 'opacity 300ms ease' }}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="relative bg-card rounded-t-3xl shadow-2xl w-full max-w-2xl mx-auto"
        style={{
          transform: visible ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 300ms cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-divider" />
        </div>

        {/* Header */}
        <div className="flex items-start gap-4 px-6 pt-4 pb-5 border-b border-divider">
          <div className="p-3 bg-primary-blue/10 rounded-2xl text-primary-blue flex-shrink-0">
            <FileText className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-foreground leading-snug">{template.name}</h2>
            <p className="text-xs text-muted-foreground mt-1">
              {template.questionCount} pertanyaan · {template.author}
            </p>
            {template.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{template.description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-surface transition-colors text-muted-foreground hover:text-foreground flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* CTA */}
        <div className="px-6 py-4">
          <button
            onClick={() => onStartInspection(template.id)}
            className="w-full py-3 rounded-2xl font-semibold text-white text-sm transition-all active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, #1D4ED8 0%, #2563EB 50%, #3B82F6 100%)' }}
          >
            Mulai Inspeksi
          </button>
        </div>

        {/* Menu items */}
        <div className="px-4 pb-2 space-y-0.5">
          {DETAIL_MENU.map((item) => {
            if (item.id === 'edit' && !canEdit) return null;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => handleMenu(item.id)}
                className={cn(
                  'w-full flex items-center gap-3.5 px-3 py-3 rounded-xl transition-colors text-left',
                  item.danger
                    ? 'hover:bg-red-50 text-danger-red'
                    : 'hover:bg-surface text-foreground',
                )}
              >
                <Icon className={cn('w-4.5 h-4.5 flex-shrink-0', item.danger ? 'text-danger-red' : 'text-muted-foreground')} />
                <span className="text-sm font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Footer metadata */}
        <div className="mx-6 mt-3 mb-6 pt-4 border-t border-divider grid grid-cols-3 gap-2">
          {[
            { label: 'Diubah', value: template.lastModified },
            { label: 'Diterbitkan', value: '—' },
            { label: 'Dipakai', value: '—' },
          ].map((m) => (
            <div key={m.label} className="text-center">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{m.label}</p>
              <p className="text-xs text-foreground font-medium mt-0.5">{m.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
};

// ─── TemplatesPage ────────────────────────────────────────────────────────────

const TemplatesPage: React.FC = () => {
  const { t } = useTranslation();
  const { can } = useRbac();
  const { templates, isLoading, error, fetchTemplates } = useTemplates();
  const { createTemplate, duplicateTemplate } = useTemplateStore();
  const navigate = useNavigate();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateListItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'inspection' | 'cps'>('all');

  const createSheet = useSheet();
  const detailSheet = useSheet();

  const filteredTemplates = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return templates.filter((t) => {
      const matchType = activeFilter === 'all' || t.form_type === activeFilter;
      if (!q) return matchType;
      return matchType && (
        t.name.toLowerCase().includes(q) ||
        (t.description ?? '').toLowerCase().includes(q) ||
        (t.author ?? '').toLowerCase().includes(q)
      );
    });
  }, [templates, searchQuery, activeFilter]);

  useEffect(() => {
    fetchTemplates();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchTemplates();
    setIsRefreshing(false);
  };

  const handleRowClick = (item: TemplateListItem) => {
    setSelectedTemplate(item);
    detailSheet.show();
  };

  const handleScratch = async () => {
    const confirmed = await appSwal.confirmCreateTemplate();
    if (!confirmed) return;

    setIsCreating(true);
    try {
      const result = await createTemplate('inspection');
      createSheet.hide();
      await appSwal.successCreated('template', result.template.title || 'Template');
      navigate(`/templates/${result.template.id}/builder`);
    } catch (createError) {
      await appSwal.errorCreateFailed('template', getApiErrorMessage(createError));
    } finally {
      setIsCreating(false);
    }
  };

  const handleEdit = (id: string) => {
    detailSheet.hide();
    setTimeout(() => navigate(`/templates/${id}/builder`), 150);
  };

  const handleDuplicate = async (id: string) => {
    detailSheet.hide();
    const target = templates.find(t => t.id === id);
    const name = target?.name || '';
    const confirmed = await appSwal.confirm({
      title: 'Duplikat Template',
      text: `Apakah Anda yakin ingin menduplikat template "${name}"?`,
      confirmText: 'Ya, Duplikat',
      cancelText: 'Batal',
    });
    if (!confirmed) return;

    setIsCreating(true);
    try {
      const result = await duplicateTemplate(id);
      await fetchTemplates();
      await appSwal.successCreated('template', result.template.title || 'Template Copy');
    } catch (err) {
      await appSwal.errorCreateFailed('template', getApiErrorMessage(err));
    } finally {
      setIsCreating(false);
    }
  };

  const handleStartInspection = async (templateId: string) => {
    detailSheet.hide();
    const target = templates.find(t => t.id === templateId);
    if (!target) return;

    void Swal.fire({
      title: 'Memuat data cabang...',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    try {
      const branches = await branchService.list();
      Swal.close();

      if (!branches.length) {
        await appSwal.error({
          title: 'Tidak Ada Cabang',
          text: 'Silakan daftarkan cabang terlebih dahulu.',
        });
        return;
      }

      const options: Record<string, string> = {};
      branches.forEach(b => {
        options[b.id] = b.name;
      });

      const { value: branchId } = await Swal.fire({
        title: 'Mulai Inspeksi Baru',
        text: `Template: ${target.name}`,
        input: 'select',
        inputOptions: options,
        inputPlaceholder: 'Pilih Cabang / Target Group',
        showCancelButton: true,
        confirmButtonText: 'Mulai',
        cancelButtonText: 'Batal',
        customClass: {
          popup: 'gtech-swal-popup',
          confirmButton: 'gtech-swal-confirm',
          cancelButton: 'gtech-swal-cancel',
          input: 'form-input'
        },
        buttonsStyling: false,
        inputValidator: (value) => {
          if (!value) {
            return 'Anda harus memilih cabang!';
          }
          return null;
        }
      });

      if (!branchId) return;

      const title = `Inspeksi / ${options[branchId]}`;

      const result = await inspectionService.createInspection({
        templateId,
        groupId: branchId,
        title,
        site: options[branchId],
        assignee: 'Current User',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });

      void Swal.fire({
        toast: true,
        position: 'top-end',
        timer: 2000,
        timerProgressBar: true,
        icon: 'success',
        title: 'Inspeksi Dimulai',
        showConfirmButton: false,
      });

      setTimeout(() => {
        navigate(`/inspections/${result.id}/session`);
      }, 1000);
    } catch (err) {
      Swal.close();
      await appSwal.error({
        title: 'Gagal Memulai Inspeksi',
        text: getApiErrorMessage(err),
      });
    }
  };

  const handleShare = async (id: string) => {
    detailSheet.hide();
    const target = templates.find(t => t.id === id);
    const name = target?.name || '';
    const shareUrl = `${window.location.origin}/templates/${id}/builder`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      void Swal.fire({
        toast: true,
        position: 'top-end',
        timer: 3000,
        timerProgressBar: true,
        icon: 'success',
        title: 'Tautan Berhasil Disalin!',
        text: `Tautan untuk template "${name}" telah disalin ke clipboard.`,
        showConfirmButton: false,
      });
    } catch (err) {
      await appSwal.error({
        title: 'Gagal Menyalin Tautan',
        text: 'Silakan coba lagi.',
      });
    }
  };

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Checklists"
        title={t('templates.title')}
        subtitle={t('templates.subtitle')}
        actions={
          <>
            <IconButton onClick={handleRefresh} disabled={isLoading || isRefreshing} aria-label="Refresh">
              <RefreshCcw className={cn('h-5 w-5', (isLoading || isRefreshing) && 'animate-spin')} />
            </IconButton>
            <Can resource="templates" action="create">
              <Button className="flex-1 sm:flex-none" onClick={createSheet.show} icon={<PlusCircle className="h-[18px] w-[18px]" />}>
                {t('common.create')}
              </Button>
            </Can>
          </>
        }
      />

      {/* Search & filter */}
      <div className="toolbar">
        <div className="relative w-full sm:max-w-md">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama template, deskripsi, atau author..."
            className="form-input pl-11 pr-10"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-stone transition-colors hover:bg-surface hover:text-ink-deep"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <Tabs
          value={activeFilter}
          onChange={setActiveFilter}
          tabs={[
            { value: 'all', label: 'Semua' },
            { value: 'inspection', label: 'Inspection' },
            { value: 'cps', label: 'CPS' },
          ]}
        />
      </div>

      <TableWrap>
        {(searchQuery || activeFilter !== 'all') && (
          <div className="border-b border-hairline-soft bg-surface/50 px-6 py-3 text-xs font-semibold text-stone">
            {filteredTemplates.length === 0
              ? 'Tidak ada template yang sesuai'
              : `${filteredTemplates.length} template ditemukan`}
            {searchQuery && <span className="ml-1 text-ink-deep">untuk "{searchQuery}"</span>}
          </div>
        )}
        <thead className="table-header">
          <tr>
            <Th>Template Name</Th>
            <Th>Author</Th>
            <Th>Questions</Th>
            <Th className="text-right">Last Modified</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-hairline-soft">
          {isLoading && templates.length === 0 ? (
            <>
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </>
          ) : filteredTemplates.length === 0 && !error ? (
            <tr>
              <td colSpan={4}>
                {searchQuery || activeFilter !== 'all' ? (
                  <EmptyState
                    icon={<Search className="h-6 w-6" />}
                    title="Tidak ada template yang cocok"
                    description="Coba kata kunci lain atau hapus filter."
                    action={
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSearchQuery('');
                          setActiveFilter('all');
                        }}
                      >
                        Reset pencarian
                      </Button>
                    }
                  />
                ) : (
                  <EmptyState icon={<FileText className="h-6 w-6" />} title={t('templates.empty')} />
                )}
              </td>
            </tr>
          ) : (
            filteredTemplates.map((item) => (
              <tr
                key={item.id}
                onClick={() => handleRowClick(item)}
                className="cursor-pointer text-sm transition-colors hover:bg-surface/60"
              >
                <Td>
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-blue/10 text-primary-blue">
                      <FileText className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold text-ink-deep">{item.name}</p>
                      <p className="mt-0.5 max-w-sm truncate text-xs text-stone">{item.description}</p>
                    </div>
                  </div>
                </Td>
                <Td className="text-charcoal">{item.author}</Td>
                <Td>
                  <Badge tone="neutral">{item.questionCount} Qs</Badge>
                </Td>
                <Td className="text-right text-stone">{item.lastModified}</Td>
              </tr>
            ))
          )}
        </tbody>
      </TableWrap>

      {/* Modals */}
      <CreateTemplateSheet
        open={createSheet.open}
        visible={createSheet.visible}
        onClose={createSheet.hide}
        onScratch={handleScratch}
        isCreating={isCreating}
      />

      <TemplateDetailSheet
        open={detailSheet.open}
        visible={detailSheet.visible}
        onClose={detailSheet.hide}
        template={selectedTemplate}
        onEdit={handleEdit}
        onDuplicate={handleDuplicate}
        onShare={handleShare}
        onStartInspection={handleStartInspection}
        canEdit={can('templates', 'update')}
      />
    </div>
  );
};

export default TemplatesPage;
