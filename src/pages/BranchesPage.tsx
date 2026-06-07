import React, { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  Loader2,
  Pencil,
  Plus,
  RefreshCcw,
  Search,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { cn } from '../utils/cn';
import { useBranchStore } from '../stores/branchStore';
import { useUserStore } from '../stores/userStore';
import type { Branch, BranchFormInput } from '../types/management';
import { appSwal } from '../lib/appSwal';
import { getApiErrorMessage } from '../lib/apiResponse';
import { useTranslation } from 'react-i18next';

const EMPTY_FORM: BranchFormInput = {
  name: '',
  code: '',
  address: '',
  status: 'active',
};

const BranchesPage: React.FC = () => {
  const { t } = useTranslation();
  const {
    branches,
    branchUsers,
    selectedBranchId,
    isLoading,
    isSaving,
    isLoadingUsers,
    error,
    fetchBranches,
    createBranch,
    updateBranch,
    deleteBranch,
    fetchBranchUsers,
    assignUserToBranch,
    removeUserFromBranch,
  } = useBranchStore();
  const { users, fetchUsers } = useUserStore();
  const [query, setQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [form, setForm] = useState<BranchFormInput>(EMPTY_FORM);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    fetchBranches();
    fetchUsers();
  }, [fetchBranches, fetchUsers]);

  const filteredBranches = useMemo(() => {
    const keyword = query.toLowerCase();
    return branches.filter(branch =>
      [branch.name, branch.code, branch.address].join(' ').toLowerCase().includes(keyword),
    );
  }, [branches, query]);

  const selectedBranch = useMemo(
    () => branches.find(branch => branch.id === selectedBranchId) ?? null,
    [branches, selectedBranchId],
  );

  const assignableUsers = useMemo(() => {
    const assignedIds = new Set(branchUsers.map(user => user.id));
    return users.filter(user => !assignedIds.has(user.id));
  }, [branchUsers, users]);

  const openCreate = () => {
    setEditingBranch(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setIsModalOpen(true);
  };

  const openEdit = (branch: Branch) => {
    setEditingBranch(branch);
    setForm({
      name: branch.name,
      code: branch.code,
      address: branch.address,
      status: branch.status ?? 'active',
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const patchForm = (patch: Partial<BranchFormInput>) => {
    setForm(prev => ({ ...prev, ...patch }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError('');
    if (!form.name || !form.code || !form.address) {
      const message = t('swal.validation.branchRequired');
      setFormError(message);
      await appSwal.errorIncomplete(message);
      return;
    }

    const confirmed = await appSwal.confirmSave();
    if (!confirmed) return;

    try {
      if (editingBranch) {
        await updateBranch(editingBranch.id, form);
        await appSwal.successUpdated('branch', form.name);
      } else {
        await createBranch(form);
        await appSwal.successCreated('branch', form.name);
      }
      setIsModalOpen(false);
    } catch (error) {
      const message = getApiErrorMessage(error);
      if (editingBranch) await appSwal.errorUpdateFailed('branch', message);
      else await appSwal.errorCreateFailed('branch', message);
    }
  };

  const handleDelete = async (branch: Branch) => {
    const confirmed = await appSwal.confirmDelete(branch.name, 'branch');
    if (!confirmed) return;

    try {
      await deleteBranch(branch.id);
      await appSwal.successDeleted('branch', branch.name);
    } catch (error) {
      await appSwal.errorDeleteFailed('branch', getApiErrorMessage(error));
    }
  };

  const handleAssign = async () => {
    if (!selectedBranchId || !selectedUserId) return;
    const user = users.find(item => item.id === selectedUserId);
    const confirmed = await appSwal.confirmSubmit();
    if (!confirmed) return;

    try {
      await assignUserToBranch(selectedBranchId, selectedUserId);
      setSelectedUserId('');
      await appSwal.successAssigned(user?.name ?? 'User');
    } catch (error) {
      await appSwal.errorAssignFailed(getApiErrorMessage(error));
    }
  };

  const handleRemoveBranchUser = async (userId: string, userName: string) => {
    if (!selectedBranchId) return;
    const confirmed = await appSwal.confirmRemoveBranchUser(userName);
    if (!confirmed) return;

    try {
      await removeUserFromBranch(selectedBranchId, userId);
      await appSwal.successRemoved(userName);
    } catch (error) {
      await appSwal.errorRemoveFailed(getApiErrorMessage(error));
    }
  };

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <h1 className="page-title">Branches</h1>
          <p className="page-subtitle">Kelola cabang/dealer dan assignment user per branch.</p>
        </div>
        <div className="flex w-full items-center gap-3 sm:w-auto">
          <button className="icon-button" onClick={() => fetchBranches()} disabled={isLoading}>
            <RefreshCcw className={cn('h-5 w-5', isLoading && 'animate-spin')} />
          </button>
          <button className="btn-primary flex-1 sm:flex-none" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Tambah Branch
          </button>
        </div>
      </div>

      <div className="toolbar">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            className="form-input pl-9"
            placeholder="Cari branch, kode, atau alamat..."
          />
        </div>
        <div className="rounded-lg border border-divider bg-white px-3 py-2 text-sm text-muted-foreground shadow-sm">
          {filteredBranches.length} branch
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-danger-red/20 bg-danger-red/10 p-4 text-sm font-medium text-danger-red">
          {error}
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="table-header">
                <tr>
                  <th className="px-6 py-4">Branch</th>
                  <th className="px-6 py-4">Kode</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider">
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-sm text-muted-foreground">
                      Memuat branch...
                    </td>
                  </tr>
                ) : filteredBranches.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-14 text-center">
                      <Building2 className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
                      <p className="text-sm font-semibold text-foreground">Belum ada branch</p>
                      <p className="mt-1 text-xs text-muted-foreground">Data dari API /groups akan tampil di sini.</p>
                    </td>
                  </tr>
                ) : (
                  filteredBranches.map(branch => (
                    <tr
                      key={branch.id}
                      className={cn(
                        'transition hover:bg-surface/60',
                        selectedBranchId === branch.id && 'bg-primary-blue/[0.04]',
                      )}
                    >
                      <td className="px-6 py-4">
                        <p className="text-sm font-semibold text-foreground">{branch.name}</p>
                        <p className="mt-0.5 max-w-xl text-xs text-muted-foreground">{branch.address}</p>
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-foreground">{branch.code}</td>
                      <td className="px-6 py-4">
                        <span className="rounded-full bg-success-green/10 px-2.5 py-1 text-xs font-semibold capitalize text-success-green">
                          {branch.status || 'active'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            className="rounded-lg px-3 py-2 text-xs font-semibold text-primary-blue transition hover:bg-primary-blue/10"
                            onClick={() => fetchBranchUsers(branch.id)}
                          >
                            Users
                          </button>
                          <button
                            className="rounded-lg p-2 text-muted-foreground transition hover:bg-surface hover:text-foreground"
                            onClick={() => openEdit(branch)}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            className="rounded-lg p-2 text-muted-foreground transition hover:bg-danger-red/10 hover:text-danger-red"
                            onClick={() => handleDelete(branch)}
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

        <aside className="panel overflow-hidden">
          <div className="panel-header">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Branch Users</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {selectedBranch ? selectedBranch.name : 'Pilih branch dari tabel'}
              </p>
            </div>
            <Users className="h-5 w-5 text-primary-blue" />
          </div>

          <div className="space-y-4 p-4">
            {selectedBranchId && (
              <div className="flex gap-2">
                <select
                  className="form-input"
                  value={selectedUserId}
                  onChange={event => setSelectedUserId(event.target.value)}
                >
                  <option value="">Pilih user</option>
                  {assignableUsers.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
                <button className="btn-primary px-3" onClick={handleAssign} disabled={!selectedUserId || isSaving}>
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                </button>
              </div>
            )}

            {!selectedBranchId ? (
              <div className="rounded-lg border border-dashed border-divider p-6 text-center text-sm text-muted-foreground">
                Klik tombol Users pada salah satu branch.
              </div>
            ) : isLoadingUsers ? (
              <div className="py-10 text-center text-sm text-muted-foreground">Memuat user branch...</div>
            ) : branchUsers.length === 0 ? (
              <div className="rounded-lg border border-dashed border-divider p-6 text-center text-sm text-muted-foreground">
                Belum ada user pada branch ini.
              </div>
            ) : (
              <div className="space-y-2">
                {branchUsers.map(user => (
                  <div key={user.id} className="flex items-center justify-between gap-3 rounded-lg border border-divider p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{user.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                    </div>
                    <button
                      className="rounded-lg p-2 text-muted-foreground transition hover:bg-danger-red/10 hover:text-danger-red"
                      onClick={() => handleRemoveBranchUser(user.id, user.name)}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <form onSubmit={handleSubmit} className="w-full max-w-lg rounded-lg border border-divider bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-divider px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  {editingBranch ? 'Edit Branch' : 'Tambah Branch'}
                </h2>
                <p className="text-xs text-muted-foreground">Field mengikuti kontrak API /groups.</p>
              </div>
              <button type="button" onClick={() => setIsModalOpen(false)} className="rounded-lg p-2 hover:bg-surface">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 p-5">
              {(formError || error) && (
                <div className="rounded-lg border border-danger-red/20 bg-danger-red/10 p-3 text-sm text-danger-red">
                  {formError || error}
                </div>
              )}

              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-muted-foreground">Nama Branch</span>
                <input className="form-input" value={form.name} onChange={event => patchForm({ name: event.target.value })} />
              </label>

              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-muted-foreground">Kode</span>
                <input className="form-input" value={form.code} onChange={event => patchForm({ code: event.target.value })} />
              </label>

              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-muted-foreground">Alamat</span>
                <textarea
                  className="form-input min-h-24"
                  value={form.address}
                  onChange={event => patchForm({ address: event.target.value })}
                />
              </label>

              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-muted-foreground">Status</span>
                <select className="form-input" value={form.status ?? 'active'} onChange={event => patchForm({ status: event.target.value })}>
                  <option value="active">active</option>
                  <option value="inactive">inactive</option>
                </select>
              </label>
            </div>

            <div className="flex justify-end gap-3 border-t border-divider px-5 py-4">
              <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>
                Batal
              </button>
              <button type="submit" className="btn-primary" disabled={isSaving}>
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Simpan
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default BranchesPage;
