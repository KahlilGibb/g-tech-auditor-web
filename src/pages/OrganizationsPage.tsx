import React, { useEffect, useMemo, useState } from 'react';
import { Building2, Mail, Pencil, Phone, Plus, RefreshCcw, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '../lib/apiResponse';
import { appSwal } from '../lib/appSwal';
import { useOrganizationStore } from '../stores/organizationStore';
import type { Organization, OrganizationFormInput } from '../types/management';
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
  TableWrap,
  Td,
  Textarea,
  Th,
} from '../components/ui';

const EMPTY_FORM: OrganizationFormInput = {
  name: '',
  code: '',
  address: '',
  phone: '',
  email: '',
  status: 'active',
};

const OrganizationsPage: React.FC = () => {
  const { t } = useTranslation();
  const {
    organizations,
    isLoading,
    isSaving,
    error,
    fetchOrganizations,
    createOrganization,
    updateOrganization,
    deleteOrganization,
  } = useOrganizationStore();
  const [query, setQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrganization, setEditingOrganization] = useState<Organization | null>(null);
  const [form, setForm] = useState<OrganizationFormInput>(EMPTY_FORM);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  const filteredOrganizations = useMemo(() => {
    const keyword = query.toLowerCase();
    return organizations.filter(organization =>
      [
        organization.name,
        organization.code,
        organization.address,
        organization.phone,
        organization.email,
      ]
        .join(' ')
        .toLowerCase()
        .includes(keyword),
    );
  }, [organizations, query]);

  const patchForm = (patch: Partial<OrganizationFormInput>) => {
    setForm(prev => ({ ...prev, ...patch }));
  };

  const openCreate = () => {
    setEditingOrganization(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setIsModalOpen(true);
  };

  const openEdit = (organization: Organization) => {
    setEditingOrganization(organization);
    setForm({
      name: organization.name,
      code: organization.code,
      address: organization.address ?? '',
      phone: organization.phone ?? '',
      email: organization.email ?? '',
      status: organization.status ?? 'active',
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError('');

    if (!form.name || !form.code) {
      const message = t('swal.validation.organizationRequired');
      setFormError(message);
      await appSwal.errorIncomplete(message);
      return;
    }

    const confirmed = await appSwal.confirmSave();
    if (!confirmed) return;

    try {
      if (editingOrganization) {
        await updateOrganization(editingOrganization.id, form);
        await appSwal.successUpdated('organization', form.name);
      } else {
        await createOrganization(form);
        await appSwal.successCreated('organization', form.name);
      }
      setIsModalOpen(false);
    } catch (submitError) {
      const message = getApiErrorMessage(submitError);
      if (editingOrganization) await appSwal.errorUpdateFailed('organization', message);
      else await appSwal.errorCreateFailed('organization', message);
    }
  };

  const handleDelete = async (organization: Organization) => {
    const confirmed = await appSwal.confirmDelete(organization.name, 'organization');
    if (!confirmed) return;

    try {
      await deleteOrganization(organization.id);
      await appSwal.successDeleted('organization', organization.name);
    } catch (deleteError) {
      await appSwal.errorDeleteFailed('organization', getApiErrorMessage(deleteError));
    }
  };

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Organisasi"
        title="Organizations"
        subtitle="Kelola data organisasi yang menjadi induk site dan branch."
        actions={
          <>
            <IconButton onClick={() => fetchOrganizations()} disabled={isLoading} aria-label="Refresh">
              <RefreshCcw className={cn('h-5 w-5', isLoading && 'animate-spin')} />
            </IconButton>
            <Can resource="organizations" action="create">
              <Button className="flex-1 sm:flex-none" onClick={openCreate} icon={<Plus className="h-4 w-4" />}>
                Tambah Organization
              </Button>
            </Can>
          </>
        }
      />

      <div className="toolbar">
        <SearchInput
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder="Cari organization, kode, email..."
        />
        <Badge tone="outline" className="px-3.5 py-2 text-xs">
          {filteredOrganizations.length} organization
        </Badge>
      </div>

      {error && <Alert tone="danger">{error}</Alert>}

      <TableWrap>
        <thead className="table-header">
          <tr>
            <Th>Organization</Th>
            <Th>Contact</Th>
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
          ) : filteredOrganizations.length === 0 ? (
            <tr>
              <td colSpan={4}>
                <EmptyState
                  icon={<Building2 className="h-6 w-6" />}
                  title="Belum ada organization"
                  description="Data dari API /organizations akan tampil di sini."
                />
              </td>
            </tr>
          ) : (
            filteredOrganizations.map(organization => (
              <tr key={organization.id} className="transition hover:bg-surface/60">
                <Td>
                  <p className="text-sm font-semibold text-ink-deep">{organization.name}</p>
                  <p className="mt-0.5 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-primary-blue">
                    {organization.code}
                  </p>
                  {organization.address && (
                    <p className="mt-1 max-w-xl text-xs text-stone">{organization.address}</p>
                  )}
                </Td>
                <Td>
                  <div className="space-y-1 text-sm text-stone">
                    {organization.email && (
                      <p className="flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5" />
                        {organization.email}
                      </p>
                    )}
                    {organization.phone && (
                      <p className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5" />
                        {organization.phone}
                      </p>
                    )}
                    {!organization.email && !organization.phone && '-'}
                  </div>
                </Td>
                <Td>
                  <Badge tone={organization.status === 'inactive' ? 'neutral' : 'success'} className="capitalize">
                    {organization.status || 'active'}
                  </Badge>
                </Td>
                <Td className="text-right">
                  <div className="inline-flex items-center gap-1">
                    <Can resource="organizations" action="update">
                      <RowAction onClick={() => openEdit(organization)} aria-label="Edit">
                        <Pencil className="h-4 w-4" />
                      </RowAction>
                    </Can>
                    <Can resource="organizations" action="delete">
                      <RowAction tone="danger" onClick={() => handleDelete(organization)} aria-label="Delete">
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
        eyebrow={editingOrganization ? 'Edit' : 'Baru'}
        title={editingOrganization ? 'Edit Organization' : 'Tambah Organization'}
        subtitle="Field mengikuti kontrak API /organizations."
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Batal
            </Button>
            <Button
              type="submit"
              form="organization-form"
              loading={isSaving}
              icon={!isSaving ? <Plus className="h-4 w-4" /> : undefined}
            >
              Simpan
            </Button>
          </>
        }
      >
        <form id="organization-form" onSubmit={handleSubmit} className="space-y-4">
          {(formError || error) && <Alert tone="danger">{formError || error}</Alert>}
          <Field label="Nama Organization" required>
            <Input value={form.name} onChange={event => patchForm({ name: event.target.value })} />
          </Field>
          <Field label="Kode" required>
            <Input value={form.code} onChange={event => patchForm({ code: event.target.value })} />
          </Field>
          <Field label="Alamat">
            <Textarea
              rows={3}
              value={form.address ?? ''}
              onChange={event => patchForm({ address: event.target.value })}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Email">
              <Input value={form.email ?? ''} onChange={event => patchForm({ email: event.target.value })} />
            </Field>
            <Field label="Telepon">
              <Input value={form.phone ?? ''} onChange={event => patchForm({ phone: event.target.value })} />
            </Field>
          </div>
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

export default OrganizationsPage;
