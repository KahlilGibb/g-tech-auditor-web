import React, { useMemo, useState } from 'react';
import { MapPinned, Pencil, Plus, RefreshCcw, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '../lib/apiResponse';
import { appSwal } from '../lib/appSwal';
import { useBranches } from '../hooks/useBranches';
import { useOrganizations } from '../hooks/useOrganizations';
import { useSites } from '../hooks/useSites';
import type { Site, SiteFormInput } from '../types/management';
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
      <PageHeader
        eyebrow="Organisasi"
        title="Sites"
        subtitle="Kelola lokasi/site yang digunakan pada inspeksi dan dokumen."
        actions={
          <>
            <IconButton onClick={() => fetchSites()} disabled={isLoading} aria-label="Refresh">
              <RefreshCcw className={cn('h-5 w-5', isLoading && 'animate-spin')} />
            </IconButton>
            <Can resource="sites" action="create">
              <Button className="flex-1 sm:flex-none" onClick={openCreate} icon={<Plus className="h-4 w-4" />}>
                Tambah Site
              </Button>
            </Can>
          </>
        }
      />

      <div className="toolbar">
        <SearchInput
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder="Cari site, branch, atau organization..."
        />
        <Badge tone="outline" className="px-3.5 py-2 text-xs">
          {filteredSites.length} site
        </Badge>
      </div>

      {error && <Alert tone="danger">{error}</Alert>}

      <TableWrap>
        <thead className="table-header">
          <tr>
            <Th>Site</Th>
            <Th>Organization</Th>
            <Th>Branch/Group</Th>
            <Th>Status</Th>
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
          ) : filteredSites.length === 0 ? (
            <tr>
              <td colSpan={5}>
                <EmptyState
                  icon={<MapPinned className="h-6 w-6" />}
                  title="Belum ada site"
                  description="Data dari API /sites akan tampil di sini."
                />
              </td>
            </tr>
          ) : (
            filteredSites.map(site => (
              <tr key={site.id} className="transition hover:bg-surface/60">
                <Td>
                  <p className="text-sm font-semibold text-ink-deep">{site.name}</p>
                  <p className="mt-0.5 font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-primary-blue">
                    {site.code}
                  </p>
                  {site.address && <p className="mt-1 max-w-xl text-xs text-stone">{site.address}</p>}
                </Td>
                <Td className="text-sm text-charcoal">
                  {organizations.find(o => o.id === site.organizationId)?.name || site.organizationName || site.organizationId || '-'}
                </Td>
                <Td className="text-sm text-charcoal">
                  {branches.find(b => b.id === site.branchId)?.name || site.branchName || site.branchId || '-'}
                </Td>
                <Td>
                  <Badge tone={site.status === 'inactive' ? 'neutral' : 'success'} className="capitalize">
                    {site.status || 'active'}
                  </Badge>
                </Td>
                <Td className="text-right">
                  <div className="inline-flex items-center gap-1">
                    <Can resource="sites" action="update">
                      <RowAction onClick={() => openEdit(site)} aria-label="Edit">
                        <Pencil className="h-4 w-4" />
                      </RowAction>
                    </Can>
                    <Can resource="sites" action="delete">
                      <RowAction tone="danger" onClick={() => handleDelete(site)} aria-label="Delete">
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
        eyebrow={editingSite ? 'Edit' : 'Baru'}
        title={editingSite ? 'Edit Site' : 'Tambah Site'}
        subtitle="Field mengikuti kontrak API /sites."
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Batal
            </Button>
            <Button
              type="submit"
              form="site-form"
              loading={isSaving}
              icon={!isSaving ? <Plus className="h-4 w-4" /> : undefined}
            >
              Simpan
            </Button>
          </>
        }
      >
        <form id="site-form" onSubmit={handleSubmit} className="space-y-4">
          {(formError || error) && <Alert tone="danger">{formError || error}</Alert>}

          <Field label="Nama Site" required>
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
            <Field label="Organization">
              <Select
                value={form.organizationId ?? ''}
                onChange={event => patchForm({ organizationId: event.target.value })}
              >
                <option value="">Pilih organization</option>
                {organizations.map(organization => (
                  <option key={organization.id} value={organization.id}>
                    {organization.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Branch/Group">
              <Select
                value={form.branchId ?? ''}
                onChange={event => patchForm({ branchId: event.target.value })}
              >
                <option value="">Pilih branch</option>
                {branches.map(branch => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </Select>
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

export default SitesPage;
