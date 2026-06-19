import React, { useEffect, useMemo, useState } from 'react';
import { Check, KeyRound, Loader2, Pencil, Plus, RefreshCcw, Search, ShieldCheck, Trash2, X } from 'lucide-react';
import { cn } from '../utils/cn';
import { useRoleStore } from '../stores/roleStore';
import type { Role, RoleFormInput } from '../types/management';
import { appSwal } from '../lib/appSwal';
import { getApiErrorMessage } from '../lib/apiResponse';
import { useTranslation } from 'react-i18next';
import { Can } from '../components/rbac/Can';
import { useRbac } from '../hooks/useRbac';

const EMPTY_FORM: RoleFormInput = {
  name: '',
  description: '',
};

const RolesPage: React.FC = () => {
  const { t } = useTranslation();
  const { can } = useRbac();
  const {
    roles,
    permissions,
    permissionsByRoleId,
    isLoading,
    isSaving,
    error,
    fetchRoles,
    createRole,
    updateRole,
    deleteRole,
    fetchPermissions,
    fetchRolePermissions,
    addPermissionToRole,
    removePermissionFromRole,
  } = useRoleStore();
  const [query, setQuery] = useState('');
  const [permissionQuery, setPermissionQuery] = useState('');
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [form, setForm] = useState<RoleFormInput>(EMPTY_FORM);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    fetchRoles();
    fetchPermissions();
  }, [fetchPermissions, fetchRoles]);

  const filteredRoles = useMemo(() => {
    const keyword = query.toLowerCase();
    return roles.filter(role => [role.name, role.description].join(' ').toLowerCase().includes(keyword));
  }, [query, roles]);

  const selectedRole = useMemo(
    () => roles.find(role => role.id === selectedRoleId) ?? null,
    [roles, selectedRoleId],
  );

  const selectedPermissions = useMemo(
    () => (selectedRoleId ? permissionsByRoleId[selectedRoleId] ?? [] : []),
    [permissionsByRoleId, selectedRoleId],
  );
  const selectedPermissionIds = useMemo(
    () => new Set(selectedPermissions.map(permission => permission.id)),
    [selectedPermissions],
  );

  const filteredPermissions = useMemo(() => {
    const keyword = permissionQuery.toLowerCase();
    return permissions.filter(permission =>
      [permission.name, permission.resource, permission.action].join(' ').toLowerCase().includes(keyword),
    );
  }, [permissionQuery, permissions]);

  const openCreate = () => {
    setEditingRole(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setIsModalOpen(true);
  };

  const openEdit = (role: Role) => {
    setEditingRole(role);
    setForm({ name: role.name, description: role.description ?? '' });
    setFormError('');
    setIsModalOpen(true);
  };

  const openPermissions = async (role: Role) => {
    setSelectedRoleId(role.id);
    await fetchRolePermissions(role.id);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError('');
    if (!form.name) {
      const message = t('swal.validation.roleRequired');
      setFormError(message);
      await appSwal.errorIncomplete(message);
      return;
    }

    const confirmed = await appSwal.confirmSave();
    if (!confirmed) return;

    try {
      if (editingRole) {
        await updateRole(editingRole.id, form);
        await appSwal.successUpdated('role', form.name);
      } else {
        await createRole(form);
        await appSwal.successCreated('role', form.name);
      }
      setIsModalOpen(false);
    } catch (error) {
      const message = getApiErrorMessage(error);
      if (editingRole) await appSwal.errorUpdateFailed('role', message);
      else await appSwal.errorCreateFailed('role', message);
    }
  };

  const handleDelete = async (role: Role) => {
    const confirmed = await appSwal.confirmDelete(role.name, 'role');
    if (!confirmed) return;

    try {
      await deleteRole(role.id);
      await appSwal.successDeleted('role', role.name);
    } catch (error) {
      await appSwal.errorDeleteFailed('role', getApiErrorMessage(error));
    }
  };

  const handleTogglePermission = async (permissionId: string, assigned: boolean) => {
    if (!selectedRole) return;

    const permission = permissions.find(item => item.id === permissionId);
    const confirmed = assigned
      ? await appSwal.confirm({
          title: t('roles.permissions.confirmRemove.title'),
          text: t('roles.permissions.confirmRemove.text', {
            permission: permission?.name ?? permissionId,
            role: selectedRole.name,
          }),
          tone: 'danger',
        })
      : await appSwal.confirm({
          title: t('roles.permissions.confirmAdd.title'),
          text: t('roles.permissions.confirmAdd.text', {
            permission: permission?.name ?? permissionId,
            role: selectedRole.name,
          }),
        });

    if (!confirmed) return;

    try {
      if (assigned) {
        await removePermissionFromRole(selectedRole.id, permissionId);
      } else {
        await addPermissionToRole(selectedRole.id, permissionId);
      }
      await appSwal.successSaved('role');
    } catch (error) {
      await appSwal.errorSaveFailed('role', getApiErrorMessage(error));
    }
  };

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <h1 className="page-title">Roles</h1>
          <p className="page-subtitle">Kelola role akses yang dipakai pada user management.</p>
        </div>
        <div className="flex w-full items-center gap-3 sm:w-auto">
          <button className="icon-button" onClick={() => fetchRoles()} disabled={isLoading}>
            <RefreshCcw className={cn('h-5 w-5', isLoading && 'animate-spin')} />
          </button>
          <Can resource="roles" action="create">
            <button className="btn-primary flex-1 sm:flex-none" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Tambah Role
            </button>
          </Can>
        </div>
      </div>

      <div className="toolbar">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            className="form-input pl-9"
            placeholder="Cari role..."
          />
        </div>
        <div className="rounded-lg border border-divider bg-card px-3 py-2 text-sm text-muted-foreground shadow-sm">
          {filteredRoles.length} role
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-danger-red/20 bg-danger-red/10 p-4 text-sm font-medium text-danger-red">
          {error}
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="table-header">
                <tr>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Permissions</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider">
                {isLoading && roles.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-sm text-muted-foreground">
                      Memuat role...
                    </td>
                  </tr>
                ) : filteredRoles.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-14 text-center">
                      <ShieldCheck className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
                      <p className="text-sm font-semibold text-foreground">Belum ada role</p>
                      <p className="mt-1 text-xs text-muted-foreground">Data dari API /roles akan tampil di sini.</p>
                    </td>
                  </tr>
                ) : (
                  filteredRoles.map(role => {
                    const rolePermissions = permissionsByRoleId[role.id] ?? [];
                    const isSelected = role.id === selectedRoleId;
                    return (
                      <tr key={role.id} className={cn('transition hover:bg-surface/60', isSelected && 'bg-primary-blue/[0.04]')}>
                        <td className="px-6 py-4">
                          <p className="text-sm font-semibold text-foreground">{role.name}</p>
                          <p className="mt-0.5 max-w-xl text-xs text-muted-foreground">{role.description || '-'}</p>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            className={cn(
                              'inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold transition',
                              isSelected
                                ? 'border-primary-blue/30 bg-primary-blue/10 text-primary-blue'
                                : 'border-divider bg-card text-muted-foreground hover:bg-surface hover:text-foreground',
                            )}
                            onClick={() => openPermissions(role)}
                          >
                            <KeyRound className="h-3.5 w-3.5" />
                            {rolePermissions.length ? `${rolePermissions.length} permission` : 'Manage permissions'}
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <span className="rounded-full bg-success-green/10 px-2.5 py-1 text-xs font-semibold capitalize text-success-green">
                            {role.status || 'active'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="inline-flex items-center gap-1">
                            <Can resource="roles" action="update">
                              <button
                                className="rounded-lg p-2 text-muted-foreground transition hover:bg-surface hover:text-foreground"
                                onClick={() => openEdit(role)}
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                            </Can>
                            <Can resource="roles" action="delete">
                              <button
                                className="rounded-lg p-2 text-muted-foreground transition hover:bg-danger-red/10 hover:text-danger-red"
                                onClick={() => handleDelete(role)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </Can>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="panel overflow-hidden">
          <div className="panel-header">
            <div>
              <h2 className="text-sm font-semibold text-foreground">{t('roles.permissions.title')}</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {selectedRole ? selectedRole.name : t('roles.permissions.emptyRole')}
              </p>
            </div>
            <KeyRound className="h-5 w-5 text-primary-blue" />
          </div>

          <div className="space-y-4 p-4">
            {!selectedRole ? (
              <div className="rounded-lg border border-dashed border-divider p-6 text-center">
                <ShieldCheck className="mx-auto mb-3 h-9 w-9 text-muted-foreground/30" />
                <p className="text-sm font-semibold text-foreground">{t('roles.permissions.selectRole')}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{t('roles.permissions.selectRoleDesc')}</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-surface p-3">
                    <p className="text-xs text-muted-foreground">Assigned</p>
                    <p className="mt-1 text-xl font-semibold text-foreground">{selectedPermissions.length}</p>
                  </div>
                  <div className="rounded-lg bg-surface p-3">
                    <p className="text-xs text-muted-foreground">Available</p>
                    <p className="mt-1 text-xl font-semibold text-foreground">{permissions.length}</p>
                  </div>
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={permissionQuery}
                    onChange={event => setPermissionQuery(event.target.value)}
                    className="form-input pl-9"
                    placeholder={t('roles.permissions.search')}
                  />
                </div>

                <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
                  {filteredPermissions.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-divider p-5 text-center text-sm text-muted-foreground">
                      {t('roles.permissions.emptyPermissions')}
                    </div>
                  ) : (
                    filteredPermissions.map(permission => {
                      const assigned = selectedPermissionIds.has(permission.id);
                      return (
                        <button
                          key={permission.id}
                          disabled={isSaving || !can('roles', 'update')}
                          onClick={() => handleTogglePermission(permission.id, assigned)}
                          className={cn(
                            'flex w-full items-start gap-3 rounded-lg border p-3 text-left transition',
                            assigned
                              ? 'border-primary-blue/25 bg-primary-blue/[0.04]'
                              : 'border-divider bg-card hover:border-primary-blue/30 hover:bg-surface',
                          )}
                        >
                          <span
                            className={cn(
                              'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border',
                              assigned ? 'border-primary-blue bg-primary-blue text-[#181a20]' : 'border-divider bg-card',
                            )}
                          >
                            {assigned && <Check className="h-3.5 w-3.5" />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-mono text-sm font-semibold text-foreground">{permission.name}</span>
                            <span className="mt-1 flex flex-wrap gap-1.5">
                              <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                                {permission.resource || '-'}
                              </span>
                              <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                                {permission.action || '-'}
                              </span>
                            </span>
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </>
            )}
          </div>
        </aside>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <form onSubmit={handleSubmit} className="w-full max-w-lg rounded-lg border border-divider bg-card shadow-xl">
            <div className="flex items-center justify-between border-b border-divider px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  {editingRole ? 'Edit Role' : 'Tambah Role'}
                </h2>
                <p className="text-xs text-muted-foreground">Field mengikuti kontrak API /roles.</p>
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
                <span className="text-xs font-semibold text-muted-foreground">Nama Role</span>
                <input
                  className="form-input"
                  value={form.name}
                  onChange={event => setForm(prev => ({ ...prev, name: event.target.value }))}
                />
              </label>

              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-muted-foreground">Deskripsi</span>
                <textarea
                  className="form-input min-h-24"
                  value={form.description ?? ''}
                  onChange={event => setForm(prev => ({ ...prev, description: event.target.value }))}
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

export default RolesPage;
