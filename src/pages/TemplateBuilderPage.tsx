import React, { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Copy,
  ChevronDown,
  MoreVertical,
  ChevronUp,
  Loader2,
  LayoutList,
  Send,
} from 'lucide-react'
import { cn } from '../utils/cn'
import { useTemplateEditorStore } from '../stores/templateEditorStore'
import type { FieldType, TemplateField, TemplateSection } from '../types/template'
import { fieldTypeColor, fieldTypeLabel } from '../types/template'
import FieldTypePicker from '../components/builder/FieldTypePicker'
import FieldOptionsEditor from '../components/builder/FieldOptionsEditor'
import { appSwal } from '../lib/appSwal'
import { getApiErrorMessage } from '../lib/apiResponse'
import { Alert, Badge, Button, Eyebrow, IconButton, Toggle } from '../components/ui'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hexAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

const HAS_OPTIONS: FieldType[] = ['dropdown', 'checkbox', 'pass_fail', 'multiple_choice']

// ─── FieldRow ─────────────────────────────────────────────────────────────────

interface FieldRowProps {
  field: TemplateField
  index: number
  total: number
  onUpdate: (patch: Partial<TemplateField>) => void
  onDelete: () => void | Promise<void>
  onMoveUp: () => void
  onMoveDown: () => void
  onOpenPicker: () => void
}

const FieldRow: React.FC<FieldRowProps> = ({
  field,
  index,
  total,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
  onOpenPicker,
}) => {
  const color = fieldTypeColor(field.type)
  const label = fieldTypeLabel(field.type)
  const showOptions = HAS_OPTIONS.includes(field.type)

  return (
    <div className="group overflow-hidden rounded-2xl border border-hairline-soft bg-card transition-all hover:border-hairline hover:shadow-soft-sm animate-slide-in-down">
      {/* Main card row */}
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        {/* Index & Reorder tools */}
        <div className="flex shrink-0 items-center gap-2">
          <span className="w-6 rounded-lg border border-hairline-soft bg-surface py-0.5 text-center text-xs font-bold tabular-nums text-stone">
            {index + 1}
          </span>
          <div className="flex gap-0.5 sm:flex-col">
            <button
              type="button"
              onClick={onMoveUp}
              disabled={index === 0}
              className="rounded-lg p-1 text-slate transition-all hover:bg-surface hover:text-ink-deep disabled:opacity-20"
            >
              <ChevronUp className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={onMoveDown}
              disabled={index === total - 1}
              className="rounded-lg p-1 text-slate transition-all hover:bg-surface hover:text-ink-deep disabled:opacity-20"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Question Label Input */}
        <div className="min-w-0 flex-1">
          <input
            type="text"
            value={field.label}
            onChange={(e) => onUpdate({ label: e.target.value })}
            placeholder="Tulis Pertanyaan Anda..."
            className="w-full border-none bg-transparent py-1 text-sm font-semibold text-ink-deep placeholder:text-stone/50 focus:outline-none"
          />
        </div>

        {/* Right Area: Type, Required Switch, Delete */}
        <div className="flex shrink-0 items-center justify-between gap-4 border-t border-hairline-soft pt-2 sm:justify-end sm:border-t-0 sm:pt-0">
          {/* Picker Toggle */}
          <button
            type="button"
            onClick={onOpenPicker}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 text-[11px] font-semibold transition-all hover:brightness-95 active:scale-95"
            style={{
              borderColor: hexAlpha(color, 0.35),
              backgroundColor: hexAlpha(color, 0.06),
              color,
            }}
          >
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
            {label}
          </button>

          {/* Required Switch */}
          <label className="flex shrink-0 cursor-pointer select-none items-center gap-2">
            <Toggle
              checked={field.required}
              onChange={() => onUpdate({ required: !field.required })}
              label="Wajib"
            />
            <span className="text-[11px] font-semibold text-stone">Wajib</span>
          </label>

          {/* Delete Button */}
          <IconButton tone="danger" onClick={onDelete} aria-label="Hapus" className="h-9 w-9 shrink-0 border-transparent bg-transparent">
            <Trash2 className="h-4 w-4" />
          </IconButton>
        </div>
      </div>

      {/* Embedded Options Editor */}
      {showOptions && (
        <div className="border-t border-hairline-soft bg-surface/40 px-4 pb-4">
          <FieldOptionsEditor
            fieldId={field.id}
            options={field.options ?? []}
            onChange={(opts) => onUpdate({ options: opts })}
          />
        </div>
      )}
    </div>
  )
}

