import React, { useMemo, useState } from 'react';
import { Loader2, MapPinned, Pencil, Plus, RefreshCcw, Search, Trash2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '../lib/apiResponse';
import { appSwal } from '../lib/appSwal';
import { useBranches } from '../hooks/useBranches';
import { useOrganizations } from '../hooks/useOrganizations';
import { useSites } from '../hooks/useSites';
import type { Site, SiteFormInput } from '../types/management';
import { cn } from '../utils/cn';

const EMPTY_FORM: SiteFormInput = {
  name: '',
  code: '',
  address: '',
  organizationId: '',
  branchId: '',
  status: 'active',
};

const SitesPage: React.FC = () => {
  const { t } = useTranslation();
  const { sites, isLoading, isSaving, error, refresh: fetchSites, createSite, updateSite, deleteSite } =
    useSites();
  const { organizations } = useOrganizations();
  const { branches } = useBranches();
  const [query, setQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<Site | null>(null);
  const [form, setForm] = useState<SiteFormInput>(EMPTY_FORM);
  const [formError, setFormError] = useState('');

  const filteredSites = useMemo(() => {
    const keyword = query.toLowerCase();
    return sites.filter(site => {
      const orgName = organizations.find(o => o.id === site.organizationId)?.name || site.organizationName || site.organizationId;
      const branchName = branches.find(b => b.id === site.branchId)?.name || site.branchName || site.branchId;

      return [
        site.name,
        site.code,
        site.address,
        orgName,
        branchName,
      ]
        .join(' ')
        .toLowerCase()
        .includes(keyword);
    });
  }, [sites, query, organizations, branches]);

  const patchForm = (patch: Partial<SiteFormInput>) => {
    setForm(prev => ({ ...prev, ...patch }));
  };

  const openCreate = () => {
    setEditingSite(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setIsModalOpen(true);
  };

  const openEdit = (site: Site) => {
    setEditingSite(site);
    setForm({
      name: site.name,
      code: site.code,
      address: site.address ?? '',
      organizationId: site.organizationId ?? '',
      branchId: site.branchId ?? '',
      status: site.status ?? 'active',
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError('');

    if (!form.name || !form.code) {
      const message = t('swal.validation.siteRequired');
      setFormError(message);
      await appSwal.errorIncomplete(message);
      return;
    }

    const confirmed = await appSwal.confirmSave();
    if (!confirmed) return;

    try {
      if (editingSite) {
        await updateSite(editingSite.id, form);
        await appSwal.successUpdated('site', form.name);
      } else {
        await createSite(form);
        await appSwal.successCreated('site', form.name);
      }
      setIsModalOpen(false);
    } catch (submitError) {
      const message = getApiErrorMessage(submitError);
      if (editingSite) await appSwal.errorUpdateFailed('site', message);
      else await appSwal.errorCreateFailed('site', message);
    }
  };

  const handleDelete = async (site: Site) => {
    const confirmed = await appSwal.confirmDelete(site.name, 'site');
    if (!confirmed) return;

    try {
      await deleteSite(site.id);
      await appSwal.successDeleted('site', site.name);
    } catch (deleteError) {
      await appSwal.errorDeleteFailed('site', getApiErrorMessage(deleteError));
    }
  };

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <h1 className="page-title">Sites</h1>
          <p className="page-subtitle">Kelola lokasi/site yang digunakan pada inspeksi dan dokumen.</p>
        </div>
        <div className="flex w-full items-center gap-3 sm:w-auto">
          <button className="icon-button" onClick={() => fetchSites()} disabled={isLoading}>
            <RefreshCcw className={cn('h-5 w-5', isLoading && 'animate-spin')} />
          </button>
          <button className="btn-primary flex-1 sm:flex-none" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Tambah Site
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
            placeholder="Cari site, branch, atau organization..."
          />
        </div>
        <div className="rounded-lg border border-divider bg-white px-3 py-2 text-sm text-muted-foreground shadow-sm">
          {filteredSites.length} site
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
                <th className="px-6 py-4">Site</th>
                <th className="px-6 py-4">Organization</th>
                <th className="px-6 py-4">Branch/Group</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-divider">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-sm text-muted-foreground">
                    Memuat site...
                  </td>
                </tr>
              ) : filteredSites.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-14 text-center">
                    <MapPinned className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
                    <p className="text-sm font-semibold text-foreground">Belum ada site</p>
                    <p className="mt-1 text-xs text-muted-foreground">Data dari API /sites akan tampil di sini.</p>
                  </td>
                </tr>
              ) : (
                filteredSites.map(site => (
                  <tr key={site.id} className="transition hover:bg-surface/60">
                    <td className="px-6 py-4">
                      <p className="text-sm font-semibold text-foreground">{site.name}</p>
                      <p className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-primary-blue">
                        {site.code}
                      </p>
                      {site.address && <p className="mt-1 max-w-xl text-xs text-muted-foreground">{site.address}</p>}
                    </td>
                    <td className="px-6 py-4 text-sm text-foreground">
                      {organizations.find(o => o.id === site.organizationId)?.name || site.organizationName || site.organizationId || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-foreground">
                      {branches.find(b => b.id === site.branchId)?.name || site.branchName || site.branchId || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span className="rounded-full bg-success-green/10 px-2.5 py-1 text-xs font-semibold capitalize text-success-green">
                        {site.status || 'active'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          className="rounded-lg p-2 text-muted-foreground transition hover:bg-surface hover:text-foreground"
                          onClick={() => openEdit(site)}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          className="rounded-lg p-2 text-muted-foreground transition hover:bg-danger-red/10 hover:text-danger-red"
                          onClick={() => handleDelete(site)}
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
                  {editingSite ? 'Edit Site' : 'Tambah Site'}
                </h2>
                <p className="text-xs text-muted-foreground">Field mengikuti kontrak API /sites.</p>
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
                <span className="text-xs font-semibold text-muted-foreground">Nama Site</span>
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
                  <span className="text-xs font-semibold text-muted-foreground">Organization</span>
                  <select
                    className="form-input"
                    value={form.organizationId ?? ''}
                    onChange={event => patchForm({ organizationId: event.target.value })}
                  >
                    <option value="">Pilih organization</option>
                    {organizations.map(organization => (
                      <option key={organization.id} value={organization.id}>
                        {organization.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-semibold text-muted-foreground">Branch/Group</span>
                  <select
                    className="form-input"
                    value={form.branchId ?? ''}
                    onChange={event => patchForm({ branchId: event.target.value })}
                  >
                    <option value="">Pilih branch</option>
                    {branches.map(branch => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
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

export default SitesPage;
