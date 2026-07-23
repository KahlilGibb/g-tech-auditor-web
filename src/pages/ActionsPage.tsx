import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  CheckSquare,
  Clock,
  Edit3,
  FileText,
  Filter,
  MapPin,
  Plus,
  RefreshCcw,
  Settings2,
  Trash2,
  XCircle,
} from 'lucide-react';
import { useActions } from '../hooks/useActions';
import { useUserStore } from '../stores/userStore';
import { appSwal } from '../lib/appSwal';
import { getApiErrorMessage } from '../lib/apiResponse';
import { cn } from '../utils/cn';
import type { ActionItem, ActionPriority, ActionStatusFormInput, CreateActionPayload } from '../types/action';
import { Can } from '../components/rbac/Can';
import { useRbac } from '../hooks/useRbac';
import {
  Alert,
  Avatar,
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
  Toggle,
} from '../components/ui';

const PRIORITIES: ActionPriority[] = ['High', 'Medium', 'Low'];

const EMPTY_ACTION_FORM: CreateActionPayload = {
  title: '',
  description: '',
  workflowStatusId: '',
  priority: 'Medium',
  dueDate: '',
  assigneeIds: [],
  source: '',
};

const EMPTY_STATUS_FORM: ActionStatusFormInput = {
  name: '',
  order: 1,
  isDefault: false,
  color: '#6B7280',
};

function statusIcon(statusId: string) {
  if (statusId === 'in_progress') return Clock;
  if (statusId === 'completed') return CheckCircle2;
  if (statusId === 'cancelled' || statusId === 'canceled') return XCircle;
  return AlertCircle;
}

function dateInputValue(date?: string) {
  if (!date) return '';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString().slice(0, 16);
}

function isoFromInput(value?: string) {
  return value ? new Date(value).toISOString() : undefined;
}

const PRIORITY_TONE: Record<ActionPriority, 'danger' | 'warning' | 'success'> = {
  High: 'danger',
  Medium: 'warning',
  Low: 'success',
};

const PriorityBadge: React.FC<{ priority: ActionPriority }> = ({ priority }) => (
  <Badge tone={PRIORITY_TONE[priority]}>{priority}</Badge>
);

