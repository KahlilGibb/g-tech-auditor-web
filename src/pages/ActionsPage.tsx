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
  Loader2,
  MapPin,
  Plus,
  RefreshCcw,
  Search,
  Settings2,
  Trash2,
  X,
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

const PriorityBadge: React.FC<{ priority: ActionPriority }> = ({ priority }) => {
  const colors = {
    High: 'bg-danger-red/10 text-danger-red border-danger-red/20',
    Medium: 'bg-warning-amber/10 text-warning-amber border-warning-amber/20',
    Low: 'bg-success-green/10 text-success-green border-success-green/20',
  };

  return (
    <span className={cn('rounded-full border px-2.5 py-1 text-xs font-bold', colors[priority])}>
      {priority}
    </span>
  );
};

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
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('actions.title')}</h1>
          <p className="page-subtitle">{t('actions.subtitle')}</p>
        </div>
        <div className="flex w-full items-center gap-3 sm:w-auto">
          <Can resource="actions" action="update">
            <button className="btn-secondary flex-1 sm:flex-none" onClick={() => setIsWorkflowModalOpen(true)}>
              <Settings2 className="h-4 w-4" />
              {t('actions.workflow.manage')}
            </button>
          </Can>
          <button className="icon-button" onClick={() => refresh(true)} disabled={isLoading}>
            <RefreshCcw className={cn('h-5 w-5', isLoading && 'animate-spin')} />
          </button>
          <Can resource="actions" action="create">
            <button className="btn-primary flex-1 sm:flex-none" onClick={openCreateAction}>
              <Plus className="h-4 w-4" />
              {t('actions.create')}
            </button>
          </Can>
        </div>
      </div>

      <div className="toolbar">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            type="text"
            placeholder={t('actions.search')}
            className="form-input pl-9"
          />
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <select className="form-input sm:w-48" value={statusFilter} onChange={event => setStatusFilter(event.target.value)}>
            <option value="all">{t('actions.filterAll')}</option>
            {workflowStatuses.map(status => (
              <option key={status.id} value={status.id}>{status.label}</option>
            ))}
          </select>
          <select
            className="form-input sm:w-44"
            value={priorityFilter}
            onChange={event => setPriorityFilter(event.target.value as ActionPriority | 'all')}
          >
            <option value="all">{t('actions.filters.allPriorities')}</option>
            {PRIORITIES.map(priority => (
              <option key={priority} value={priority}>{t(`actions.priority.${priority.toLowerCase()}`)}</option>
            ))}
          </select>
          <button className="btn-secondary">
            <Filter className="h-4 w-4" />
            {filteredActions.length}
          </button>
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
            <thead className="table-header border-b border-divider">
              <tr>
                <th className="px-6 py-4">{t('actions.table.details')}</th>
                <th className="px-6 py-4">{t('actions.table.source')}</th>
                <th className="px-6 py-4">{t('actions.table.assignee')}</th>
                <th className="px-6 py-4">{t('actions.table.status')}</th>
                <th className="px-6 py-4">{t('actions.table.priority')}</th>
                <th className="px-6 py-4">{t('actions.table.dueDate')}</th>
                <th className="px-6 py-4 text-right">{t('actions.table.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-divider">
              {isLoading && actions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-sm text-muted-foreground">
                    {t('common.loading')}
                  </td>
                </tr>
              ) : filteredActions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-14 text-center">
                    <CheckSquare className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
                    <p className="text-sm font-semibold text-foreground">{t('actions.empty')}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{t('actions.emptyDetail')}</p>
                  </td>
                </tr>
              ) : (
                filteredActions.map(action => {
                  const status = statusById[action.workflowStatusId];
                  const StatusIcon = statusIcon(action.workflowStatusId);
                  return (
                    <tr key={action.id} className="transition hover:bg-surface/50">
                      <td className="px-6 py-4">
                        <div className="flex items-start gap-3">
                          <div className="rounded-lg bg-secondary p-2">
                            <CheckSquare className="h-5 w-5 text-primary-blue" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold leading-tight text-foreground">{action.title}</p>
                            <p className="mt-1 font-mono text-xs text-muted-foreground">#{action.code}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <p className="flex items-center gap-1.5 text-sm text-foreground">
                            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                            {action.source}
                          </p>
                          {action.site && (
                            <p className="ml-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              {action.site}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-divider bg-secondary text-[10px] font-bold text-primary-blue">
                            {action.assignee.charAt(0)}
                          </div>
                          <span className="text-sm text-foreground">{action.assignee}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg"
                            style={{
                              backgroundColor: `${status?.color ?? '#6B7280'}18`,
                              color: status?.color ?? '#6B7280',
                            }}
                          >
                            <StatusIcon className="h-4 w-4" />
                          </span>
                          <select
                            className="form-input min-w-36 py-2"
                            value={action.workflowStatusId}
                            disabled={!can('actions', 'update')}
                            onChange={event => void handleStatusChange(action, event.target.value)}
                          >
                            {workflowStatuses.map(item => (
                              <option key={item.id} value={item.id}>{item.label}</option>
                            ))}
                          </select>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <PriorityBadge priority={action.priority} />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          {new Date(action.dueDate).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <Can resource="actions" action="update">
                            <button
                              className="rounded-lg p-2 text-muted-foreground transition hover:bg-surface hover:text-foreground"
                              onClick={() => openEditAction(action)}
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                          </Can>
                          <Can resource="actions" action="delete">
                            <button
                              className="rounded-lg p-2 text-muted-foreground transition hover:bg-danger-red/10 hover:text-danger-red"
                              onClick={() => handleDeleteAction(action)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </Can>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isActionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <form onSubmit={handleActionSubmit} className="w-full max-w-2xl rounded-lg border border-divider bg-card shadow-xl">
            <div className="flex items-center justify-between border-b border-divider px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  {editingAction ? t('actions.modal.editTitle') : t('actions.modal.createTitle')}
                </h2>
                <p className="text-xs text-muted-foreground">{t('actions.modal.description')}</p>
              </div>
              <button type="button" onClick={() => setIsActionModalOpen(false)} className="rounded-lg p-2 hover:bg-surface">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-4 p-5 sm:grid-cols-2">
              {(actionFormError || error) && (
                <div className="rounded-lg border border-danger-red/20 bg-danger-red/10 p-3 text-sm text-danger-red sm:col-span-2">
                  {actionFormError || error}
                </div>
              )}

              <label className="space-y-1.5 sm:col-span-2">
                <span className="text-xs font-semibold text-muted-foreground">{t('actions.fields.title')}</span>
                <input
                  className="form-input"
                  value={actionForm.title}
                  onChange={event => setActionForm(prev => ({ ...prev, title: event.target.value }))}
                  placeholder={t('actions.form.titlePlaceholder')}
                />
              </label>

              <label className="space-y-1.5 sm:col-span-2">
                <span className="text-xs font-semibold text-muted-foreground">{t('actions.detail.details')}</span>
                <textarea
                  className="form-input min-h-24 resize-y"
                  value={actionForm.description}
                  onChange={event => setActionForm(prev => ({ ...prev, description: event.target.value }))}
                  placeholder={t('actions.detail.addDetails')}
                />
              </label>

              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-muted-foreground">{t('actions.fields.status')}</span>
                <select
                  className="form-input"
                  value={actionForm.workflowStatusId}
                  onChange={event => setActionForm(prev => ({ ...prev, workflowStatusId: event.target.value }))}
                >
                  <option value="">{t('actions.status.select')}</option>
                  {workflowStatuses.map(status => (
                    <option key={status.id} value={status.id}>{status.label}</option>
                  ))}
                </select>
              </label>

              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-muted-foreground">{t('actions.fields.priority')}</span>
                <select
                  className="form-input"
                  value={actionForm.priority}
                  onChange={event => setActionForm(prev => ({ ...prev, priority: event.target.value as ActionPriority }))}
                >
                  {PRIORITIES.map(priority => (
                    <option key={priority} value={priority}>{t(`actions.priority.${priority.toLowerCase()}`)}</option>
                  ))}
                </select>
              </label>

              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-muted-foreground">{t('actions.fields.dueDate')}</span>
                <input
                  className="form-input"
                  type="datetime-local"
                  value={actionForm.dueDate}
                  onChange={event => setActionForm(prev => ({ ...prev, dueDate: event.target.value }))}
                />
              </label>

              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-muted-foreground">{t('actions.fields.assignee')}</span>
                <select
                  className="form-input"
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
                </select>
              </label>

              <label className="space-y-1.5 sm:col-span-2">
                <span className="text-xs font-semibold text-muted-foreground">{t('actions.fields.source')}</span>
                <input
                  className="form-input"
                  value={actionForm.source}
                  onChange={event => setActionForm(prev => ({ ...prev, source: event.target.value }))}
                  placeholder={t('actions.fields.sourcePlaceholder')}
                />
              </label>
            </div>

            <div className="flex justify-end gap-3 border-t border-divider px-5 py-4">
              <button type="button" className="btn-secondary" onClick={() => setIsActionModalOpen(false)}>
                {t('common.cancel')}
              </button>
              <button type="submit" className="btn-primary" disabled={isSaving}>
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {t('common.save')}
              </button>
            </div>
          </form>
        </div>
      )}

      {isWorkflowModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-3xl rounded-lg border border-divider bg-card shadow-xl">
            <div className="flex items-center justify-between border-b border-divider px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-foreground">{t('actions.workflow.manage')}</h2>
                <p className="text-xs text-muted-foreground">{t('actions.workflow.description')}</p>
              </div>
              <button type="button" onClick={() => setIsWorkflowModalOpen(false)} className="rounded-lg p-2 hover:bg-surface">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_300px]">
              <div className="space-y-2">
                {workflowStatuses.map(status => (
                  <div key={status.id} className="flex items-center justify-between rounded-lg border border-divider p-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: status.color }} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">{status.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {status.id} {status.isDefault ? `- ${t('actions.status.default')}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        className="rounded-lg p-2 text-muted-foreground transition hover:bg-surface hover:text-foreground"
                        onClick={() => openEditStatus(status.id)}
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        className="rounded-lg p-2 text-muted-foreground transition hover:bg-danger-red/10 hover:text-danger-red"
                        onClick={() => handleDeleteStatus(status.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <form onSubmit={handleStatusSubmit} className="rounded-lg border border-divider bg-surface p-4">
                <h3 className="text-sm font-semibold text-foreground">
                  {editingStatusId ? t('actions.status.edit') : t('actions.status.create')}
                </h3>
                {statusFormError && (
                  <div className="mt-3 rounded-lg border border-danger-red/20 bg-danger-red/10 p-3 text-sm text-danger-red">
                    {statusFormError}
                  </div>
                )}
                <div className="mt-4 space-y-3">
                  <input
                    className="form-input"
                    value={statusForm.name}
                    onChange={event => setStatusForm(prev => ({ ...prev, name: event.target.value }))}
                    placeholder={t('actions.workflow.addStatus')}
                  />
                  <div className="grid grid-cols-[1fr_96px] gap-3">
                    <input
                      className="form-input"
                      type="color"
                      value={statusForm.color}
                      onChange={event => setStatusForm(prev => ({ ...prev, color: event.target.value }))}
                    />
                    <input
                      className="form-input"
                      type="number"
                      value={statusForm.order}
                      onChange={event => setStatusForm(prev => ({ ...prev, order: Number(event.target.value) }))}
                    />
                  </div>
                  <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <input
                      type="checkbox"
                      checked={Boolean(statusForm.isDefault)}
                      onChange={event => setStatusForm(prev => ({ ...prev, isDefault: event.target.checked }))}
                    />
                    {t('actions.status.default')}
                  </label>
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  {editingStatusId && (
                    <button type="button" className="btn-secondary" onClick={openCreateStatus}>
                      {t('common.cancel')}
                    </button>
                  )}
                  <button type="submit" className="btn-primary" disabled={isSaving}>
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    {t('common.save')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActionsPage;
