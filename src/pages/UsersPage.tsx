import React, { useEffect, useMemo, useState } from 'react';
import { BellPlus, Loader2, Pencil, Plus, RefreshCcw, Trash2, UserPlus, Users } from 'lucide-react';
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
      <PageHeader
        eyebrow="Manajemen"
        title="Users"
        subtitle="Kelola akun, akses role, dan status user auditor."
        actions={
          <>
            <Can resource="users" action="update">
              <Button
                variant="secondary"
                className="flex-1 sm:flex-none"
                onClick={handleReconcileGotify}
                loading={isReconcilingGotify}
                icon={!isReconcilingGotify ? <BellPlus className="h-4 w-4" /> : undefined}
              >
                {t('users.gotify.reconcile')}
              </Button>
            </Can>
            <IconButton onClick={() => fetchUsers()} disabled={isLoading} aria-label="Refresh">
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
          onChange={event => setQuery(event.target.value)}
          placeholder="Cari nama, email, username, atau role..."
        />
        <Badge tone="outline" className="px-3.5 py-2 text-xs">
          {filteredUsers.length} user
        </Badge>
      </div>

      {error && <Alert tone="danger">{error}</Alert>}

      <TableWrap>
        <thead className="table-header">
          <tr>
            <Th>User</Th>
            <Th>Role</Th>
            <Th>Status</Th>
            <Th className="text-right">Aksi</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-hairline-soft">
          {isLoading ? (
            <tr>
              <td colSpan={4} className="px-6 py-12 text-center text-sm text-stone">
                <Spinner className="mx-auto h-6 w-6 text-primary-blue" />
              </td>
            </tr>
          ) : filteredUsers.length === 0 ? (
            <tr>
              <td colSpan={4}>
                <EmptyState
                  icon={<Users className="h-6 w-6" />}
                  title="Belum ada user"
                  description="Data dari API /users akan tampil di sini."
                />
              </td>
            </tr>
          ) : (
            filteredUsers.map(user => (
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
                <Td className="text-right">
                  <div className="inline-flex items-center gap-1">
                    <Can resource="users" action="update">
                      <RowAction
                        tone="brand"
                        onClick={() => handleProvisionGotify(user)}
                        disabled={gotifyUserId === user.id}
                        title={t('users.gotify.provision')}
                        aria-label={t('users.gotify.provision')}
                      >
                        {gotifyUserId === user.id
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : <BellPlus className="h-4 w-4" />}
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
            {roles.length > 0 ? (
              <Select value={form.roleName} onChange={event => handleRoleChange(event.target.value)}>
                <option value="">Pilih role</option>
                {roles.map(role => (
                  <option key={role.id} value={role.name}>
                    {role.name}
                  </option>
                ))}
              </Select>
            ) : (
              <Input value={form.roleName} onChange={event => patchForm({ roleName: event.target.value })} />
            )}
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
