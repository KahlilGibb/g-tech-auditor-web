import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Laptop, Loader2, LogOut, Pencil, Plus, RefreshCcw, Trash2, UserPlus, Users } from 'lucide-react';
import { cn } from '../utils/cn';
import { useRoleStore } from '../stores/roleStore';
import { useUserStore } from '../stores/userStore';
import type { ManagementUser, UserFormInput } from '../types/management';
import { appSwal } from '../lib/appSwal';
import { getApiErrorMessage } from '../lib/apiResponse';
import { useTranslation } from 'react-i18next';
import { Can } from '../components/rbac/Can';
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
  SearchInput,
  Select,
  Spinner,
  TableWrap,
  Td,
  Th,
} from '../components/ui';

const EMPTY_FORM: UserFormInput = {
  username: '',
  email: '',
  name: '',
  password: '',
  roleName: '',
  roleId: '',
  status: 'active',
};

const USERS_PER_PAGE = 20;

const UsersPage: React.FC = () => {
  const { t } = useTranslation();
  const { users, total, isLoading, isSaving, error, fetchUsers, createUser, updateUser, deleteUser, logoutAllDevices } =
    useUserStore();
  const {
    roles,
    error: rolesError,
    isLoading: isLoadingRoles,
    fetchRoles,
  } = useRoleStore();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ManagementUser | null>(null);
  const [form, setForm] = useState<UserFormInput>(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [logoutUserId, setLogoutUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    void fetchUsers({ page: currentPage, limit: USERS_PER_PAGE, search: debouncedQuery || undefined });
  }, [currentPage, debouncedQuery, fetchUsers]);

  const totalPages = Math.max(1, Math.ceil(total / USERS_PER_PAGE));
  const rangeStart = total === 0 ? 0 : (currentPage - 1) * USERS_PER_PAGE + 1;
  const rangeEnd = Math.min(currentPage * USERS_PER_PAGE, total);

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

  const selectedRoleId = form.roleId || roles.find(role => role.name === form.roleName)?.id || '';

  const handleRoleChange = (roleId: string) => {
    const role = roles.find(item => item.id === roleId);
    patchForm({ roleName: role?.name ?? '', roleId });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError('');

    if (!form.name || !form.email || !form.username || !form.roleName || !selectedRoleId) {
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
      if (users.length === 1 && currentPage > 1) {
        setCurrentPage(page => page - 1);
      } else {
        await fetchUsers({ page: currentPage, limit: USERS_PER_PAGE, search: debouncedQuery || undefined });
      }
    } catch (error) {
      await appSwal.errorDeleteFailed('user', getApiErrorMessage(error));
    }
  };

  const handleLogoutAllDevices = async (user: ManagementUser) => {
    if (!user.activeDeviceCount) return;
    const confirmed = await appSwal.confirm({
      title: 'Logout semua perangkat?',
      text: `${user.name} akan dikeluarkan dari ${user.activeDeviceCount} perangkat aktif.`,
      confirmText: 'Ya, logout semua',
      cancelText: 'Batal',
    });
    if (!confirmed) return;
    setLogoutUserId(user.id);
    try {
      await logoutAllDevices(user.id);
      await appSwal.success({ title: 'Semua perangkat berhasil dilogout', text: `Seluruh sesi aktif ${user.name} sudah dicabut.` });
    } catch (logoutError) {
      await appSwal.error({ title: 'Gagal logout perangkat', text: getApiErrorMessage(logoutError) });
    } finally {
      setLogoutUserId(null);
    }
  };

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Manajemen"
        title="Users"
        subtitle="Kelola akun, akses role, dan status user auditor."
        actions={
          <>
            <IconButton
              onClick={() => fetchUsers({ page: currentPage, limit: USERS_PER_PAGE, search: debouncedQuery || undefined })}
              disabled={isLoading}
              aria-label="Refresh"
            >
              <RefreshCcw className={cn('h-5 w-5', isLoading && 'animate-spin')} />
            </IconButton>
            <Can resource="users" action="create">
              <Button className="flex-1 sm:flex-none" onClick={openCreate} icon={<UserPlus className="h-4 w-4" />}>
                Tambah User
              </Button>
            </Can>
          </>
        }
      />

      <div className="toolbar">
        <SearchInput
          value={query}
          onChange={event => {
            setQuery(event.target.value);
            setCurrentPage(1);
          }}
          placeholder="Cari nama, email, username, atau role..."
        />
        <Badge tone="outline" className="px-3.5 py-2 text-xs">
          {total} user
        </Badge>
      </div>

      {error && <Alert tone="danger">{error}</Alert>}

      <TableWrap>
        <thead className="table-header">
          <tr>
            <Th>User</Th>
            <Th>Role</Th>
            <Th>Status</Th>
            <Th>Perangkat Aktif</Th>
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
          ) : users.length === 0 ? (
            <tr>
              <td colSpan={5}>
                <EmptyState
                  icon={<Users className="h-6 w-6" />}
                  title={debouncedQuery ? 'User tidak ditemukan' : 'Belum ada user'}
                  description={debouncedQuery ? `Tidak ada hasil untuk “${debouncedQuery}”.` : 'Data dari API /users akan tampil di sini.'}
                />
              </td>
            </tr>
          ) : (
            users.map(user => (
              <tr key={user.id} className="transition hover:bg-surface/60">
                <Td>
                  <p className="text-sm font-semibold text-ink-deep">{user.name}</p>
                  <p className="mt-0.5 text-xs text-stone">
                    {user.email} - @{user.username}
                  </p>
                </Td>
                <Td>
                  <Badge tone="brand">{user.roleName || '-'}</Badge>
                </Td>
                <Td>
                  <Badge tone={user.status === 'inactive' ? 'neutral' : 'success'} className="capitalize">
                    {user.status || 'active'}
                  </Badge>
                </Td>
                <Td>
                  <Badge tone={user.activeDeviceCount ? 'brand' : 'neutral'}>
                    <Laptop className="h-3.5 w-3.5" />
                    {user.activeDeviceCount ?? '—'} perangkat
                  </Badge>
                </Td>
                <Td className="text-right">
                  <div className="inline-flex items-center gap-1">
                    <Can resource="users" action="update">
                      <RowAction
                        tone="danger"
                        onClick={() => handleLogoutAllDevices(user)}
                        disabled={!user.activeDeviceCount || logoutUserId === user.id}
                        title="Logout semua perangkat"
                        aria-label="Logout semua perangkat"
                      >
                        {logoutUserId === user.id
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : <LogOut className="h-4 w-4" />}
                      </RowAction>
                      <RowAction onClick={() => openEdit(user)} aria-label="Edit">
                        <Pencil className="h-4 w-4" />
                      </RowAction>
                    </Can>
                    <Can resource="users" action="delete">
                      <RowAction tone="danger" onClick={() => handleDelete(user)} aria-label="Delete">
                        <Trash2 className="h-4 w-4" />
                      </RowAction>
                    </Can>
                  </div>
                </Td>
              </tr>
            ))
          )}
        </tbody>
      </TableWrap>

      {total > 0 && (
        <div className="flex flex-col gap-3 rounded-2xl border border-hairline-soft bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="text-xs text-stone" aria-live="polite">
            Menampilkan <span className="font-semibold text-ink-deep">{rangeStart}–{rangeEnd}</span> dari{' '}
            <span className="font-semibold text-ink-deep">{total}</span> user
          </p>
          <nav className="flex items-center gap-2" aria-label="Pagination user">
            <IconButton
              onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
              disabled={isLoading || currentPage === 1}
              className="h-9 w-9"
              aria-label="Halaman sebelumnya"
            >
              <ChevronLeft className="h-4 w-4" />
            </IconButton>
            <span className="min-w-20 rounded-full border border-hairline-soft bg-surface px-3 py-2 text-center text-xs font-semibold tabular-nums text-ink-deep">
              {currentPage} / {totalPages}
            </span>
            <IconButton
              onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
              disabled={isLoading || currentPage >= totalPages}
              className="h-9 w-9"
              aria-label="Halaman berikutnya"
            >
              <ChevronRight className="h-4 w-4" />
            </IconButton>
          </nav>
        </div>
      )}

      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        eyebrow={editingUser ? 'Edit' : 'Baru'}
        title={editingUser ? 'Edit User' : 'Tambah User'}
        subtitle="Field mengikuti kontrak API /users."
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Batal
            </Button>
            <Button
              type="submit"
              form="user-form"
              loading={isSaving}
              icon={!isSaving ? <Plus className="h-4 w-4" /> : undefined}
            >
              Simpan
            </Button>
          </>
        }
      >
        <form id="user-form" onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          {(formError || error) && (
            <Alert tone="danger" className="sm:col-span-2">
              {formError || error}
            </Alert>
          )}

          {rolesError && (
            <Alert tone="danger" className="sm:col-span-2">
              Gagal memuat role: {rolesError}
            </Alert>
          )}

          <Field label="Nama">
            <Input value={form.name} onChange={event => patchForm({ name: event.target.value })} />
          </Field>

          <Field label="Username">
            <Input value={form.username} onChange={event => patchForm({ username: event.target.value })} />
          </Field>

          <Field label="Email">
            <Input type="email" value={form.email} onChange={event => patchForm({ email: event.target.value })} />
          </Field>

          <Field
            label={
              <>
                Password {editingUser && <span className="font-normal text-stone">(kosongkan bila tidak diganti)</span>}
              </>
            }
          >
            <Input
              type="password"
              value={form.password ?? ''}
              onChange={event => patchForm({ password: event.target.value })}
            />
          </Field>

          <Field label="Role">
            <Select
              value={selectedRoleId}
              onChange={event => handleRoleChange(event.target.value)}
              disabled={isLoadingRoles || roles.length === 0}
            >
              <option value="">
                {isLoadingRoles ? 'Memuat role...' : rolesError ? 'Role gagal dimuat' : 'Pilih role'}
              </option>
              {roles.map(role => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Status">
            <Select value={form.status ?? 'active'} onChange={event => patchForm({ status: event.target.value })}>
              <option value="active">active</option>
              <option value="inactive">inactive</option>
            </Select>
          </Field>
        </form>
      </Modal>
    </div>
  );
};

export default UsersPage;
