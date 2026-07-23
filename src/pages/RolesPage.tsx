import React, { useEffect, useMemo, useState } from 'react';
import { Check, KeyRound, Pencil, Plus, RefreshCcw, ShieldCheck, Trash2 } from 'lucide-react';
import { cn } from '../utils/cn';
import { useRoleStore } from '../stores/roleStore';
import type { Role, RoleFormInput } from '../types/management';
import { appSwal } from '../lib/appSwal';
import { getApiErrorMessage } from '../lib/apiResponse';
import { useTranslation } from 'react-i18next';
import { Can } from '../components/rbac/Can';
import { useRbac } from '../hooks/useRbac';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Field,
  IconButton,
  Input,
  Modal,
  PageHeader,
  RowAction,
  SearchInput,
  Spinner,
  TableWrap,
  Td,
  Textarea,
  Th,
} from '../components/ui';

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
      <PageHeader
        eyebrow="Akses"
        title="Roles"
        subtitle="Kelola role akses yang dipakai pada user management."
        actions={
          <>
            <IconButton onClick={() => fetchRoles()} disabled={isLoading} aria-label="Refresh">
              <RefreshCcw className={cn('h-5 w-5', isLoading && 'animate-spin')} />
            </IconButton>
            <Can resource="roles" action="create">
              <Button className="flex-1 sm:flex-none" onClick={openCreate} icon={<Plus className="h-4 w-4" />}>
                Tambah Role
              </Button>
            </Can>
          </>
        }
      />

      <div className="toolbar">
        <SearchInput
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder="Cari role..."
        />
        <Badge tone="outline" className="px-3.5 py-2 text-xs">
          {filteredRoles.length} role
        </Badge>
      </div>

      {error && <Alert tone="danger">{error}</Alert>}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_400px]">
        <TableWrap>
          <thead className="table-header">
            <tr>
              <Th>Role</Th>
              <Th>Permissions</Th>
              <Th>Status</Th>
              <Th className="text-right">Aksi</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline-soft">
            {isLoading && roles.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-sm text-stone">
                  <Spinner className="mx-auto h-6 w-6 text-primary-blue" />
                </td>
              </tr>
            ) : filteredRoles.length === 0 ? (
              <tr>
                <td colSpan={4}>
                  <EmptyState
                    icon={<ShieldCheck className="h-6 w-6" />}
                    title="Belum ada role"
                    description="Data dari API /roles akan tampil di sini."
                  />
                </td>
              </tr>
            ) : (
              filteredRoles.map(role => {
                const rolePermissions = permissionsByRoleId[role.id] ?? [];
                const isSelected = role.id === selectedRoleId;
                return (
                  <tr
                    key={role.id}
                    className={cn('transition hover:bg-surface/60', isSelected && 'bg-primary-blue/[0.05]')}
                  >
                    <Td>
                      <p className="text-sm font-semibold text-ink-deep">{role.name}</p>
                      <p className="mt-0.5 max-w-xl text-xs text-stone">{role.description || '-'}</p>
                    </Td>
                    <Td>
                      <button
                        className={cn(
                          'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition',
                          isSelected
                            ? 'border-primary-blue/30 bg-primary-blue/10 text-primary-blue'
                            : 'border-hairline-soft bg-card text-slate hover:bg-surface hover:text-ink-deep',
                        )}
                        onClick={() => openPermissions(role)}
                      >
                        <KeyRound className="h-3.5 w-3.5" />
                        {rolePermissions.length ? `${rolePermissions.length} permission` : 'Manage permissions'}
                      </button>
                    </Td>
                    <Td>
                      <Badge tone="success" className="capitalize">
                        {role.status || 'active'}
                      </Badge>
                    </Td>
                    <Td className="text-right">
                      <div className="inline-flex items-center gap-1">
                        <Can resource="roles" action="update">
                          <RowAction onClick={() => openEdit(role)} aria-label="Edit">
                            <Pencil className="h-4 w-4" />
                          </RowAction>
                        </Can>
                        <Can resource="roles" action="delete">
                          <RowAction tone="danger" onClick={() => handleDelete(role)} aria-label="Delete">
                            <Trash2 className="h-4 w-4" />
                          </RowAction>
                        </Can>
                      </div>
                    </Td>
                  </tr>
                );
              })
            )}
          </tbody>
        </TableWrap>

        <Card className="h-fit overflow-hidden">
          <CardHeader
            title={t('roles.permissions.title')}
            subtitle={selectedRole ? selectedRole.name : t('roles.permissions.emptyRole')}
            icon={<KeyRound className="h-4 w-4" />}
          />

          <div className="space-y-4 p-4">
            {!selectedRole ? (
              <EmptyState
                icon={<ShieldCheck className="h-6 w-6" />}
                title={t('roles.permissions.selectRole')}
                description={t('roles.permissions.selectRoleDesc')}
              />
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-surface p-3">
                    <p className="text-xs text-stone">Assigned</p>
                    <p className="mt-1 text-xl font-semibold text-ink-deep">{selectedPermissions.length}</p>
                  </div>
                  <div className="rounded-2xl bg-surface p-3">
                    <p className="text-xs text-stone">Available</p>
                    <p className="mt-1 text-xl font-semibold text-ink-deep">{permissions.length}</p>
                  </div>
                </div>

                <SearchInput
                  wrapClassName="w-full sm:max-w-none"
                  value={permissionQuery}
                  onChange={event => setPermissionQuery(event.target.value)}
                  placeholder={t('roles.permissions.search')}
                />

                <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
                  {filteredPermissions.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-hairline p-5 text-center text-sm text-stone">
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
                            'flex w-full items-start gap-3 rounded-2xl border p-3 text-left transition disabled:opacity-60',
                            assigned
                              ? 'border-primary-blue/25 bg-primary-blue/[0.05]'
                              : 'border-hairline-soft bg-card hover:border-primary-blue/30 hover:bg-surface',
                          )}
                        >
                          <span
                            className={cn(
                              'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border',
                              assigned
                                ? 'border-primary-blue bg-primary-blue text-white'
                                : 'border-hairline bg-card',
                            )}
                          >
                            {assigned && <Check className="h-3.5 w-3.5" />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-mono text-sm font-semibold text-ink-deep">
                              {permission.name}
                            </span>
                            <span className="mt-1 flex flex-wrap gap-1.5">
                              <Badge tone="neutral">{permission.resource || '-'}</Badge>
                              <Badge tone="neutral">{permission.action || '-'}</Badge>
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
        </Card>
      </div>

      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        eyebrow={editingRole ? 'Edit' : 'Baru'}
        title={editingRole ? 'Edit Role' : 'Tambah Role'}
        subtitle="Field mengikuti kontrak API /roles."
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Batal
            </Button>
            <Button
              type="submit"
              form="role-form"
              loading={isSaving}
              icon={!isSaving ? <Plus className="h-4 w-4" /> : undefined}
            >
              Simpan
            </Button>
          </>
        }
      >
        <form id="role-form" onSubmit={handleSubmit} className="space-y-4">
          {(formError || error) && <Alert tone="danger">{formError || error}</Alert>}
          <Field label="Nama Role" required>
            <Input
              value={form.name}
              onChange={event => setForm(prev => ({ ...prev, name: event.target.value }))}
            />
          </Field>
          <Field label="Deskripsi">
            <Textarea
              rows={4}
              value={form.description ?? ''}
              onChange={event => setForm(prev => ({ ...prev, description: event.target.value }))}
            />
          </Field>
        </form>
      </Modal>
    </div>
  );
};

export default RolesPage;