// ─── SectionCard ──────────────────────────────────────────────────────────────

interface SectionCardProps {
  section: TemplateSection
  sectionFields: TemplateField[]
  isExpanded: boolean
  isTitlePage: boolean
  index: number
  total: number
  onToggle: () => void
  onUpdateSection: (patch: Partial<TemplateSection>) => void
  onDuplicate: () => void
  onDelete: () => void | Promise<void>
  onMoveUp: () => void
  onMoveDown: () => void
  onAddField: (type: FieldType) => void
  onAddFieldFromMaster: (masterFieldId: string) => void
  onUpdateField: (fieldId: string, patch: Partial<TemplateField>) => void
  onDeleteField: (fieldId: string) => void | Promise<void>
  onMoveFieldUp: (fieldIndex: number) => void
  onMoveFieldDown: (fieldIndex: number) => void
}

const SectionCard: React.FC<SectionCardProps> = ({
  section,
  sectionFields,
  isExpanded,
  isTitlePage,
  index,
  total,
  onToggle,
  onUpdateSection,
  onDuplicate,
  onDelete,
  onMoveUp,
  onMoveDown,
  onAddField,
  onAddFieldFromMaster,
  onUpdateField,
  onDeleteField,
  onMoveFieldUp,
  onMoveFieldDown,
}) => {
  const { t } = useTranslation()
  const [showMenu, setShowMenu] = useState(false)
  const [pickerOpenFor, setPickerOpenFor] = useState<string | null>(null)
  const { masterFields } = useTemplateEditorStore()

  const activeField = sectionFields.find((f) => f.id === pickerOpenFor)

  return (
    <>
      <div id={`section-${section.id}`} className="panel overflow-hidden animate-fade-in-scale">
        {/* Section Header */}
        <div
          className={cn(
            'flex cursor-pointer select-none items-center justify-between gap-3 px-4 py-3.5 transition-colors duration-150',
            isExpanded ? 'border-b border-hairline-soft bg-primary-blue/[0.03]' : 'hover:bg-surface/50',
          )}
          onClick={onToggle}
        >
          <div className="flex min-w-0 flex-1 items-center gap-3">
            {/* Number Index */}
            <div className={cn(
              'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
              isExpanded ? 'bg-ink-deep text-white shadow-soft-sm' : 'bg-surface text-stone',
            )}>
              {index + 1}
            </div>

            {/* Editable Title */}
            <input
              type="text"
              value={section.title}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => onUpdateSection({ title: e.target.value })}
              placeholder={t('builder.sectionTitlePlaceholder')}
              className="w-full truncate border-none bg-transparent py-0.5 text-sm font-semibold text-ink-deep placeholder:text-stone/40 focus:outline-none"
            />
          </div>

          <div className="flex shrink-0 items-center gap-2" onClick={(e) => e.stopPropagation()}>
            {/* Indicators */}
            <Badge tone="neutral">{sectionFields.length} Pertanyaan</Badge>

            {/* Reorder up/down */}
            <div className="flex items-center overflow-hidden rounded-full border border-hairline-soft bg-card">
              <button
                type="button"
                onClick={onMoveUp}
                disabled={index === 0}
                className="p-1.5 text-slate transition-all hover:bg-surface hover:text-ink-deep disabled:opacity-20"
              >
                <ChevronUp className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={onMoveDown}
                disabled={index === total - 1}
                className="border-l border-hairline-soft p-1.5 text-slate transition-all hover:bg-surface hover:text-ink-deep disabled:opacity-20"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>

            {/* Menu options */}
            {!isTitlePage && (
              <div className="relative">
                <IconButton
                  onClick={() => setShowMenu(!showMenu)}
                  aria-label="Opsi bab"
                  className="h-9 w-9"
                >
                  <MoreVertical className="h-4 w-4" />
                </IconButton>
                {showMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-20"
                      onClick={() => setShowMenu(false)}
                    />
                    <div className="absolute right-0 top-11 z-30 w-40 overflow-hidden rounded-2xl border border-hairline-soft bg-card shadow-soft-lg animate-fade-in-scale">
                      <button
                        type="button"
                        onClick={() => { onDuplicate(); setShowMenu(false) }}
                        className="flex w-full items-center gap-2 px-3 py-2.5 text-xs font-semibold text-ink-deep transition-colors hover:bg-surface"
                      >
                        <Copy className="h-4 w-4 text-stone" />
                        Duplikat Bab
                      </button>
                      <button
                        type="button"
                        onClick={() => { onDelete(); setShowMenu(false) }}
                        className="flex w-full items-center gap-2 border-t border-hairline-soft px-3 py-2.5 text-xs font-semibold text-danger-red transition-colors hover:bg-danger-red/8"
                      >
                        <Trash2 className="h-4 w-4" />
                        Hapus Bab
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Section Body */}
        {isExpanded && (
          <div className="space-y-4 bg-surface/20 p-5">
            {/* Keterangan bab */}
            <input
              type="text"
              value={section.description || ''}
              onChange={(e) => onUpdateSection({ description: e.target.value })}
              placeholder="Tulis Keterangan tambahan atau petunjuk pengerjaan bab (opsional)..."
              className="form-input text-xs"
            />

            {/* Questions Container */}
            {sectionFields.length > 0 && (
              <div className="space-y-3">
                {sectionFields.map((field, fi) => (
                  <FieldRow
                    key={field.id}
                    field={field}
                    index={fi}
                    total={sectionFields.length}
                    onUpdate={(patch) => onUpdateField(field.id, patch)}
                    onDelete={async () => {
                      const confirmed = await appSwal.confirmDelete(field.label || 'Pertanyaan', 'question')
                      if (!confirmed) return

                      try {
                        await onDeleteField(field.id)
                        await appSwal.successDeleted('question', field.label || 'Pertanyaan')
                      } catch (deleteError) {
                        await appSwal.errorDeleteFailed('question', getApiErrorMessage(deleteError))
                      }
                    }}
                    onMoveUp={() => onMoveFieldUp(fi)}
                    onMoveDown={() => onMoveFieldDown(fi)}
                    onOpenPicker={() => setPickerOpenFor(field.id)}
                  />
                ))}
              </div>
            )}

            {/* Redesigned Quick-Add Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline-soft pt-4">
              <div className="flex flex-wrap items-center gap-2">
                <Eyebrow className="mr-1">+ Tambah Cepat</Eyebrow>
                {[
                  { type: 'text_answer', label: 'Teks Bebas', color: '#F59E0B' },
                  { type: 'pass_fail', label: 'Pass / Fail', color: '#10B981' },
                  { type: 'photo', label: 'Bukti Foto', color: '#14B8A6' },
                  { type: 'number', label: 'Input Angka', color: '#3B82F6' },
                ].map((btn) => (
                  <Button
                    key={btn.type}
                    variant="subtle"
                    size="sm"
                    onClick={() => onAddField(btn.type as FieldType)}
                  >
                    {btn.label}
                  </Button>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<Plus className="h-4 w-4" />}
                  onClick={() => onAddField('text_answer')}
                  className="text-primary-blue hover:text-primary-blue-dark"
                >
                  Pilihan Tipe Lainnya...
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Field Type Picker */}
      <FieldTypePicker
        isOpen={pickerOpenFor !== null}
        currentType={activeField?.type ?? ''}
        masterFields={masterFields}
        onClose={() => setPickerOpenFor(null)}
        onSelect={(type) => {
          if (pickerOpenFor) onUpdateField(pickerOpenFor, { type })
          setPickerOpenFor(null)
        }}
        onSelectMaster={(masterFieldId) => {
          onAddFieldFromMaster(masterFieldId)
          setPickerOpenFor(null)
        }}
      />
    </>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export const TemplateBuilderPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()

  const {
    template,
    sections,
    fields,
    isLoading,
    isSaving,
    isDirty,
    error,
    loadTemplate,
    initCreateTemplate,
    updateTemplateInfo,
    saveTemplate,
    publishTemplate,
    addSection,
    updateSection,
    deleteSection,
    duplicateSection,
    toggleSection,
    expandedSections,
    reorderSections,
    addField,
    addFieldFromMaster,
    updateField,
    deleteField,
    reorderFields,
    loadMasterFields,
    resetEditor,
  } = useTemplateEditorStore()

  useEffect(() => {
    loadMasterFields()
    if (!id || id === 'new') {
      initCreateTemplate('inspection').then((newId) => {
        navigate(`/templates/${newId}/builder`, { replace: true })
      })
    } else {
      loadTemplate(id)
    }
    return () => resetEditor()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const handleBack = async () => {
    if (isDirty) {
      const confirmed = await appSwal.confirmLeave()
      if (!confirmed) return
      navigate(-1)
    } else {
      navigate(-1)
    }
  }

  const handleSave = async () => {
    const confirmed = await appSwal.confirmSave()
    if (!confirmed) return

    try {
      await saveTemplate()
      await appSwal.successSaved('template')
      navigate('/templates')
    } catch (saveError) {
      await appSwal.errorSaveFailed('template', getApiErrorMessage(saveError))
    }
  }

  const handlePublish = async () => {
    const confirmed = await appSwal.confirm({
      title: t('builder.publishConfirm.title'),
      text: isDirty ? t('builder.publishConfirm.textDirty') : t('builder.publishConfirm.text'),
      confirmText: t('swal.buttons.yes'),
      cancelText: t('swal.buttons.no'),
    })
    if (!confirmed) return

    try {
      if (isDirty) await saveTemplate()
      await publishTemplate()
      await appSwal.success({
        title: t('builder.publishSuccess.title'),
        text: t('builder.publishSuccess.text'),
      })
      navigate('/templates')
    } catch (publishError) {
      await appSwal.error({
        title: t('builder.publishFailed.title'),
        text: getApiErrorMessage(publishError),
      })
    }
  }

  // ── Field reorder helpers ─────────────────────────────────────────────────

  const moveFieldUp = useCallback(
    (sectionId: string, fieldIndex: number) => {
      const sectionFields = fields[sectionId] ?? []
      if (fieldIndex === 0) return
      const ids = sectionFields.map((f) => f.id)
      ;[ids[fieldIndex - 1], ids[fieldIndex]] = [ids[fieldIndex], ids[fieldIndex - 1]]
      reorderFields(sectionId, ids)
    },
    [fields, reorderFields],
  )

  const moveFieldDown = useCallback(
    (sectionId: string, fieldIndex: number) => {
      const sectionFields = fields[sectionId] ?? []
      if (fieldIndex >= sectionFields.length - 1) return
      const ids = sectionFields.map((f) => f.id)
      ;[ids[fieldIndex], ids[fieldIndex + 1]] = [ids[fieldIndex + 1], ids[fieldIndex]]
      reorderFields(sectionId, ids)
    },
    [fields, reorderFields],
  )

  const moveSectionUp = useCallback(
    (sectionIndex: number) => {
      if (sectionIndex === 0) return
      const ids = sections.map((s) => s.id)
      ;[ids[sectionIndex - 1], ids[sectionIndex]] = [ids[sectionIndex], ids[sectionIndex - 1]]
      reorderSections(ids)
    },
    [sections, reorderSections],
  )

  const moveSectionDown = useCallback(
    (sectionIndex: number) => {
      if (sectionIndex >= sections.length - 1) return
      const ids = sections.map((s) => s.id)
      ;[ids[sectionIndex], ids[sectionIndex + 1]] = [ids[sectionIndex + 1], ids[sectionIndex]]
      reorderSections(ids)
    },
    [sections, reorderSections],
  )

  // Calculate Total Questions
  const totalQuestions = Object.values(fields).reduce((acc, fList) => acc + fList.length, 0)

  // Sidebar active item (independent of expanded state)
  const [activeSidebarId, setActiveSidebarId] = useState<string | null>(null)

  if (isLoading || !template) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary-blue" />
          <p className="text-sm font-medium text-stone">Memuat data template builder...</p>
        </div>
      </div>
    )
  }

  const isNew = id === 'new'

  return (
    <div className="flex h-screen min-h-screen flex-col overflow-hidden bg-surface">
      {/* ── Sticky Header ──────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-hairline-soft bg-card/80 px-4 backdrop-blur-xl sm:px-6">
        <div className="flex items-center gap-3">
          <IconButton onClick={handleBack} aria-label="Kembali">
            <ArrowLeft className="h-5 w-5" />
          </IconButton>

          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-blue/10 text-primary-blue">
              <LayoutList className="h-4.5 w-4.5" />
            </div>
            <div>
              <Eyebrow className="text-primary-blue">Template Builder</Eyebrow>
              <h1 className="text-sm font-semibold leading-tight text-ink-deep">
                {isNew ? t('builder.createTemplate') : t('builder.title')}
              </h1>
              <p className="mt-0.5 text-[11px] font-medium leading-none text-stone">
                {sections.length} Bab • {totalQuestions} Pertanyaan
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isDirty && (
            <Badge tone="warning" dot className="mr-1 hidden animate-pulse sm:inline-flex">
              Perubahan belum disimpan
            </Badge>
          )}

          <Button
            variant="primary"
            size="sm"
            onClick={handlePublish}
            disabled={isSaving || !template.title.trim()}
            loading={isSaving}
            icon={!isSaving ? <Send className="h-4 w-4" /> : undefined}
          >
            {t('builder.publish')}
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleSave}
            disabled={!isDirty || isSaving}
            loading={isSaving}
            icon={!isSaving ? <Save className="h-4 w-4" /> : undefined}
          >
            {t('builder.save')}
          </Button>
        </div>
      </header>

      {/* ── Error Banner ───────────────────────────────────────────── */}
      {error && (
        <Alert tone="danger" className="mx-4 mt-4 shrink-0 animate-slide-in-down sm:mx-6">
          {error}
        </Alert>
      )}

      {/* ── Main Layout (Two Column) ───────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Left: Bab Index Navigation */}
        <aside className="hidden w-68 shrink-0 flex-col space-y-4 overflow-y-auto border-r border-hairline-soft bg-card p-4.5 md:flex">
          <div className="flex-1 space-y-1.5">
            <Eyebrow className="mb-3 px-2">Index Halaman Bab</Eyebrow>
            <div className="space-y-1">
              {sections.map((s, idx) => {
                const isActive = s.id === activeSidebarId
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setActiveSidebarId(s.id)
                      if (!expandedSections.includes(s.id)) toggleSection(s.id)
                      const el = document.getElementById(`section-${s.id}`)
                      el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                    }}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-2xl px-3.5 py-2.5 text-left text-xs font-semibold transition-all',
                      isActive
                        ? 'bg-primary-blue/10 text-primary-blue'
                        : 'text-ink-deep hover:bg-surface'
                    )}
                  >
                    <span className={cn(
                      'flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold',
                      isActive ? 'bg-primary-blue text-white' : 'bg-surface text-stone'
                    )}>
                      {idx + 1}
                    </span>
                    <span className="flex-1 truncate leading-none">{s.title || 'Untitled Section'}</span>
                    <span className="rounded-full bg-surface px-1.5 py-0.5 text-[9px] font-bold text-stone">
                      {(fields[s.id] ?? []).length}q
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <Button
            variant="subtle"
            block
            icon={<Plus className="h-4 w-4" />}
            onClick={addSection}
            className="mt-auto shrink-0 border-dashed border-primary-blue/35 text-primary-blue"
          >
            Tambah Bab Baru
          </Button>
        </aside>

        {/* Middle/Right Container: Scrollable Workspace */}
        <main className="flex-1 overflow-y-auto scroll-smooth bg-surface/30 px-4 py-6 sm:px-6">
          <div className="mx-auto max-w-3xl space-y-5">
            {/* ── Template Configuration Card ─────────────────────── */}
            <div className="panel space-y-4 p-6 animate-fade-in-scale">
              {/* Title Input */}
              <input
                type="text"
                value={template.title}
                onChange={(e) => updateTemplateInfo({ title: e.target.value })}
                placeholder={t('builder.templateTitlePlaceholder')}
                className="w-full border-none bg-transparent text-lg font-bold tracking-tight text-ink-deep placeholder:text-stone/40 focus:outline-none"
              />

              {/* Description Textarea */}
              <textarea
                value={template.description || ''}
                onChange={(e) => updateTemplateInfo({ description: e.target.value })}
                placeholder="Tulis deskripsi ringkas mengenai template audit ini..."
                rows={2}
                className="w-full resize-none border-none bg-transparent text-xs leading-relaxed text-stone placeholder:text-stone/50 focus:outline-none"
              />

              {/* Line Divider */}
              <div className="border-t border-hairline-soft" />

              {/* Toggles */}
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                {/* Form type options */}
                <div className="flex items-center gap-3">
                  <Eyebrow>Kategori Template</Eyebrow>
                  <div className="flex gap-1 rounded-full border border-hairline-soft bg-surface p-1">
                    {(['inspection', 'cps'] as const).map((ft) => (
                      <button
                        key={ft}
                        type="button"
                        onClick={() => updateTemplateInfo({ form_type: ft })}
                        className={cn(
                          'rounded-full px-4 py-1.5 text-xs font-semibold capitalize transition-all duration-200',
                          template.form_type === ft
                            ? 'bg-card text-primary-blue shadow-soft-sm'
                            : 'text-stone hover:text-ink-deep',
                        )}
                      >
                        {ft === 'inspection' ? 'Inspection Standard' : 'CPS Weekly'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Enable Scoring Switch */}
                <label className="flex cursor-pointer select-none items-center gap-2.5">
                  <span className="text-xs font-semibold text-ink-deep">
                    Aktifkan Penilaian (Scoring)
                  </span>
                  <Toggle
                    checked={!!template.scoring_enabled}
                    onChange={() => updateTemplateInfo({ scoring_enabled: !template.scoring_enabled })}
                    label="Aktifkan Penilaian"
                  />
                </label>
              </div>
            </div>

            {/* ── Sections Cards ──────────────────────────────────── */}
            <div className="space-y-4">
              {sections.length === 0 && (
                <div className="panel px-6 py-16 text-center text-stone animate-fade-in">
                  <p className="text-sm font-semibold text-ink-deep">Belum Ada Bab Pembuat Template</p>
                  <p className="mt-1 text-xs text-stone">Tambahkan bab pertama Anda di tombol bawah atau sidebar.</p>
                </div>
              )}

              {sections.map((section, si) => {
                const isExpanded = expandedSections.includes(section.id)
                const sectionFields = fields[section.id] ?? []
                const isTitlePage = si === 0

                return (
                  <SectionCard
                    key={section.id}
                    section={section}
                    sectionFields={sectionFields}
                    isExpanded={isExpanded}
                    isTitlePage={isTitlePage}
                    index={si}
                    total={sections.length}
                    onToggle={() => toggleSection(section.id)}
                    onUpdateSection={(patch) => updateSection(section.id, patch)}
                    onDuplicate={() => duplicateSection(section.id)}
                    onDelete={async () => {
                      const confirmed = await appSwal.confirmDelete(section.title, 'section')
                      if (!confirmed) return

                      try {
                        await deleteSection(section.id)
                        await appSwal.successDeleted('section', section.title)
                      } catch (deleteError) {
                        await appSwal.errorDeleteFailed('section', getApiErrorMessage(deleteError))
                      }
                    }}
                    onMoveUp={() => moveSectionUp(si)}
                    onMoveDown={() => moveSectionDown(si)}
                    onAddField={(type) => addField(section.id, type)}
                    onAddFieldFromMaster={(masterFieldId) => addFieldFromMaster(section.id, masterFieldId)}
                    onUpdateField={(fieldId, patch) => updateField(section.id, fieldId, patch)}
                    onDeleteField={(fieldId) => deleteField(section.id, fieldId)}
                    onMoveFieldUp={(fi) => moveFieldUp(section.id, fi)}
                    onMoveFieldDown={(fi) => moveFieldDown(section.id, fi)}
                  />
                )
              })}
            </div>

            {/* ── Add Section Footer Action ────────────────────────── */}
            <Button
              variant="subtle"
              block
              size="lg"
              icon={<Plus className="h-5 w-5" />}
              onClick={addSection}
              className="border-dashed border-primary-blue/30 py-4 text-primary-blue"
            >
              Tambah Bab Halaman Baru (Section)
            </Button>

            {/* Bottom spacer */}
            <div className="h-6" />
          </div>
        </main>
      </div>
    </div>
  )
}

export default TemplateBuilderPage
