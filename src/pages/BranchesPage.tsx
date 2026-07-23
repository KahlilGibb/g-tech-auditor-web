import React, { useEffect, useMemo, useState } from 'react';
import { Building2, Loader2, Pencil, Plus, RefreshCcw, Trash2, UserPlus, Users, X } from 'lucide-react';
import { cn } from '../utils/cn';
import { useBranchStore } from '../stores/branchStore';
import { useUserStore } from '../stores/userStore';
import type { Branch, BranchFormInput } from '../types/management';
import { appSwal } from '../lib/appSwal';
import { getApiErrorMessage } from '../lib/apiResponse';
import { useTranslation } from 'react-i18next';
import { Can } from '../components/rbac/Can';
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
  Select,
  Spinner,
  TableWrap,
  Td,
  Textarea,
  Th,
} from '../components/ui';

const EMPTY_FORM: BranchFormInput = {
  name: '',
  code: '',
  address: '',
  status: 'active',
};

const BranchesPage: React.FC = () => {
  const { t } = useTranslation();
  const {
    branches,
    branchUsers,
    selectedBranchId,
    isLoading,
    isSaving,
    isLoadingUsers,
    error,
    fetchBranches,
    createBranch,
    updateBranch,
    deleteBranch,
    fetchBranchUsers,
    assignUserToBranch,
    removeUserFromBranch,
  } = useBranchStore();
  const { users, fetchUsers } = useUserStore();
  const [query, setQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [form, setForm] = useState<BranchFormInput>(EMPTY_FORM);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    fetchBranches();
    fetchUsers();
  }, [fetchBranches, fetchUsers]);

  const filteredBranches = useMemo(() => {
    const keyword = query.toLowerCase();
    return branches.filter(branch =>
      [branch.name, branch.code, branch.address].join(' ').toLowerCase().includes(keyword),
    );
  }, [branches, query]);

  const selectedBranch = useMemo(
    () => branches.find(branch => branch.id === selectedBranchId) ?? null,
    [branches, selectedBranchId],
  );

  const assignableUsers = useMemo(() => {
    const assignedIds = new Set(branchUsers.map(user => user.id));
    return users.filter(user => !assignedIds.has(user.id));
  }, [branchUsers, users]);

  const openCreate = () => {
    setEditingBranch(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setIsModalOpen(true);
  };

  const openEdit = (branch: Branch) => {
    setEditingBranch(branch);
    setForm({
      name: branch.name,
      code: branch.code,
      address: branch.address,
      status: branch.status ?? 'active',
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const patchForm = (patch: Partial<BranchFormInput>) => {
    setForm(prev => ({ ...prev, ...patch }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError('');
    if (!form.name || !form.code || !form.address) {
      const message = t('swal.validation.branchRequired');
      setFormError(message);
      await appSwal.errorIncomplete(message);
      return;
    }

    const confirmed = await appSwal.confirmSave();
    if (!confirmed) return;

    try {
      if (editingBranch) {
        await updateBranch(editingBranch.id, form);
        await appSwal.successUpdated('branch', form.name);
      } else {
        await createBranch(form);
        await appSwal.successCreated('branch', form.name);
      }
      setIsModalOpen(false);
    } catch (error) {
      const message = getApiErrorMessage(error);
      if (editingBranch) await appSwal.errorUpdateFailed('branch', message);
      else await appSwal.errorCreateFailed('branch', message);
    }
  };

  const handleDelete = async (branch: Branch) => {
    const confirmed = await appSwal.confirmDelete(branch.name, 'branch');
    if (!confirmed) return;

    try {
      await deleteBranch(branch.id);
      await appSwal.successDeleted('branch', branch.name);
    } catch (error) {
      await appSwal.errorDeleteFailed('branch', getApiErrorMessage(error));
    }
  };

  const handleAssign = async () => {
    if (!selectedBranchId || !selectedUserId) return;
    const user = users.find(item => item.id === selectedUserId);
    const confirmed = await appSwal.confirmSubmit();
    if (!confirmed) return;

    try {
      await assignUserToBranch(selectedBranchId, selectedUserId);
      setSelectedUserId('');
      await appSwal.successAssigned(user?.name ?? 'User');
    } catch (error) {
      await appSwal.errorAssignFailed(getApiErrorMessage(error));
    }
  };

  const handleRemoveBranchUser = async (userId: string, userName: string) => {
    if (!selectedBranchId) return;
    const confirmed = await appSwal.confirmRemoveBranchUser(userName);
    if (!confirmed) return;

    try {
      await removeUserFromBranch(selectedBranchId, userId);
      await appSwal.successRemoved(userName);
    } catch (error) {
      await appSwal.errorRemoveFailed(getApiErrorMessage(error));
    }
  };

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Organisasi"
        title="Branches"
        subtitle="Kelola cabang/dealer dan assignment user per branch."
        actions={
          <>
            <IconButton onClick={() => fetchBranches()} disabled={isLoading} aria-label="Refresh">
              <RefreshCcw className={cn('h-5 w-5', isLoading && 'animate-spin')} />
            </IconButton>
            <Can resource="branches" action="create">
              <Button className="flex-1 sm:flex-none" onClick={openCreate} icon={<Plus className="h-4 w-4" />}>
                Tambah Branch
              </Button>
            </Can>
          </>
        }
      />

      <div className="toolbar">
        <SearchInput
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder="Cari branch, kode, atau alamat..."
        />
        <Badge tone="outline" className="px-3.5 py-2 text-xs">
          {filteredBranches.length} branch
        </Badge>
      </div>

      {error && <Alert tone="danger">{error}</Alert>}

      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <TableWrap>
          <thead className="table-header">
            <tr>
              <Th>Branch</Th>
              <Th>Kode</Th>
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
            ) : filteredBranches.length === 0 ? (
              <tr>
                <td colSpan={4}>
                  <EmptyState
                    icon={<Building2 className="h-6 w-6" />}
                    title="Belum ada branch"
                    description="Data dari API /groups akan tampil di sini."
                  />
                </td>
              </tr>
            ) : (
              filteredBranches.map(branch => (
                <tr
                  key={branch.id}
                  className={cn(
                    'transition hover:bg-surface/60',
                    selectedBranchId === branch.id && 'bg-primary-blue/[0.05]',
                  )}
                >
                  <Td>
                    <p className="text-sm font-semibold text-ink-deep">{branch.name}</p>
                    <p className="mt-0.5 max-w-xl text-xs text-stone">{branch.address}</p>
                  </Td>
                  <Td>
                    <span className="font-mono text-[13px] font-medium text-charcoal">{branch.code}</span>
                  </Td>
                  <Td>
                    <Badge tone={branch.status === 'inactive' ? 'neutral' : 'success'} className="capitalize">
                      {branch.status || 'active'}
                    </Badge>
                  </Td>
                  <Td className="text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        className="rounded-full px-3 py-1.5 text-xs font-semibold text-primary-blue transition hover:bg-primary-blue/10"
                        onClick={() => fetchBranchUsers(branch.id)}
                      >
                        Users
                      </button>
                      <Can resource="branches" action="update">
                        <RowAction onClick={() => openEdit(branch)} aria-label="Edit">
                          <Pencil className="h-4 w-4" />
                        </RowAction>
                      </Can>
                      <Can resource="branches" action="delete">
                        <RowAction tone="danger" onClick={() => handleDelete(branch)} aria-label="Delete">
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

        <Card className="h-fit overflow-hidden">
          <CardHeader
            title="Branch Users"
            subtitle={selectedBranch ? selectedBranch.name : 'Pilih branch dari tabel'}
            icon={<Users className="h-4 w-4" />}
          />

          <div className="space-y-4 p-4">
            {selectedBranchId && (
              <Can resource="branches" action="update">
                <div className="flex gap-2">
                  <Select value={selectedUserId} onChange={event => setSelectedUserId(event.target.value)}>
                    <option value="">Pilih user</option>
                    {assignableUsers.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.name}
                      </option>
                    ))}
                  </Select>
                  <Button
                    className="!px-3"
                    onClick={handleAssign}
                    disabled={!selectedUserId || isSaving}
                    icon={isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                  />
                </div>
              </Can>
            )}

            {!selectedBranchId ? (
              <div className="rounded-2xl border border-dashed border-hairline p-6 text-center text-sm text-stone">
                Klik tombol Users pada salah satu branch.
              </div>
            ) : isLoadingUsers ? (
              <div className="py-10 text-center text-sm text-stone">
                <Spinner className="mx-auto h-5 w-5 text-primary-blue" />
              </div>
            ) : branchUsers.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-hairline p-6 text-center text-sm text-stone">
                Belum ada user pada branch ini.
              </div>
            ) : (
              <div className="space-y-2">
                {branchUsers.map(user => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-hairline-soft p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink-deep">{user.name}</p>
                      <p className="truncate text-xs text-stone">{user.email}</p>
                    </div>
                    <Can resource="branches" action="update">
                      <RowAction tone="danger" onClick={() => handleRemoveBranchUser(user.id, user.name)} aria-label="Remove">
                        <X className="h-4 w-4" />
                      </RowAction>
                    </Can>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>

      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        eyebrow={editingBranch ? 'Edit' : 'Baru'}
        title={editingBranch ? 'Edit Branch' : 'Tambah Branch'}
        subtitle="Field mengikuti kontrak API /groups."
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Batal
            </Button>
            <Button
              type="submit"
              form="branch-form"
              loading={isSaving}
              icon={!isSaving ? <Plus className="h-4 w-4" /> : undefined}
            >
              Simpan
            </Button>
          </>
        }
      >
        <form id="branch-form" onSubmit={handleSubmit} className="space-y-4">
          {(formError || error) && <Alert tone="danger">{formError || error}</Alert>}
          <Field label="Nama Branch" required>
            <Input value={form.name} onChange={event => patchForm({ name: event.target.value })} />
          </Field>
          <Field label="Kode" required>
            <Input value={form.code} onChange={event => patchForm({ code: event.target.value })} />
          </Field>
          <Field label="Alamat" required>
            <Textarea rows={3} value={form.address} onChange={event => patchForm({ address: event.target.value })} />
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

export default BranchesPage;