const ActionsPage: React.FC = () => {
  const { t } = useTranslation();
  const { can } = useRbac();
  const {
    actions,
    workflowStatuses,
    isLoading,
    isSaving,
    error,
    refresh,
    createAction,
    updateAction,
    deleteAction,
    updateStatus,
    createWorkflowStatus,
    updateWorkflowStatus,
    deleteWorkflowStatus,
  } = useActions();
  const { users, fetchUsers } = useUserStore();

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState<ActionPriority | 'all'>('all');
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [editingAction, setEditingAction] = useState<ActionItem | null>(null);
  const [actionForm, setActionForm] = useState<CreateActionPayload>(EMPTY_ACTION_FORM);
  const [actionFormError, setActionFormError] = useState('');
  const [isWorkflowModalOpen, setIsWorkflowModalOpen] = useState(false);
  const [editingStatusId, setEditingStatusId] = useState<string | null>(null);
  const [statusForm, setStatusForm] = useState<ActionStatusFormInput>(EMPTY_STATUS_FORM);
  const [statusFormError, setStatusFormError] = useState('');

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const defaultStatusId = workflowStatuses.find(status => status.isDefault)?.id || workflowStatuses[0]?.id || '';

  const filteredActions = useMemo(() => {
    const keyword = query.toLowerCase();
    return actions.filter(action => {
      const matchesKeyword = [action.title, action.code, action.assignee, action.source, action.site]
        .join(' ')
        .toLowerCase()
        .includes(keyword);
      const matchesStatus = statusFilter === 'all' || action.workflowStatusId === statusFilter;
      const matchesPriority = priorityFilter === 'all' || action.priority === priorityFilter;
      return matchesKeyword && matchesStatus && matchesPriority;
    });
  }, [actions, priorityFilter, query, statusFilter]);

  const statusById = useMemo(
    () => Object.fromEntries(workflowStatuses.map(status => [status.id, status])),
    [workflowStatuses],
  );

  const openCreateAction = () => {
    setEditingAction(null);
    setActionForm({ ...EMPTY_ACTION_FORM, workflowStatusId: defaultStatusId });
    setActionFormError('');
    setIsActionModalOpen(true);
  };

  const openEditAction = (action: ActionItem) => {
    setEditingAction(action);
    setActionForm({
      title: action.title,
      description: action.description ?? action.contentItems[0] ?? '',
      workflowStatusId: action.workflowStatusId,
      priority: action.priority,
      dueDate: dateInputValue(action.dueDate),
      assigneeIds: action.assigneeIds ?? [],
      source: action.source === '-' ? '' : action.source,
      site: action.site,
      asset: action.asset,
    });
    setActionFormError('');
    setIsActionModalOpen(true);
  };

  const handleActionSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setActionFormError('');

    if (!actionForm.title.trim() || !actionForm.workflowStatusId) {
      const message = t('actions.validation.required');
      setActionFormError(message);
      await appSwal.errorIncomplete(message);
      return;
    }

    const confirmed = await appSwal.confirmSave();
    if (!confirmed) return;

    const payload = {
      ...actionForm,
      dueDate: isoFromInput(actionForm.dueDate),
    };

    try {
      if (editingAction) {
        await updateAction(editingAction.id, payload);
        await appSwal.successUpdated('action', payload.title);
      } else {
        await createAction(payload);
        await appSwal.successCreated('action', payload.title);
      }
      setIsActionModalOpen(false);
    } catch (submitError) {
      const message = getApiErrorMessage(submitError);
      if (editingAction) await appSwal.errorUpdateFailed('action', message);
      else await appSwal.errorCreateFailed('action', message);
    }
  };

  const handleDeleteAction = async (action: ActionItem) => {
    const confirmed = await appSwal.confirmDelete(action.title, 'action');
    if (!confirmed) return;

    try {
      await deleteAction(action.id);
      await appSwal.successDeleted('action', action.title);
    } catch (deleteError) {
      await appSwal.errorDeleteFailed('action', getApiErrorMessage(deleteError));
    }
  };

  const handleStatusChange = async (action: ActionItem, statusId: string) => {
    if (statusId === action.workflowStatusId) return;
    const status = statusById[statusId];
    const confirmed = await appSwal.confirm({
      title: t('actions.status.confirmChange.title'),
      text: t('actions.status.confirmChange.text', {
        action: action.title,
        status: status?.label ?? statusId,
      }),
      confirmText: t('swal.buttons.yes'),
      cancelText: t('swal.buttons.no'),
    });
    if (!confirmed) return;

    try {
      await updateStatus(action.id, statusId);
      await appSwal.successSaved('action');
    } catch (statusError) {
      await appSwal.errorUpdateFailed('action', getApiErrorMessage(statusError));
    }
  };

  const openCreateStatus = () => {
    setEditingStatusId(null);
    setStatusForm({ ...EMPTY_STATUS_FORM, order: workflowStatuses.length + 1 });
    setStatusFormError('');
  };

  const openEditStatus = (statusId: string) => {
    const status = statusById[statusId];
    if (!status) return;
    setEditingStatusId(status.id);
    setStatusForm({
      name: status.label,
      order: status.order ?? workflowStatuses.findIndex(item => item.id === status.id) + 1,
      isDefault: status.isDefault,
      color: status.color,
    });
    setStatusFormError('');
  };

  const handleStatusSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatusFormError('');

    if (!statusForm.name.trim()) {
      const message = t('actions.status.validation.required');
      setStatusFormError(message);
      await appSwal.errorIncomplete(message);
      return;
    }

    const confirmed = await appSwal.confirmSave();
    if (!confirmed) return;

    try {
      if (editingStatusId) {
        await updateWorkflowStatus(editingStatusId, statusForm);
        await appSwal.successUpdated('actionStatus', statusForm.name);
      } else {
        await createWorkflowStatus(statusForm);
        await appSwal.successCreated('actionStatus', statusForm.name);
      }
      openCreateStatus();
    } catch (submitError) {
      const message = getApiErrorMessage(submitError);
      if (editingStatusId) await appSwal.errorUpdateFailed('actionStatus', message);
      else await appSwal.errorCreateFailed('actionStatus', message);
    }
  };

  const handleDeleteStatus = async (statusId: string) => {
    const status = statusById[statusId];
    if (!status) return;
    const confirmed = await appSwal.confirmDelete(status.label, 'actionStatus');
    if (!confirmed) return;

    try {
      await deleteWorkflowStatus(status.id);
      await appSwal.successDeleted('actionStatus', status.label);
    } catch (deleteError) {
      await appSwal.errorDeleteFailed('actionStatus', getApiErrorMessage(deleteError));
    }
  };

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="CAPA"
        title={t('actions.title')}
        subtitle={t('actions.subtitle')}
        actions={
          <>
            <Can resource="actions" action="update">
              <Button
                variant="secondary"
                className="flex-1 sm:flex-none"
                onClick={() => setIsWorkflowModalOpen(true)}
                icon={<Settings2 className="h-4 w-4" />}
              >
                {t('actions.workflow.manage')}
              </Button>
            </Can>
            <IconButton onClick={() => refresh(true)} disabled={isLoading} aria-label="Refresh">
              <RefreshCcw className={cn('h-5 w-5', isLoading && 'animate-spin')} />
            </IconButton>
            <Can resource="actions" action="create">
              <Button className="flex-1 sm:flex-none" onClick={openCreateAction} icon={<Plus className="h-4 w-4" />}>
                {t('actions.create')}
              </Button>
            </Can>
          </>
        }
      />

      <div className="toolbar">
        <SearchInput
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder={t('actions.search')}
        />
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
          <Select className="sm:w-48" value={statusFilter} onChange={event => setStatusFilter(event.target.value)}>
            <option value="all">{t('actions.filterAll')}</option>
            {workflowStatuses.map(status => (
              <option key={status.id} value={status.id}>{status.label}</option>
            ))}
          </Select>
          <Select
            className="sm:w-44"
            value={priorityFilter}
            onChange={event => setPriorityFilter(event.target.value as ActionPriority | 'all')}
          >
            <option value="all">{t('actions.filters.allPriorities')}</option>
            {PRIORITIES.map(priority => (
              <option key={priority} value={priority}>{t(`actions.priority.${priority.toLowerCase()}`)}</option>
            ))}
          </Select>
          <Badge tone="outline" className="gap-1.5 px-3.5 py-2 text-xs">
            <Filter className="h-3.5 w-3.5" />
            {filteredActions.length}
          </Badge>
        </div>
      </div>

      {error && <Alert tone="danger">{error}</Alert>}

      <TableWrap>
        <thead className="table-header">
          <tr>
            <Th>{t('actions.table.details')}</Th>
            <Th>{t('actions.table.source')}</Th>
            <Th>{t('actions.table.assignee')}</Th>
            <Th>{t('actions.table.status')}</Th>
            <Th>{t('actions.table.priority')}</Th>
            <Th>{t('actions.table.dueDate')}</Th>
            <Th className="text-right">{t('actions.table.actions')}</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-hairline-soft">
          {isLoading && actions.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-6 py-12 text-center text-sm text-stone">
                <Spinner className="mx-auto h-6 w-6 text-primary-blue" />
              </td>
            </tr>
          ) : filteredActions.length === 0 ? (
            <tr>
              <td colSpan={7}>
                <EmptyState
                  icon={<CheckSquare className="h-6 w-6" />}
                  title={t('actions.empty')}
                  description={t('actions.emptyDetail')}
                />
              </td>
            </tr>
          ) : (
            filteredActions.map(action => {
              const status = statusById[action.workflowStatusId];
              const StatusIcon = statusIcon(action.workflowStatusId);
              return (
                <tr key={action.id} className="transition hover:bg-surface/60">
                  <Td>
                    <div className="flex items-start gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface text-primary-blue">
                        <CheckSquare className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold leading-tight text-ink-deep">{action.title}</p>
                        <p className="mt-1 font-mono text-xs text-stone">#{action.code}</p>
                      </div>
                    </div>
                  </Td>
                  <Td>
                    <div className="flex flex-col gap-1">
                      <p className="flex items-center gap-1.5 text-sm text-charcoal">
                        <FileText className="h-3.5 w-3.5 text-stone" />
                        {action.source}
                      </p>
                      {action.site && (
                        <p className="ml-0.5 flex items-center gap-1.5 text-xs text-stone">
                          <MapPin className="h-3 w-3" />
                          {action.site}
                        </p>
                      )}
                    </div>
                  </Td>
                  <Td>
                    <div className="flex items-center gap-2">
                      <Avatar name={action.assignee} size={32} />
                      <span className="text-sm text-charcoal">{action.assignee}</span>
                    </div>
                  </Td>
                  <Td>
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full"
                        style={{
                          backgroundColor: `${status?.color ?? '#6B7280'}18`,
                          color: status?.color ?? '#6B7280',
                        }}
                      >
                        <StatusIcon className="h-4 w-4" />
                      </span>
                      <Select
                        className="min-w-36 py-2"
                        value={action.workflowStatusId}
                        disabled={!can('actions', 'update')}
                        onChange={event => void handleStatusChange(action, event.target.value)}
                      >
                        {workflowStatuses.map(item => (
                          <option key={item.id} value={item.id}>{item.label}</option>
                        ))}
                      </Select>
                    </div>
                  </Td>
                  <Td>
                    <PriorityBadge priority={action.priority} />
                  </Td>
                  <Td>
                    <div className="flex items-center gap-1.5 text-sm font-medium text-stone">
                      <Calendar className="h-4 w-4" />
                      {new Date(action.dueDate).toLocaleDateString()}
                    </div>
                  </Td>
                  <Td className="text-right">
                    <div className="inline-flex items-center gap-1">
                      <Can resource="actions" action="update">
                        <RowAction onClick={() => openEditAction(action)} aria-label="Edit">
                          <Edit3 className="h-4 w-4" />
                        </RowAction>
                      </Can>
                      <Can resource="actions" action="delete">
                        <RowAction tone="danger" onClick={() => handleDeleteAction(action)} aria-label="Delete">
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

      <Modal
        open={isActionModalOpen}
        onClose={() => setIsActionModalOpen(false)}
        size="lg"
        eyebrow={editingAction ? t('actions.modal.editTitle') : t('actions.modal.createTitle')}
        title={editingAction ? t('actions.modal.editTitle') : t('actions.modal.createTitle')}
        subtitle={t('actions.modal.description')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsActionModalOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              form="action-form"
              loading={isSaving}
              icon={!isSaving ? <Plus className="h-4 w-4" /> : undefined}
            >
              {t('common.save')}
            </Button>
          </>
        }
      >
        <form id="action-form" onSubmit={handleActionSubmit} className="grid gap-4 sm:grid-cols-2">
          {(actionFormError || error) && (
            <div className="sm:col-span-2">
              <Alert tone="danger">{actionFormError || error}</Alert>
            </div>
          )}

          <Field label={t('actions.fields.title')} className="sm:col-span-2">
            <Input
              value={actionForm.title}
              onChange={event => setActionForm(prev => ({ ...prev, title: event.target.value }))}
              placeholder={t('actions.form.titlePlaceholder')}
            />
          </Field>

          <Field label={t('actions.detail.details')} className="sm:col-span-2">
            <Textarea
              className="min-h-24 resize-y"
              value={actionForm.description}
              onChange={event => setActionForm(prev => ({ ...prev, description: event.target.value }))}
              placeholder={t('actions.detail.addDetails')}
            />
          </Field>

          <Field label={t('actions.fields.status')}>
            <Select
              value={actionForm.workflowStatusId}
              onChange={event => setActionForm(prev => ({ ...prev, workflowStatusId: event.target.value }))}
            >
              <option value="">{t('actions.status.select')}</option>
              {workflowStatuses.map(status => (
                <option key={status.id} value={status.id}>{status.label}</option>
              ))}
            </Select>
          </Field>

          <Field label={t('actions.fields.priority')}>
            <Select
              value={actionForm.priority}
              onChange={event => setActionForm(prev => ({ ...prev, priority: event.target.value as ActionPriority }))}
            >
              {PRIORITIES.map(priority => (
                <option key={priority} value={priority}>{t(`actions.priority.${priority.toLowerCase()}`)}</option>
              ))}
            </Select>
          </Field>

          <Field label={t('actions.fields.dueDate')}>
            <Input
              type="datetime-local"
              value={actionForm.dueDate}
              onChange={event => setActionForm(prev => ({ ...prev, dueDate: event.target.value }))}
            />
          </Field>

          <Field label={t('actions.fields.assignee')}>
            <Select
              value={actionForm.assigneeIds?.[0] ?? ''}
              onChange={event => setActionForm(prev => ({
                ...prev,
                assigneeIds: event.target.value ? [event.target.value] : [],
              }))}
            >
              <option value="">{t('actions.assignee.none')}</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>{user.name}</option>
              ))}
            </Select>
          </Field>

          <Field label={t('actions.fields.source')} className="sm:col-span-2">
            <Input
              value={actionForm.source}
              onChange={event => setActionForm(prev => ({ ...prev, source: event.target.value }))}
              placeholder={t('actions.fields.sourcePlaceholder')}
            />
          </Field>
        </form>
      </Modal>

      <Modal
        open={isWorkflowModalOpen}
        onClose={() => setIsWorkflowModalOpen(false)}
        size="xl"
        eyebrow="Workflow"
        title={t('actions.workflow.manage')}
        subtitle={t('actions.workflow.description')}
      >
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="space-y-2">
            {workflowStatuses.map(status => (
              <div
                key={status.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-hairline-soft p-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: status.color }} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink-deep">{status.label}</p>
                    <p className="text-xs text-stone">
                      {status.id} {status.isDefault ? `- ${t('actions.status.default')}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <RowAction onClick={() => openEditStatus(status.id)} aria-label="Edit">
                    <Edit3 className="h-4 w-4" />
                  </RowAction>
                  <RowAction tone="danger" onClick={() => handleDeleteStatus(status.id)} aria-label="Delete">
                    <Trash2 className="h-4 w-4" />
                  </RowAction>
                </div>
              </div>
            ))}
          </div>

          <Card className="h-fit overflow-hidden">
            <CardHeader title={editingStatusId ? t('actions.status.edit') : t('actions.status.create')} />
            <form onSubmit={handleStatusSubmit} className="space-y-3 p-4">
              {statusFormError && <Alert tone="danger">{statusFormError}</Alert>}
              <Input
                value={statusForm.name}
                onChange={event => setStatusForm(prev => ({ ...prev, name: event.target.value }))}
                placeholder={t('actions.workflow.addStatus')}
              />
              <div className="grid grid-cols-[1fr_96px] gap-3">
                <Input
                  type="color"
                  value={statusForm.color}
                  onChange={event => setStatusForm(prev => ({ ...prev, color: event.target.value }))}
                />
                <Input
                  type="number"
                  value={statusForm.order}
                  onChange={event => setStatusForm(prev => ({ ...prev, order: Number(event.target.value) }))}
                />
              </div>
              <label className="flex items-center gap-2 text-sm font-medium text-charcoal">
                <Toggle
                  checked={Boolean(statusForm.isDefault)}
                  onChange={value => setStatusForm(prev => ({ ...prev, isDefault: value }))}
                />
                {t('actions.status.default')}
              </label>
              <div className="flex justify-end gap-2 pt-1">
                {editingStatusId && (
                  <Button type="button" variant="secondary" onClick={openCreateStatus}>
                    {t('common.cancel')}
                  </Button>
                )}
                <Button
                  type="submit"
                  loading={isSaving}
                  icon={!isSaving ? <Plus className="h-4 w-4" /> : undefined}
                >
                  {t('common.save')}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </Modal>
    </div>
  );
};

export default ActionsPage;
