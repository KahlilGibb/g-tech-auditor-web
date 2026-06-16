import React, { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Database,
  Edit3,
  Layers3,
  ListChecks,
  Loader2,
  Plus,
  RefreshCcw,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide-react'
import { appSwal } from '../lib/appSwal'
import { getApiErrorMessage } from '../lib/apiResponse'
import { useMasterFieldStore, type MasterFieldInput, type MasterFieldOptionInput } from '../stores/masterFieldStore'
import type { FieldType, MasterField, MasterFieldOption } from '../types/template'
import { FIELD_TYPES, fieldTypeColor, fieldTypeLabel } from '../types/template'
import { cn } from '../utils/cn'

const EMPTY_FIELD_FORM: MasterFieldInput = {
  name: '',
  field_type: 'text_answer',
  configuration: {},
}

const EMPTY_OPTION_FORM: MasterFieldOptionInput = {
  label: '',
  value: '',
  score_value: 0,
}

function optionFormFrom(option: MasterFieldOption): MasterFieldOptionInput {
  return {
    label: option.label,
    value: option.value,
    score_value: option.score_value,
  }
}

const MasterFieldsPage: React.FC = () => {
  const { t } = useTranslation()
  const {
    masterFields,
    isLoading,
    isSaving,
    error,
    fetchMasterFields,
    createMasterField,
    updateMasterField,
    deleteMasterField,
    fetchOptions,
    createOption,
    updateOption,
    deleteOption,
  } = useMasterFieldStore()

  const [query, setQuery] = useState('')
  const [selectedType, setSelectedType] = useState<FieldType | 'all'>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingField, setEditingField] = useState<MasterField | null>(null)
  const [fieldForm, setFieldForm] = useState<MasterFieldInput>(EMPTY_FIELD_FORM)
  const [fieldFormError, setFieldFormError] = useState('')
  const [editingOption, setEditingOption] = useState<MasterFieldOption | null>(null)
  const [optionForm, setOptionForm] = useState<MasterFieldOptionInput>(EMPTY_OPTION_FORM)
  const [optionError, setOptionError] = useState('')

  useEffect(() => {
    fetchMasterFields()
  }, [fetchMasterFields])

  const activeId = selectedId ?? masterFields[0]?.id ?? null

  const selectedField = useMemo(
    () => masterFields.find(field => field.id === activeId) ?? null,
    [masterFields, activeId],
  )

  const filteredFields = useMemo(() => {
    const keyword = query.toLowerCase()
    return masterFields.filter(field => {
      const matchesKeyword = [field.name, field.field_type]
        .join(' ')
        .toLowerCase()
        .includes(keyword)
      const matchesType = selectedType === 'all' || field.field_type === selectedType
      return matchesKeyword && matchesType
    })
  }, [masterFields, query, selectedType])

  const fieldTypesUsed = useMemo(
    () => new Set(masterFields.map(field => field.field_type)).size,
    [masterFields],
  )

  const optionCount = useMemo(
    () => masterFields.reduce((total, field) => total + (field.options?.length ?? 0), 0),
    [masterFields],
  )

  const openCreate = () => {
    setEditingField(null)
    setFieldForm(EMPTY_FIELD_FORM)
    setFieldFormError('')
    setIsModalOpen(true)
  }

  const openEdit = (field: MasterField) => {
    setEditingField(field)
    setFieldForm({
      name: field.name,
      field_type: field.field_type,
      configuration: field.configuration,
    })
    setFieldFormError('')
    setIsModalOpen(true)
  }

  const handleFieldSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setFieldFormError('')

    if (!fieldForm.name.trim()) {
      const message = t('swal.validation.masterFieldRequired')
      setFieldFormError(message)
      await appSwal.errorIncomplete(message)
      return
    }

    const confirmed = await appSwal.confirmSave()
    if (!confirmed) return

    try {
      if (editingField) {
        const updated = await updateMasterField(editingField.id, fieldForm)
        setSelectedId(updated.id)
        await appSwal.successUpdated('masterField', updated.name)
      } else {
        const created = await createMasterField(fieldForm)
        setSelectedId(created.id)
        await appSwal.successCreated('masterField', created.name)
      }
      setIsModalOpen(false)
    } catch (submitError) {
      const message = getApiErrorMessage(submitError)
      if (editingField) {
        await appSwal.errorUpdateFailed('masterField', message)
      } else {
        await appSwal.errorCreateFailed('masterField', message)
      }
    }
  }

  const handleDeleteField = async (field: MasterField) => {
    const confirmed = await appSwal.confirmDelete(field.name, 'masterField')
    if (!confirmed) return

    try {
      await deleteMasterField(field.id)
      if (selectedId === field.id) setSelectedId(null)
      await appSwal.successDeleted('masterField', field.name)
    } catch (deleteError) {
      await appSwal.errorDeleteFailed('masterField', getApiErrorMessage(deleteError))
    }
  }

  const resetOptionForm = () => {
    setEditingOption(null)
    setOptionForm(EMPTY_OPTION_FORM)
    setOptionError('')
  }

  const handleLoadOptions = async (field: MasterField) => {
    setSelectedId(field.id)
    try {
      await fetchOptions(field.id)
    } catch (loadError) {
      await appSwal.error({
        title: t('masterFields.options.loadFailed'),
        text: getApiErrorMessage(loadError),
      })
    }
  }

  const handleOptionSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setOptionError('')

    if (!selectedField || !optionForm.label.trim()) {
      const message = t('swal.validation.masterFieldOptionRequired')
      setOptionError(message)
      await appSwal.errorIncomplete(message)
      return
    }

    const confirmed = await appSwal.confirmSave()
    if (!confirmed) return

    const payload = {
      ...optionForm,
      value: optionForm.value || optionForm.label.toLowerCase().replace(/\s+/g, '_'),
    }

    try {
      if (editingOption) {
        await updateOption(selectedField.id, editingOption.id, payload)
        await appSwal.successUpdated('masterFieldOption', payload.label)
      } else {
        await createOption(selectedField.id, payload)
        await appSwal.successCreated('masterFieldOption', payload.label)
      }
      resetOptionForm()
    } catch (submitError) {
      const message = getApiErrorMessage(submitError)
      if (editingOption) {
        await appSwal.errorUpdateFailed('masterFieldOption', message)
      } else {
        await appSwal.errorCreateFailed('masterFieldOption', message)
      }
    }
  }

  const handleDeleteOption = async (option: MasterFieldOption) => {
    if (!selectedField) return
    const confirmed = await appSwal.confirmDelete(option.label, 'masterFieldOption')
    if (!confirmed) return

    try {
      await deleteOption(selectedField.id, option.id)
      await appSwal.successDeleted('masterFieldOption', option.label)
    } catch (deleteError) {
      await appSwal.errorDeleteFailed('masterFieldOption', getApiErrorMessage(deleteError))
    }
  }

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('masterFields.title')}</h1>
          <p className="page-subtitle">{t('masterFields.subtitle')}</p>
        </div>
        <div className="flex w-full items-center gap-3 sm:w-auto">
          <button
            className="icon-button"
            onClick={() => fetchMasterFields(true)}
            disabled={isLoading}
            aria-label={t('common.retry')}
          >
            <RefreshCcw className={cn('h-5 w-5', isLoading && 'animate-spin')} />
          </button>
          <button className="btn-primary flex-1 sm:flex-none" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            {t('masterFields.actions.create')}
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="panel p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-muted-foreground">{t('masterFields.stats.total')}</p>
            <Database className="h-5 w-5 text-primary-blue" />
          </div>
          <p className="mt-3 text-3xl font-semibold text-foreground">{masterFields.length}</p>
        </div>
        <div className="panel p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-muted-foreground">{t('masterFields.stats.types')}</p>
            <Layers3 className="h-5 w-5 text-primary-blue" />
          </div>
          <p className="mt-3 text-3xl font-semibold text-foreground">{fieldTypesUsed}</p>
        </div>
        <div className="panel p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-muted-foreground">{t('masterFields.stats.options')}</p>
            <ListChecks className="h-5 w-5 text-primary-blue" />
          </div>
          <p className="mt-3 text-3xl font-semibold text-foreground">{optionCount}</p>
        </div>
      </div>

      <div className="toolbar">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            className="form-input pl-9"
            placeholder={t('masterFields.search')}
          />
        </div>
        <select
          className="form-input w-full sm:w-56"
          value={selectedType}
          onChange={event => setSelectedType(event.target.value as FieldType | 'all')}
        >
          <option value="all">{t('masterFields.filters.allTypes')}</option>
          {FIELD_TYPES.map(type => (
            <option key={type.value} value={type.value}>
              {fieldTypeLabel(type.value)}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="rounded-lg border border-danger-red/20 bg-danger-red/10 p-4 text-sm font-medium text-danger-red">
          {error}
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="table-header">
                <tr>
                  <th className="px-6 py-4">{t('masterFields.table.field')}</th>
                  <th className="px-6 py-4">{t('masterFields.table.type')}</th>
                  <th className="px-6 py-4">{t('masterFields.table.options')}</th>
                  <th className="px-6 py-4 text-right">{t('masterFields.table.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider">
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-sm text-muted-foreground">
                      {t('masterFields.loading')}
                    </td>
                  </tr>
                ) : filteredFields.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-14 text-center">
                      <Database className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
                      <p className="text-sm font-semibold text-foreground">{t('masterFields.empty.title')}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{t('masterFields.empty.subtitle')}</p>
                    </td>
                  </tr>
                ) : (
                  filteredFields.map(field => (
                    <tr
                      key={field.id}
                      className={cn(
                        'transition hover:bg-surface/60',
                        activeId === field.id && 'bg-primary-blue/[0.04]',
                      )}
                    >
                      <td className="px-6 py-4">
                        <button
                          className="text-left"
                          onClick={() => handleLoadOptions(field)}
                        >
                          <p className="text-sm font-semibold text-foreground">{field.name}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{field.id}</p>
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className="rounded-full px-2.5 py-1 text-xs font-semibold"
                          style={{
                            backgroundColor: `${fieldTypeColor(field.field_type)}18`,
                            color: fieldTypeColor(field.field_type),
                          }}
                        >
                          {fieldTypeLabel(field.field_type)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {t('masterFields.table.optionCount', { count: field.options?.length ?? 0 })}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-1">
                          <button
                            className="rounded-lg p-2 text-muted-foreground transition hover:bg-surface hover:text-foreground"
                            onClick={() => openEdit(field)}
                            aria-label={t('common.edit')}
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            className="rounded-lg p-2 text-muted-foreground transition hover:bg-danger-red/10 hover:text-danger-red"
                            onClick={() => handleDeleteField(field)}
                            aria-label={t('common.delete')}
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

        <aside className="panel min-h-[420px] overflow-hidden">
          <div className="panel-header">
            <div>
              <h2 className="text-sm font-semibold text-foreground">{t('masterFields.options.title')}</h2>
              <p className="text-xs text-muted-foreground">
                {selectedField ? selectedField.name : t('masterFields.options.emptyField')}
              </p>
            </div>
            <SlidersHorizontal className="h-5 w-5 text-primary-blue" />
          </div>

          {selectedField ? (
            <div className="space-y-4 p-5">
              <form onSubmit={handleOptionSubmit} className="rounded-lg border border-divider bg-surface p-3">
                {optionError && (
                  <div className="mb-3 rounded-lg border border-danger-red/20 bg-danger-red/10 p-3 text-sm text-danger-red">
                    {optionError}
                  </div>
                )}
                <div className="grid gap-3">
                  <input
                    className="form-input"
                    value={optionForm.label}
                    onChange={event => {
                      const label = event.target.value
                      setOptionForm(prev => ({
                        ...prev,
                        label,
                        value: editingOption ? prev.value : label.toLowerCase().replace(/\s+/g, '_'),
                      }))
                    }}
                    placeholder={t('masterFields.options.labelPlaceholder')}
                  />
                  <div className="grid grid-cols-[minmax(0,1fr)_96px] gap-3">
                    <input
                      className="form-input"
                      value={optionForm.value}
                      onChange={event => setOptionForm(prev => ({ ...prev, value: event.target.value }))}
                      placeholder={t('masterFields.options.valuePlaceholder')}
                    />
                    <input
                      className="form-input"
                      type="number"
                      value={optionForm.score_value}
                      onChange={event => setOptionForm(prev => ({ ...prev, score_value: Number(event.target.value) }))}
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="mt-3 flex justify-end gap-2">
                  {editingOption && (
                    <button type="button" className="btn-secondary" onClick={resetOptionForm}>
                      {t('common.cancel')}
                    </button>
                  )}
                  <button type="submit" className="btn-primary" disabled={isSaving}>
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    {editingOption ? t('common.save') : t('masterFields.options.add')}
                  </button>
                </div>
              </form>

              <div className="space-y-2">
                {(selectedField.options ?? []).length === 0 ? (
                  <div className="rounded-lg border border-dashed border-divider p-6 text-center">
                    <ListChecks className="mx-auto mb-3 h-8 w-8 text-muted-foreground/30" />
                    <p className="text-sm font-semibold text-foreground">{t('masterFields.options.empty.title')}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{t('masterFields.options.empty.subtitle')}</p>
                  </div>
                ) : (
                  (selectedField.options ?? []).map(option => (
                    <div key={option.id} className="rounded-lg border border-divider bg-white p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">{option.label}</p>
                          <p className="mt-1 font-mono text-xs text-muted-foreground">{option.value}</p>
                        </div>
                        <span className="rounded-full bg-primary-blue/10 px-2 py-1 text-xs font-semibold text-primary-blue">
                          {option.score_value}
                        </span>
                      </div>
                      <div className="mt-3 flex justify-end gap-1">
                        <button
                          className="rounded-lg p-2 text-muted-foreground transition hover:bg-surface hover:text-foreground"
                          onClick={() => {
                            setEditingOption(option)
                            setOptionForm(optionFormFrom(option))
                          }}
                          aria-label={t('common.edit')}
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          className="rounded-lg p-2 text-muted-foreground transition hover:bg-danger-red/10 hover:text-danger-red"
                          onClick={() => handleDeleteOption(option)}
                          aria-label={t('common.delete')}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="flex h-[320px] flex-col items-center justify-center p-6 text-center">
              <Database className="mb-3 h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm font-semibold text-foreground">{t('masterFields.options.selectField')}</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{t('masterFields.options.selectFieldDesc')}</p>
            </div>
          )}
        </aside>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <form onSubmit={handleFieldSubmit} className="w-full max-w-lg rounded-lg border border-divider bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-divider px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  {editingField ? t('masterFields.modal.editTitle') : t('masterFields.modal.createTitle')}
                </h2>
                <p className="text-xs text-muted-foreground">{t('masterFields.modal.description')}</p>
              </div>
              <button type="button" onClick={() => setIsModalOpen(false)} className="rounded-lg p-2 hover:bg-surface">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 p-5">
              {(fieldFormError || error) && (
                <div className="rounded-lg border border-danger-red/20 bg-danger-red/10 p-3 text-sm text-danger-red">
                  {fieldFormError || error}
                </div>
              )}

              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-muted-foreground">{t('masterFields.modal.name')}</span>
                <input
                  className="form-input"
                  value={fieldForm.name}
                  onChange={event => setFieldForm(prev => ({ ...prev, name: event.target.value }))}
                  placeholder={t('masterFields.modal.namePlaceholder')}
                />
              </label>

              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-muted-foreground">{t('masterFields.modal.type')}</span>
                <select
                  className="form-input"
                  value={fieldForm.field_type}
                  onChange={event => setFieldForm(prev => ({ ...prev, field_type: event.target.value as FieldType }))}
                >
                  {FIELD_TYPES.map(type => (
                    <option key={type.value} value={type.value}>
                      {fieldTypeLabel(type.value)}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="flex justify-end gap-3 border-t border-divider px-5 py-4">
              <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>
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
    </div>
  )
}

export default MasterFieldsPage
