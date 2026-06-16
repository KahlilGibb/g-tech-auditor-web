import React, { useEffect, useMemo, useState } from 'react';
import { BellPlus, Loader2, Pencil, Plus, RefreshCcw, Search, Trash2, UserPlus, Users, X } from 'lucide-react';
import { cn } from '../utils/cn';
import { useRoleStore } from '../stores/roleStore';
import { useUserStore } from '../stores/userStore';
import type { ManagementUser, UserFormInput } from '../types/management';
import { appSwal } from '../lib/appSwal';
import { getApiErrorMessage } from '../lib/apiResponse';
import { useTranslation } from 'react-i18next';

const EMPTY_FORM: UserFormInput = {
  username: '',
  email: '',
  name: '',
  password: '',
  roleName: '',
  roleId: '',
  status: 'active',
};

const UsersPage: React.FC = () => {
  const { t } = useTranslation();
  const { users, isLoading, isSaving, error, fetchUsers, createUser, updateUser, deleteUser, provisionGotify, reconcileGotify } =
    useUserStore();
  const { roles, fetchRoles } = useRoleStore();
  const [query, setQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ManagementUser | null>(null);
  const [form, setForm] = useState<UserFormInput>(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [gotifyUserId, setGotifyUserId] = useState<string | null>(null);
  const [isReconcilingGotify, setIsReconcilingGotify] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, [fetchRoles, fetchUsers]);

  const filteredUsers = useMemo(() => {
    const keyword = query.toLowerCase();
    return users.filter(user =>
      [user.name, user.email, user.username, user.roleName]
        .join(' ')
        .toLowerCase()
        .includes(keyword),
    );
  }, [query, users]);

  const openCreate = () => {
    const firstRole = roles[0];
    setEditingUser(null);
    setForm({
      ...EMPTY_FORM,
      roleName: firstRole?.name ?? '',
      roleId: firstRole?.id ?? '',
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const openEdit = (user: ManagementUser) => {
    setEditingUser(user);
    setForm({
      username: user.username,
      email: user.email,
      name: user.name,
      password: '',
      roleName: user.roleName,
      roleId: user.roleId,
      status: user.status ?? 'active',
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const patchForm = (patch: Partial<UserFormInput>) => {
    setForm(prev => ({ ...prev, ...patch }));
  };

  const handleRoleChange = (roleName: string) => {
    const role = roles.find(item => item.name === roleName);
    patchForm({ roleName, roleId: role?.id ?? '' });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError('');

    if (!form.name || !form.email || !form.username || !form.roleName) {
      const message = t('swal.validation.userRequired');
      setFormError(message);
      await appSwal.errorIncomplete(message);
      return;
    }

    if (!editingUser && !form.password) {
      const message = t('swal.validation.passwordRequired');
      setFormError(message);
      await appSwal.errorIncomplete(message);
      return;
    }

    const confirmed = await appSwal.confirmSave();
    if (!confirmed) return;

    try {
      if (editingUser) {
        await updateUser(editingUser.id, form);
        await appSwal.successUpdated('user', form.name);
      } else {
        await createUser(form);
        await appSwal.successCreated('user', form.name);
      }
      setIsModalOpen(false);
    } catch (error) {
      const message = getApiErrorMessage(error);
      if (editingUser) await appSwal.errorUpdateFailed('user', message);
      else await appSwal.errorCreateFailed('user', message);
    }
  };

  const handleDelete = async (user: ManagementUser) => {
    const confirmed = await appSwal.confirmDelete(user.name, 'user');
    if (!confirmed) return;

    try {
      await deleteUser(user.id);
      await appSwal.successDeleted('user', user.name);
    } catch (error) {
      await appSwal.errorDeleteFailed('user', getApiErrorMessage(error));
    }
  };

  const handleProvisionGotify = async (user: ManagementUser) => {
    const confirmed = await appSwal.confirm({
      title: t('users.gotify.confirmProvision.title'),
      text: t('users.gotify.confirmProvision.text', { name: user.name }),
      confirmText: t('swal.buttons.yes'),
      cancelText: t('swal.buttons.no'),
    });
    if (!confirmed) return;

    setGotifyUserId(user.id);
    try {
      await provisionGotify(user.id);
      await appSwal.success({
        title: t('users.gotify.successProvision.title'),
        text: t('users.gotify.successProvision.text', { name: user.name }),
      });
    } catch (gotifyError) {
      await appSwal.error({
        title: t('users.gotify.failedProvision.title'),
        text: getApiErrorMessage(gotifyError),
      });
    } finally {
      setGotifyUserId(null);
    }
  };

  const handleReconcileGotify = async () => {
    const confirmed = await appSwal.confirm({
      title: t('users.gotify.confirmReconcile.title'),
      text: t('users.gotify.confirmReconcile.text'),
      confirmText: t('swal.buttons.yes'),
      cancelText: t('swal.buttons.no'),
    });
    if (!confirmed) return;

    setIsReconcilingGotify(true);
    try {
      await reconcileGotify();
      await appSwal.success({
        title: t('users.gotify.successReconcile.title'),
        text: t('users.gotify.successReconcile.text'),
      });
    } catch (gotifyError) {
      await appSwal.error({
        title: t('users.gotify.failedReconcile.title'),
        text: getApiErrorMessage(gotifyError),
      });
    } finally {
      setIsReconcilingGotify(false);
    }
  };

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <h1 className="page-title">Users</h1>
          <p className="page-subtitle">Kelola akun, akses role, dan status user auditor.</p>
        </div>
        <div className="flex w-full items-center gap-3 sm:w-auto">
          <button className="btn-secondary flex-1 sm:flex-none" onClick={handleReconcileGotify} disabled={isReconcilingGotify}>
            {isReconcilingGotify ? <Loader2 className="h-4 w-4 animate-spin" /> : <BellPlus className="h-4 w-4" />}
            {t('users.gotify.reconcile')}
          </button>
          <button className="icon-button" onClick={() => fetchUsers()} disabled={isLoading}>
            <RefreshCcw className={cn('h-5 w-5', isLoading && 'animate-spin')} />
          </button>
          <button className="btn-primary flex-1 sm:flex-none" onClick={openCreate}>
            <UserPlus className="h-4 w-4" />
            Tambah User
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
            placeholder="Cari nama, email, username, atau role..."
          />
        </div>
        <div className="rounded-lg border border-divider bg-white px-3 py-2 text-sm text-muted-foreground shadow-sm">
          {filteredUsers.length} user
        </div>
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
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-divider">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-sm text-muted-foreground">
                    Memuat user...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-14 text-center">
                    <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
                    <p className="text-sm font-semibold text-foreground">Belum ada user</p>
                    <p className="mt-1 text-xs text-muted-foreground">Data dari API /users akan tampil di sini.</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map(user => (
                  <tr key={user.id} className="transition hover:bg-surface/60">
                    <td className="px-6 py-4">
                      <p className="text-sm font-semibold text-foreground">{user.name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {user.email} - @{user.username}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="rounded-full bg-primary-blue/10 px-2.5 py-1 text-xs font-semibold text-primary-blue">
                        {user.roleName || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="rounded-full bg-success-green/10 px-2.5 py-1 text-xs font-semibold capitalize text-success-green">
                        {user.status || 'active'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          className="rounded-lg p-2 text-muted-foreground transition hover:bg-primary-blue/10 hover:text-primary-blue disabled:opacity-50"
                          onClick={() => handleProvisionGotify(user)}
                          disabled={gotifyUserId === user.id}
                          title={t('users.gotify.provision')}
                        >
                          {gotifyUserId === user.id
                            ? <Loader2 className="h-4 w-4 animate-spin" />
                            : <BellPlus className="h-4 w-4" />}
                        </button>
                        <button
                          className="rounded-lg p-2 text-muted-foreground transition hover:bg-surface hover:text-foreground"
                          onClick={() => openEdit(user)}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          className="rounded-lg p-2 text-muted-foreground transition hover:bg-danger-red/10 hover:text-danger-red"
                          onClick={() => handleDelete(user)}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <form onSubmit={handleSubmit} className="w-full max-w-xl rounded-lg border border-divider bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-divider px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  {editingUser ? 'Edit User' : 'Tambah User'}
                </h2>
                <p className="text-xs text-muted-foreground">Field mengikuti kontrak API /users.</p>
              </div>
              <button type="button" onClick={() => setIsModalOpen(false)} className="rounded-lg p-2 hover:bg-surface">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-4 p-5 sm:grid-cols-2">
              {(formError || error) && (
                <div className="rounded-lg border border-danger-red/20 bg-danger-red/10 p-3 text-sm text-danger-red sm:col-span-2">
                  {formError || error}
                </div>
              )}

              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-muted-foreground">Nama</span>
                <input className="form-input" value={form.name} onChange={event => patchForm({ name: event.target.value })} />
              </label>

              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-muted-foreground">Username</span>
                <input className="form-input" value={form.username} onChange={event => patchForm({ username: event.target.value })} />
              </label>

              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-muted-foreground">Email</span>
                <input className="form-input" type="email" value={form.email} onChange={event => patchForm({ email: event.target.value })} />
              </label>

              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-muted-foreground">
                  Password {editingUser && <span className="font-normal">(kosongkan bila tidak diganti)</span>}
                </span>
                <input
                  className="form-input"
                  type="password"
                  value={form.password ?? ''}
                  onChange={event => patchForm({ password: event.target.value })}
                />
              </label>

              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-muted-foreground">Role</span>
                {roles.length > 0 ? (
                  <select className="form-input" value={form.roleName} onChange={event => handleRoleChange(event.target.value)}>
                    <option value="">Pilih role</option>
                    {roles.map(role => (
                      <option key={role.id} value={role.name}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input className="form-input" value={form.roleName} onChange={event => patchForm({ roleName: event.target.value })} />
                )}
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

export default UsersPage;
