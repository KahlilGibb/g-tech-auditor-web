import React, { useEffect, useState } from 'react';
import { Loader2, Plus, Pencil, Trash2, CheckCircle2, RefreshCcw, LayoutGrid } from 'lucide-react';
import { useActionStore } from '../stores/actionStore';
import { appSwal } from '../lib/appSwal';
import { getApiErrorMessage } from '../lib/apiResponse';
import type { ActionStatusFormInput, ActionWorkflowStatus } from '../types/action';
import { cn } from '../utils/cn';

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
      <div className="page-header">
        <div>
          <h1 className="page-title">Status Tindakan</h1>
          <p className="page-subtitle">Kelola alur kerja status dan warna penanda tindak lanjut audit.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="icon-button" onClick={() => fetchActions(true)} disabled={isLoading}>
            <RefreshCcw className={cn('h-5 w-5', isLoading && 'animate-spin')} />
          </button>
          <button className="btn-primary" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Tambah Status
          </button>
        </div>
      </div>

      <div className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="table-header">
              <tr>
                <th className="px-6 py-4">Nama Status</th>
                <th className="px-6 py-4">Warna</th>
                <th className="px-6 py-4">Urutan</th>
                <th className="px-6 py-4">Default</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-divider">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-sm text-muted-foreground">
                    Memuat status alur kerja...
                  </td>
                </tr>
              ) : sortedStatuses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-14 text-center">
                    <LayoutGrid className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
                    <p className="text-sm font-semibold text-foreground">Belum ada status tindakan</p>
                    <p className="mt-1 text-xs text-muted-foreground">Tambahkan status untuk melacak perbaikan inspeksi.</p>
                  </td>
                </tr>
              ) : (
                sortedStatuses.map(status => (
                  <tr key={status.id} className="transition hover:bg-surface/60">
                    <td className="px-6 py-4">
                      <span
                        className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold"
                        style={{ backgroundColor: `${status.color}15`, color: status.color }}
                      >
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: status.color }} />
                        {status.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-mono text-muted-foreground">
                      {status.color}
                    </td>
                    <td className="px-6 py-4 text-sm text-foreground">
                      {status.order}
                    </td>
                    <td className="px-6 py-4 text-sm text-foreground">
                      {status.isDefault ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          className="icon-button h-8 w-8 text-primary-blue hover:bg-primary-blue/10"
                          onClick={() => openEdit(status)}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          className="icon-button h-8 w-8 text-danger-red hover:bg-danger-red/10"
                          onClick={() => handleDelete(status)}
                        >
                          <Trash2 className="h-4 w-4" />
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

      {isModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-container max-w-md">
            <div className="modal-header">
              <h2 className="modal-title">
                {editingStatus ? 'Edit Status Tindakan' : 'Tambah Status Tindakan'}
              </h2>
              <button
                className="icon-button text-muted-foreground hover:bg-surface"
                onClick={() => setIsModalOpen(false)}
              >
                <Plus className="h-5 w-5 rotate-45" />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body space-y-4">
                {formError && (
                  <div className="rounded-lg border border-danger-red/20 bg-danger-red/10 p-3 text-sm text-danger-red">
                    {formError}
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="form-label">Nama Status *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={form.name}
                    onChange={e => patchForm({ name: e.target.value })}
                    placeholder="Contoh: Belum Dikerjakan, Selesai"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="form-label">Pilih Warna</label>
                  <div className="flex flex-wrap gap-2">
                    {COLOR_PRESETS.map(preset => (
                      <button
                        key={preset}
                        type="button"
                        className={cn(
                          'h-8 w-8 rounded-full border-2 transition-all',
                          form.color === preset ? 'border-foreground scale-110' : 'border-transparent'
                        )}
                        style={{ backgroundColor: preset }}
                        onClick={() => patchForm({ color: preset })}
                      />
                    ))}
                    <input
                      type="color"
                      className="h-8 w-12 cursor-pointer rounded border border-divider p-0"
                      value={form.color}
                      onChange={e => patchForm({ color: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="form-label">Urutan Tampilan</label>
                    <input
                      type="number"
                      min={1}
                      className="form-input"
                      value={form.order}
                      onChange={e => patchForm({ order: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                  <div className="flex items-end pb-3">
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-foreground">
                      <input
                        type="checkbox"
                        className="rounded border-divider text-primary-blue focus:ring-primary-blue h-4 w-4"
                        checked={form.isDefault}
                        onChange={e => patchForm({ isDefault: e.target.checked })}
                      />
                      Jadikan Default
                    </label>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={isSaving}
                  onClick={() => setIsModalOpen(false)}
                >
                  Batal
                </button>
                <button type="submit" className="btn-primary" disabled={isSaving}>
                  {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActionStatusesPage;
