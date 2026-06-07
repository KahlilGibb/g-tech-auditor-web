import React, { useEffect, useMemo, useState } from 'react';
import { Building2, Loader2, Mail, Pencil, Phone, Plus, RefreshCcw, Search, Trash2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '../lib/apiResponse';
import { appSwal } from '../lib/appSwal';
import { useOrganizationStore } from '../stores/organizationStore';
import type { Organization, OrganizationFormInput } from '../types/management';
import { cn } from '../utils/cn';

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
      <div className="page-header">
        <div>
          <h1 className="page-title">Organizations</h1>
          <p className="page-subtitle">Kelola data organisasi yang menjadi induk site dan branch.</p>
        </div>
        <div className="flex w-full items-center gap-3 sm:w-auto">
          <button className="icon-button" onClick={() => fetchOrganizations()} disabled={isLoading}>
            <RefreshCcw className={cn('h-5 w-5', isLoading && 'animate-spin')} />
          </button>
          <button className="btn-primary flex-1 sm:flex-none" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Tambah Organization
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
            placeholder="Cari organization, kode, email..."
          />
        </div>
        <div className="rounded-lg border border-divider bg-white px-3 py-2 text-sm text-muted-foreground shadow-sm">
          {filteredOrganizations.length} organization
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
                <th className="px-6 py-4">Organization</th>
                <th className="px-6 py-4">Contact</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-divider">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-sm text-muted-foreground">
                    Memuat organization...
                  </td>
                </tr>
              ) : filteredOrganizations.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-14 text-center">
                    <Building2 className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
                    <p className="text-sm font-semibold text-foreground">Belum ada organization</p>
                    <p className="mt-1 text-xs text-muted-foreground">Data dari API /organizations akan tampil di sini.</p>
                  </td>
                </tr>
              ) : (
                filteredOrganizations.map(organization => (
                  <tr key={organization.id} className="transition hover:bg-surface/60">
                    <td className="px-6 py-4">
                      <p className="text-sm font-semibold text-foreground">{organization.name}</p>
                      <p className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-primary-blue">
                        {organization.code}
                      </p>
                      {organization.address && (
                        <p className="mt-1 max-w-xl text-xs text-muted-foreground">{organization.address}</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1 text-sm text-muted-foreground">
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
                    </td>
                    <td className="px-6 py-4">
                      <span className="rounded-full bg-success-green/10 px-2.5 py-1 text-xs font-semibold capitalize text-success-green">
                        {organization.status || 'active'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          className="rounded-lg p-2 text-muted-foreground transition hover:bg-surface hover:text-foreground"
                          onClick={() => openEdit(organization)}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          className="rounded-lg p-2 text-muted-foreground transition hover:bg-danger-red/10 hover:text-danger-red"
                          onClick={() => handleDelete(organization)}
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
          <form onSubmit={handleSubmit} className="w-full max-w-lg rounded-lg border border-divider bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-divider px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  {editingOrganization ? 'Edit Organization' : 'Tambah Organization'}
                </h2>
                <p className="text-xs text-muted-foreground">Field mengikuti kontrak API /organizations.</p>
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
                <span className="text-xs font-semibold text-muted-foreground">Nama Organization</span>
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
                  value={form.address ?? ''}
                  onChange={event => patchForm({ address: event.target.value })}
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1.5">
                  <span className="text-xs font-semibold text-muted-foreground">Email</span>
                  <input className="form-input" value={form.email ?? ''} onChange={event => patchForm({ email: event.target.value })} />
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-semibold text-muted-foreground">Telepon</span>
                  <input className="form-input" value={form.phone ?? ''} onChange={event => patchForm({ phone: event.target.value })} />
                </label>
              </div>

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

export default OrganizationsPage;
