import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  RefreshCcw, PlusCircle, FileText, X,
  Upload, ClipboardList, Plus, ChevronRight,
  Share2, Bookmark, Pencil, ShieldCheck, Copy, Archive,
  Loader2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTemplates } from '../hooks/useTemplates';
import { useTemplateStore } from '../stores/templateStore';
import { SkeletonRow } from '../components/ui/SkeletonLoader';
import { cn } from '../utils/cn';
import type { TemplateListItem } from '../services/templateService';
import { appSwal } from '../lib/appSwal';
import { getApiErrorMessage } from '../lib/apiResponse';

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

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        style={{ opacity: visible ? 1 : 0, transition: 'opacity 300ms ease' }}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="relative bg-white rounded-t-3xl shadow-2xl w-full max-w-2xl mx-auto"
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
    </div>
  );
};

// ─── TemplateDetailSheet ──────────────────────────────────────────────────────

interface DetailSheetProps {
  open: boolean;
  visible: boolean;
  onClose: () => void;
  template: TemplateListItem | null;
  onEdit: (id: string) => void;
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
  open, visible, onClose, template, onEdit,
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
    // other menu items: show toast or no-op for now
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        style={{ opacity: visible ? 1 : 0, transition: 'opacity 300ms ease' }}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="relative bg-white rounded-t-3xl shadow-2xl w-full max-w-2xl mx-auto"
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
            onClick={onClose}
            className="w-full py-3 rounded-2xl font-semibold text-white text-sm transition-all active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, #1D4ED8 0%, #2563EB 50%, #3B82F6 100%)' }}
          >
            Mulai Inspeksi
          </button>
        </div>

        {/* Menu items */}
        <div className="px-4 pb-2 space-y-0.5">
          {DETAIL_MENU.map((item) => {
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
    </div>
  );
};

// ─── TemplatesPage ────────────────────────────────────────────────────────────

const TemplatesPage: React.FC = () => {
  const { t } = useTranslation();
  const { templates, isLoading, error, fetchTemplates } = useTemplates();
  const { createTemplate } = useTemplateStore();
  const navigate = useNavigate();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateListItem | null>(null);

  const createSheet = useSheet();
  const detailSheet = useSheet();

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

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('templates.title')}</h1>
          <p className="page-subtitle">{t('templates.subtitle')}</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={handleRefresh}
            disabled={isLoading || isRefreshing}
            className="icon-button"
          >
            <RefreshCcw className={cn('w-5 h-5', (isLoading || isRefreshing) && 'animate-spin')} />
          </button>
          <button
            onClick={createSheet.show}
            className="btn-primary flex-1 sm:flex-none"
          >
            <PlusCircle className="w-5 h-5" />
            {t('common.create')}
          </button>
        </div>
      </div>

      <div className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="table-header">
              <tr>
                <th className="px-6 py-4">Template Name</th>
                <th className="px-6 py-4">Author</th>
                <th className="px-6 py-4">Questions</th>
                <th className="px-6 py-4 text-right">Last Modified</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-divider">
              {isLoading && templates.length === 0 ? (
                <>
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                </>
              ) : templates.length === 0 && !error ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <p className="text-muted-foreground">{t('templates.empty')}</p>
                  </td>
                </tr>
              ) : (
                templates.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => handleRowClick(item)}
                    className="hover:bg-surface/50 transition-colors cursor-pointer text-sm"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-primary-blue/10 rounded-lg text-primary-blue mt-0.5">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{item.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 max-w-sm truncate">{item.description}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-foreground">{item.author}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full bg-surface text-muted-foreground font-medium text-xs">
                        {item.questionCount} Qs
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-muted-foreground">{item.lastModified}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

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
      />
    </div>
  );
};

export default TemplatesPage;
