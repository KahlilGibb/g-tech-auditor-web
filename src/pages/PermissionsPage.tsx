import React, { useEffect, useMemo, useState } from 'react';
import { KeyRound, Layers3, Plus, RefreshCcw, ShieldCheck, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { appSwal } from '../lib/appSwal';
import { getApiErrorMessage } from '../lib/apiResponse';
import { useRoleStore } from '../stores/roleStore';
import type { Permission, PermissionFormInput } from '../types/management';
import { cn } from '../utils/cn';
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
  StatCard,
  TableWrap,
  Td,
  Th,
} from '../components/ui';

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
      <PageHeader
        eyebrow="Akses"
        title="Permissions"
        subtitle="Kelola permission granular yang bisa dipasang ke role."
        actions={
          <>
            <IconButton onClick={() => fetchPermissions()} disabled={isLoading} aria-label="Refresh">
              <RefreshCcw className={cn('h-5 w-5', isLoading && 'animate-spin')} />
            </IconButton>
            <Can resource="permissions" action="create">
              <Button className="flex-1 sm:flex-none" onClick={openCreate} icon={<Plus className="h-4 w-4" />}>
                Tambah Permission
              </Button>
            </Can>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          icon={<KeyRound className="h-5 w-5" />}
          value={permissions.length}
          label="Total Permission"
          tone="brand"
        />
        <StatCard
          icon={<Layers3 className="h-5 w-5" />}
          value={resources.length}
          label="Resources"
          tone="lime"
        />
        <StatCard
          icon={<ShieldCheck className="h-5 w-5" />}
          value={actionCount}
          label="Actions"
          tone="success"
        />
      </div>

      <div className="toolbar">
        <SearchInput
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder="Cari permission, resource, action..."
        />
        <Select
          className="w-full sm:w-56"
          value={selectedResource}
          onChange={event => setSelectedResource(event.target.value)}
        >
          <option value="all">Semua resource</option>
          {resources.map(resource => (
            <option key={resource} value={resource}>
              {resource}
            </option>
          ))}
        </Select>
      </div>

      {error && <Alert tone="danger">{error}</Alert>}

      <TableWrap>
        <thead className="table-header">
          <tr>
            <Th>Permission</Th>
            <Th>Resource</Th>
            <Th>Action</Th>
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
          ) : filteredPermissions.length === 0 ? (
            <tr>
              <td colSpan={4}>
                <EmptyState
                  icon={<KeyRound className="h-6 w-6" />}
                  title="Belum ada permission"
                  description="Data dari API /permissions akan tampil di sini."
                />
              </td>
            </tr>
          ) : (
            filteredPermissions.map(permission => (
              <tr key={permission.id} className="transition hover:bg-surface/60">
                <Td>
                  <p className="font-mono text-sm font-semibold text-ink-deep">{permission.name}</p>
                </Td>
                <Td>
                  <Badge tone="brand">{permission.resource || '-'}</Badge>
                </Td>
                <Td>
                  <Badge tone="neutral">{permission.action || '-'}</Badge>
                </Td>
                <Td className="text-right">
                  <Can resource="permissions" action="delete">
                    <RowAction tone="danger" onClick={() => handleDelete(permission)} aria-label="Delete">
                      <Trash2 className="h-4 w-4" />
                    </RowAction>
                  </Can>
                </Td>
              </tr>
            ))
          )}
        </tbody>
      </TableWrap>

      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        eyebrow="Baru"
        title="Tambah Permission"
        subtitle="Field mengikuti kontrak API /permissions."
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Batal
            </Button>
            <Button
              type="submit"
              form="permission-form"
              loading={isSaving}
              icon={!isSaving ? <Plus className="h-4 w-4" /> : undefined}
            >
              Simpan
            </Button>
          </>
        }
      >
        <form id="permission-form" onSubmit={handleSubmit} className="space-y-4">
          {(formError || error) && <Alert tone="danger">{formError || error}</Alert>}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Resource">
              <Input
                value={form.resource}
                onChange={event => patchForm({ resource: event.target.value.trim().toLowerCase() })}
                placeholder="inspections"
              />
            </Field>

            <Field label="Action">
              <Input
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
            </Field>
          </div>

          <Field label="Permission Name">
            <Input
              className="font-mono"
              value={form.name}
              onChange={event => patchForm({ name: event.target.value.trim().toLowerCase() })}
              placeholder="inspections:read"
            />
          </Field>
        </form>
      </Modal>
    </div>
  );
};

export default PermissionsPage;
