import React, { useEffect, useMemo, useState } from 'react';
import { KeyRound, Layers3, Loader2, Plus, RefreshCcw, Search, ShieldCheck, Trash2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { appSwal } from '../lib/appSwal';
import { getApiErrorMessage } from '../lib/apiResponse';
import { useRoleStore } from '../stores/roleStore';
import type { Permission, PermissionFormInput } from '../types/management';
import { cn } from '../utils/cn';
import { Can } from '../components/rbac/Can';

const EMPTY_FORM: PermissionFormInput = {
  name: '',
  resource: '',
  action: '',
};

const ACTION_PRESETS = ['read', 'create', 'update', 'delete', 'manage', 'submit', 'approve'];

const PermissionsPage: React.FC = () => {
  const { t } = useTranslation();
  const {
    permissions,
    isLoading,
    isSaving,
    error,
    fetchPermissions,
    createPermission,
    deletePermission,
  } = useRoleStore();
  const [query, setQuery] = useState('');
  const [selectedResource, setSelectedResource] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<PermissionFormInput>(EMPTY_FORM);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const resources = useMemo(
    () => Array.from(new Set(permissions.map(permission => permission.resource).filter(Boolean))).sort(),
    [permissions],
  );

  const actionCount = useMemo(
    () => new Set(permissions.map(permission => permission.action).filter(Boolean)).size,
    [permissions],
  );

  const filteredPermissions = useMemo(() => {
    const keyword = query.toLowerCase();
    return permissions.filter(permission => {
      const matchesKeyword = [permission.name, permission.resource, permission.action]
        .join(' ')
        .toLowerCase()
        .includes(keyword);
      const matchesResource = selectedResource === 'all' || permission.resource === selectedResource;
      return matchesKeyword && matchesResource;
    });
  }, [permissions, query, selectedResource]);

  const patchForm = (patch: Partial<PermissionFormInput>) => {
    setForm(prev => {
      const next = { ...prev, ...patch };
      if ((patch.resource !== undefined || patch.action !== undefined) && next.resource && next.action) {
        next.name = `${next.resource}:${next.action}`;
      }
      return next;
    });
  };

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError('');

    if (!form.name || !form.resource || !form.action) {
      const message = t('swal.validation.permissionRequired');
      setFormError(message);
      await appSwal.errorIncomplete(message);
      return;
    }

    const confirmed = await appSwal.confirmSave();
    if (!confirmed) return;

    try {
      await createPermission(form);
      await appSwal.successCreated('permission', form.name);
      setIsModalOpen(false);
    } catch (submitError) {
      await appSwal.errorCreateFailed('permission', getApiErrorMessage(submitError));
    }
  };

  const handleDelete = async (permission: Permission) => {
    const confirmed = await appSwal.confirmDelete(permission.name, 'permission');
    if (!confirmed) return;

    try {
      await deletePermission(permission.id);
      await appSwal.successDeleted('permission', permission.name);
    } catch (deleteError) {
      await appSwal.errorDeleteFailed('permission', getApiErrorMessage(deleteError));
    }
  };

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <h1 className="page-title">Permissions</h1>
          <p className="page-subtitle">Kelola permission granular yang bisa dipasang ke role.</p>
        </div>
        <div className="flex w-full items-center gap-3 sm:w-auto">
          <button className="icon-button" onClick={() => fetchPermissions()} disabled={isLoading}>
            <RefreshCcw className={cn('h-5 w-5', isLoading && 'animate-spin')} />
          </button>
          <Can resource="permissions" action="create">
            <button className="btn-primary flex-1 sm:flex-none" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Tambah Permission
            </button>
          </Can>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="panel p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-muted-foreground">Total Permission</p>
            <KeyRound className="h-5 w-5 text-primary-blue" />
          </div>
          <p className="mt-3 text-3xl font-semibold text-foreground">{permissions.length}</p>
        </div>
        <div className="panel p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-muted-foreground">Resources</p>
            <Layers3 className="h-5 w-5 text-primary-blue" />
          </div>
          <p className="mt-3 text-3xl font-semibold text-foreground">{resources.length}</p>
        </div>
        <div className="panel p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-muted-foreground">Actions</p>
            <ShieldCheck className="h-5 w-5 text-primary-blue" />
          </div>
          <p className="mt-3 text-3xl font-semibold text-foreground">{actionCount}</p>
        </div>
      </div>

      <div className="toolbar">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            className="form-input pl-9"
            placeholder="Cari permission, resource, action..."
          />
        </div>
        <select
          className="form-input w-full sm:w-56"
          value={selectedResource}
          onChange={event => setSelectedResource(event.target.value)}
        >
          <option value="all">Semua resource</option>
          {resources.map(resource => (
            <option key={resource} value={resource}>
              {resource}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="rounded-lg border border-danger-red/20 bg-danger-red/10 p-4 text-sm font-medium text-danger-red">
          {error}
        </div>
      )}

      <div className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="table-header">
              <tr>
                <th className="px-6 py-4">Permission</th>
                <th className="px-6 py-4">Resource</th>
                <th className="px-6 py-4">Action</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-divider">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-sm text-muted-foreground">
                    Memuat permission...
                  </td>
                </tr>
              ) : filteredPermissions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-14 text-center">
                    <KeyRound className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
                    <p className="text-sm font-semibold text-foreground">Belum ada permission</p>
                    <p className="mt-1 text-xs text-muted-foreground">Data dari API /permissions akan tampil di sini.</p>
                  </td>
                </tr>
              ) : (
                filteredPermissions.map(permission => (
                  <tr key={permission.id} className="transition hover:bg-surface/60">
                    <td className="px-6 py-4">
                      <p className="font-mono text-sm font-semibold text-foreground">{permission.name}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="rounded-full bg-primary-blue/10 px-2.5 py-1 text-xs font-semibold text-primary-blue">
                        {permission.resource || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="rounded-full bg-surface px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                        {permission.action || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Can resource="permissions" action="delete">
                        <button
                          className="rounded-lg p-2 text-muted-foreground transition hover:bg-danger-red/10 hover:text-danger-red"
                          onClick={() => handleDelete(permission)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </Can>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <form onSubmit={handleSubmit} className="w-full max-w-lg rounded-lg border border-divider bg-card shadow-xl">
            <div className="flex items-center justify-between border-b border-divider px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-foreground">Tambah Permission</h2>
                <p className="text-xs text-muted-foreground">Field mengikuti kontrak API /permissions.</p>
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

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1.5">
                  <span className="text-xs font-semibold text-muted-foreground">Resource</span>
                  <input
                    className="form-input"
                    value={form.resource}
                    onChange={event => patchForm({ resource: event.target.value.trim().toLowerCase() })}
                    placeholder="inspections"
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="text-xs font-semibold text-muted-foreground">Action</span>
                  <input
                    className="form-input"
                    value={form.action}
                    onChange={event => patchForm({ action: event.target.value.trim().toLowerCase() })}
                    placeholder="read"
                    list="permission-action-presets"
                  />
                  <datalist id="permission-action-presets">
                    {ACTION_PRESETS.map(action => (
                      <option key={action} value={action} />
                    ))}
                  </datalist>
                </label>
              </div>

              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-muted-foreground">Permission Name</span>
                <input
                  className="form-input font-mono"
                  value={form.name}
                  onChange={event => patchForm({ name: event.target.value.trim().toLowerCase() })}
                  placeholder="inspections:read"
                />
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

export default PermissionsPage;
