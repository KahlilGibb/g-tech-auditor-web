import React, { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Database,
  Layers3,
  ListChecks,
  Pencil,
  Plus,
  RefreshCcw,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react'
import { appSwal } from '../lib/appSwal'
import { getApiErrorMessage } from '../lib/apiResponse'
import { useMasterFieldStore, type MasterFieldInput, type MasterFieldOptionInput } from '../stores/masterFieldStore'
import type { FieldType, MasterField, MasterFieldOption } from '../types/template'
import { FIELD_TYPES, fieldTypeColor, fieldTypeLabel } from '../types/template'
import { cn } from '../utils/cn'
import { Can } from '../components/rbac/Can'
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
  StatCard,
  TableWrap,
  Td,
  Th,
} from '../components/ui'

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
      <PageHeader
        eyebrow="Konfigurasi"
        title={t('masterFields.title')}
        subtitle={t('masterFields.subtitle')}
        actions={
          <>
            <IconButton
              onClick={() => fetchMasterFields(true)}
              disabled={isLoading}
              aria-label={t('common.retry')}
            >
              <RefreshCcw className={cn('h-5 w-5', isLoading && 'animate-spin')} />
            </IconButton>
            <Can resource="templates" action="write">
              <Button className="flex-1 sm:flex-none" onClick={openCreate} icon={<Plus className="h-4 w-4" />}>
                {t('masterFields.actions.create')}
              </Button>
            </Can>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          icon={<Database className="h-5 w-5" />}
          value={masterFields.length}
          label={t('masterFields.stats.total')}
        />
        <StatCard
          icon={<Layers3 className="h-5 w-5" />}
          value={fieldTypesUsed}
          label={t('masterFields.stats.types')}
        />
        <StatCard
          icon={<ListChecks className="h-5 w-5" />}
          value={optionCount}
          label={t('masterFields.stats.options')}
        />
      </div>

      <div className="toolbar">
        <SearchInput
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder={t('masterFields.search')}
        />
        <Select
          className="w-full sm:w-56"
          value={selectedType}
          onChange={event => setSelectedType(event.target.value as FieldType | 'all')}
        >
          <option value="all">{t('masterFields.filters.allTypes')}</option>
          {FIELD_TYPES.map(type => (
            <option key={type.value} value={type.value}>
              {fieldTypeLabel(type.value)}
            </option>
          ))}
        </Select>
      </div>

      {error && <Alert tone="danger">{error}</Alert>}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <TableWrap>
          <thead className="table-header">
            <tr>
              <Th>{t('masterFields.table.field')}</Th>
              <Th>{t('masterFields.table.type')}</Th>
              <Th>{t('masterFields.table.options')}</Th>
              <Th className="text-right">{t('masterFields.table.actions')}</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline-soft">
            {isLoading ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-sm text-stone">
                  <Spinner className="mx-auto h-6 w-6 text-primary-blue" />
                </td>
              </tr>
            ) : filteredFields.length === 0 ? (
              <tr>
                <td colSpan={4}>
                  <EmptyState
                    icon={<Database className="h-6 w-6" />}
                    title={t('masterFields.empty.title')}
                    description={t('masterFields.empty.subtitle')}
                  />
                </td>
              </tr>
            ) : (
              filteredFields.map(field => (
                <tr
                  key={field.id}
                  className={cn(
                    'transition hover:bg-surface/60',
                    activeId === field.id && 'bg-primary-blue/[0.05]',
                  )}
                >
                  <Td>
                    <button className="text-left" onClick={() => handleLoadOptions(field)}>
                      <p className="text-sm font-semibold text-ink-deep">{field.name}</p>
                      <p className="mt-0.5 font-mono text-xs text-stone">{field.id}</p>
                    </button>
                  </Td>
                  <Td>
                    <span
                      className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold"
                      style={{
                        backgroundColor: `${fieldTypeColor(field.field_type)}18`,
                        color: fieldTypeColor(field.field_type),
                      }}
                    >
                      {fieldTypeLabel(field.field_type)}
                    </span>
                  </Td>
                  <Td className="text-sm text-stone">
                    {t('masterFields.table.optionCount', { count: field.options?.length ?? 0 })}
                  </Td>
                  <Td className="text-right">
                    <div className="inline-flex items-center gap-1">
                      <Can resource="templates" action="write">
                        <RowAction onClick={() => openEdit(field)} aria-label={t('common.edit')}>
                          <Pencil className="h-4 w-4" />
                        </RowAction>
                        <RowAction tone="danger" onClick={() => handleDeleteField(field)} aria-label={t('common.delete')}>
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

        <Card className="h-fit min-h-[420px] overflow-hidden">
          <CardHeader
            title={t('masterFields.options.title')}
            subtitle={selectedField ? selectedField.name : t('masterFields.options.emptyField')}
            icon={<SlidersHorizontal className="h-4 w-4" />}
          />

          {selectedField ? (
            <div className="space-y-4 p-5">
              <Can resource="templates" action="write">
                <form onSubmit={handleOptionSubmit} className="rounded-2xl border border-hairline-soft bg-surface p-3">
                  {optionError && (
                    <Alert tone="danger" className="mb-3">
                      {optionError}
                    </Alert>
                  )}
                  <div className="grid gap-3">
                    <Input
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
                      <Input
                        value={optionForm.value}
                        onChange={event => setOptionForm(prev => ({ ...prev, value: event.target.value }))}
                        placeholder={t('masterFields.options.valuePlaceholder')}
                      />
                      <Input
                        type="number"
                        value={optionForm.score_value}
                        onChange={event => setOptionForm(prev => ({ ...prev, score_value: Number(event.target.value) }))}
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div className="mt-3 flex justify-end gap-2">
                    {editingOption && (
                      <Button type="button" variant="secondary" onClick={resetOptionForm}>
                        {t('common.cancel')}
                      </Button>
                    )}
                    <Button
                      type="submit"
                      loading={isSaving}
                      icon={!isSaving ? <Plus className="h-4 w-4" /> : undefined}
                    >
                      {editingOption ? t('common.save') : t('masterFields.options.add')}
                    </Button>
                  </div>
                </form>
              </Can>

              <div className="space-y-2">
                {(selectedField.options ?? []).length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-hairline p-6 text-center">
                    <ListChecks className="mx-auto mb-3 h-8 w-8 text-stone/40" />
                    <p className="text-sm font-semibold text-ink-deep">{t('masterFields.options.empty.title')}</p>
                    <p className="mt-1 text-xs text-stone">{t('masterFields.options.empty.subtitle')}</p>
                  </div>
                ) : (
                  (selectedField.options ?? []).map(option => (
                    <div key={option.id} className="rounded-2xl border border-hairline-soft bg-card p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-ink-deep">{option.label}</p>
                          <p className="mt-0.5 font-mono text-xs text-stone">{option.value}</p>
                        </div>
                        <Badge tone="brand">{option.score_value}</Badge>
                      </div>
                      <div className="mt-3 flex justify-end gap-1">
                        <Can resource="templates" action="write">
                          <RowAction
                            onClick={() => {
                              setEditingOption(option)
                              setOptionForm(optionFormFrom(option))
                            }}
                            aria-label={t('common.edit')}
                          >
                            <Pencil className="h-4 w-4" />
                          </RowAction>
                          <RowAction
                            tone="danger"
                            onClick={() => handleDeleteOption(option)}
                            aria-label={t('common.delete')}
                          >
                            <Trash2 className="h-4 w-4" />
                          </RowAction>
                        </Can>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <EmptyState
              icon={<Database className="h-6 w-6" />}
              title={t('masterFields.options.selectField')}
              description={t('masterFields.options.selectFieldDesc')}
              className="h-[320px]"
            />
          )}
        </Card>
      </div>

      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        eyebrow={editingField ? 'Edit' : 'Baru'}
        title={editingField ? t('masterFields.modal.editTitle') : t('masterFields.modal.createTitle')}
        subtitle={t('masterFields.modal.description')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              form="master-field-form"
              loading={isSaving}
              icon={!isSaving ? <Plus className="h-4 w-4" /> : undefined}
            >
              {t('common.save')}
            </Button>
          </>
        }
      >
        <form id="master-field-form" onSubmit={handleFieldSubmit} className="space-y-4">
          {(fieldFormError || error) && <Alert tone="danger">{fieldFormError || error}</Alert>}
          <Field label={t('masterFields.modal.name')}>
            <Input
              value={fieldForm.name}
              onChange={event => setFieldForm(prev => ({ ...prev, name: event.target.value }))}
              placeholder={t('masterFields.modal.namePlaceholder')}
            />
          </Field>
          <Field label={t('masterFields.modal.type')}>
            <Select
              value={fieldForm.field_type}
              onChange={event => setFieldForm(prev => ({ ...prev, field_type: event.target.value as FieldType }))}
            >
              {FIELD_TYPES.map(type => (
                <option key={type.value} value={type.value}>
                  {fieldTypeLabel(type.value)}
                </option>
              ))}
            </Select>
          </Field>
        </form>
      </Modal>
    </div>
  )
}

export default MasterFieldsPage
