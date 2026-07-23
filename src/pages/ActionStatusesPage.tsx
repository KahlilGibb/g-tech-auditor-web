import React, { useEffect, useState } from 'react';
import { LayoutGrid, Pencil, Plus, RefreshCcw, Trash2 } from 'lucide-react';
import { useActionStore } from '../stores/actionStore';
import { appSwal } from '../lib/appSwal';
import { getApiErrorMessage } from '../lib/apiResponse';
import type { ActionStatusFormInput, ActionWorkflowStatus } from '../types/action';
import { cn } from '../utils/cn';
import {
  Alert,
  Badge,
  Button,
  EmptyState,
  Field,
  IconButton,
  Input,
  Modal,
  PageHeader,
  RowAction,
  Spinner,
  TableWrap,
  Td,
  Th,
} from '../components/ui';

const EMPTY_FORM: ActionStatusFormInput = {
  name: '',
  color: '#3B82F6',
  order: 1,
  isDefault: false,
};

const COLOR_PRESETS = [
  '#6B7280', // Gray
  '#EF4444', // Red
  '#F59E0B', // Amber
  '#10B981', // Emerald
  '#3B82F6', // Blue
  '#6366F1', // Indigo
  '#8B5CF6', // Violet
  '#EC4899', // Pink
];

const ActionStatusesPage: React.FC = () => {
  const {
    workflowStatuses,
    isLoading,
    isSaving,
    fetchActions,
    createWorkflowStatus,
    updateWorkflowStatus,
    deleteWorkflowStatus,
  } = useActionStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState<ActionWorkflowStatus | null>(null);
  const [form, setForm] = useState<ActionStatusFormInput>(EMPTY_FORM);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    fetchActions();
  }, [fetchActions]);

  const patchForm = (patch: Partial<ActionStatusFormInput>) => {
    setForm(prev => ({ ...prev, ...patch }));
  };

  const openCreate = () => {
    setEditingStatus(null);
    setForm({
      ...EMPTY_FORM,
      order: workflowStatuses.length + 1,
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const openEdit = (status: ActionWorkflowStatus) => {
    setEditingStatus(status);
    setForm({
      name: status.label,
      color: status.color,
      order: status.order ?? 1,
      isDefault: status.isDefault ?? false,
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!form.name.trim()) {
      setFormError('Nama status wajib diisi');
      return;
    }

    const confirmed = await appSwal.confirmSave();
    if (!confirmed) return;

    try {
      if (editingStatus) {
        await updateWorkflowStatus(editingStatus.id, form);
        await appSwal.successUpdated('actionStatus', form.name);
      } else {
        await createWorkflowStatus(form);
        await appSwal.successCreated('actionStatus', form.name);
      }
      setIsModalOpen(false);
    } catch (err) {
      const msg = getApiErrorMessage(err);
      setFormError(msg);
      if (editingStatus) {
        await appSwal.errorUpdateFailed('actionStatus', msg);
      } else {
        await appSwal.errorCreateFailed('actionStatus', msg);
      }
    }
  };

  const handleDelete = async (status: ActionWorkflowStatus) => {
    const confirmed = await appSwal.confirmDelete(status.label, 'actionStatus');
    if (!confirmed) return;

    try {
      await deleteWorkflowStatus(status.id);
      await appSwal.successDeleted('actionStatus', status.label);
    } catch (err) {
      await appSwal.errorDeleteFailed('actionStatus', getApiErrorMessage(err));
    }
  };

  const sortedStatuses = [...workflowStatuses].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Konfigurasi"
        title="Status Tindakan"
        subtitle="Kelola alur kerja status dan warna penanda tindak lanjut audit."
        actions={
          <>
            <IconButton onClick={() => fetchActions(true)} disabled={isLoading} aria-label="Refresh">
              <RefreshCcw className={cn('h-5 w-5', isLoading && 'animate-spin')} />
            </IconButton>
            <Button className="flex-1 sm:flex-none" onClick={openCreate} icon={<Plus className="h-4 w-4" />}>
              Tambah Status
            </Button>
          </>
        }
      />

      <TableWrap>
        <thead className="table-header">
          <tr>
            <Th>Nama Status</Th>
            <Th>Warna</Th>
            <Th>Urutan</Th>
            <Th>Default</Th>
            <Th className="text-right">Aksi</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-hairline-soft">
          {isLoading ? (
            <tr>
              <td colSpan={5} className="px-6 py-12 text-center text-sm text-stone">
                <Spinner className="mx-auto h-6 w-6 text-primary-blue" />
              </td>
            </tr>
          ) : sortedStatuses.length === 0 ? (
            <tr>
              <td colSpan={5}>
                <EmptyState
                  icon={<LayoutGrid className="h-6 w-6" />}
                  title="Belum ada status tindakan"
                  description="Tambahkan status untuk melacak perbaikan inspeksi."
                />
              </td>
            </tr>
          ) : (
            sortedStatuses.map(status => (
              <tr key={status.id} className="transition hover:bg-surface/60">
                <Td>
                  <span
                    className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold"
                    style={{ backgroundColor: `${status.color}15`, color: status.color }}
                  >
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: status.color }} />
                    {status.label}
                  </span>
                </Td>
                <Td>
                  <span className="font-mono text-[13px] text-stone">{status.color}</span>
                </Td>
                <Td>
                  <span className="text-sm tabular-nums text-charcoal">{status.order}</span>
                </Td>
                <Td>
                  {status.isDefault ? (
                    <Badge tone="success">Default</Badge>
                  ) : (
                    <span className="text-stone">-</span>
                  )}
                </Td>
                <Td className="text-right">
                  <div className="inline-flex items-center gap-1">
                    <RowAction tone="brand" onClick={() => openEdit(status)} aria-label="Edit">
                      <Pencil className="h-4 w-4" />
                    </RowAction>
                    <RowAction tone="danger" onClick={() => handleDelete(status)} aria-label="Delete">
                      <Trash2 className="h-4 w-4" />
                    </RowAction>
                  </div>
                </Td>
              </tr>
            ))
          )}
        </tbody>
      </TableWrap>

      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        eyebrow={editingStatus ? 'Edit' : 'Baru'}
        title={editingStatus ? 'Edit Status Tindakan' : 'Tambah Status Tindakan'}
        footer={
          <>
            <Button variant="secondary" disabled={isSaving} onClick={() => setIsModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" form="action-status-form" loading={isSaving}>
              Simpan
            </Button>
          </>
        }
      >
        <form id="action-status-form" onSubmit={handleSubmit} className="space-y-4">
          {formError && <Alert tone="danger">{formError}</Alert>}

          <Field label="Nama Status" required>
            <Input
              value={form.name}
              onChange={e => patchForm({ name: e.target.value })}
              placeholder="Contoh: Belum Dikerjakan, Selesai"
            />
          </Field>

          <Field label="Pilih Warna">
            <div className="flex flex-wrap items-center gap-2">
              {COLOR_PRESETS.map(preset => (
                <button
                  key={preset}
                  type="button"
                  className={cn(
                    'h-8 w-8 rounded-full border-2 transition-all',
                    form.color === preset ? 'scale-110 border-ink-deep' : 'border-transparent',
                  )}
                  style={{ backgroundColor: preset }}
                  onClick={() => patchForm({ color: preset })}
                />
              ))}
              <input
                type="color"
                className="h-8 w-12 cursor-pointer rounded-lg border border-hairline-soft p-0"
                value={form.color}
                onChange={e => patchForm({ color: e.target.value })}
              />
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Urutan Tampilan">
              <Input
                type="number"
                min={1}
                value={form.order}
                onChange={e => patchForm({ order: parseInt(e.target.value) || 1 })}
              />
            </Field>
            <div className="flex items-end pb-2.5">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-charcoal">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-hairline text-primary-blue focus:ring-primary-blue"
                  checked={form.isDefault}
                  onChange={e => patchForm({ isDefault: e.target.checked })}
                />
                Jadikan Default
              </label>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ActionStatusesPage;
