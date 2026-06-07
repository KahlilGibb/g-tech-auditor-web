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
  AlertTriangle,
  Loader2,
  CheckSquare,
  LayoutList,
} from 'lucide-react'
import { cn } from '../utils/cn'
import { useTemplateEditorStore } from '../stores/templateEditorStore'
import type { FieldType, TemplateField, TemplateSection } from '../types/template'
import { fieldTypeColor, fieldTypeLabel } from '../types/template'
import FieldTypePicker from '../components/builder/FieldTypePicker'
import FieldOptionsEditor from '../components/builder/FieldOptionsEditor'
import { appSwal } from '../lib/appSwal'
import { getApiErrorMessage } from '../lib/apiResponse'

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
  const { t } = useTranslation()
  const color = fieldTypeColor(field.type)
  const label = fieldTypeLabel(field.type)
  const showOptions = HAS_OPTIONS.includes(field.type)

  return (
    <div
      className="bg-white rounded-xl border border-divider overflow-hidden group transition-shadow duration-150 hover:shadow-sm animate-slide-in-down"
    >
      {/* Main row */}
      <div className="flex items-start gap-3 p-3">
        {/* Up/Down handle */}
        <div className="flex flex-col gap-0.5 mt-1 shrink-0">
          <button
            onClick={onMoveUp}
            disabled={index === 0}
            className="p-0.5 rounded hover:bg-surface disabled:opacity-20 text-muted-foreground hover:text-foreground transition-all"
          >
            <ChevronUp className="w-3 h-3" />
          </button>
          <button
            onClick={onMoveDown}
            disabled={index === total - 1}
            className="p-0.5 rounded hover:bg-surface disabled:opacity-20 text-muted-foreground hover:text-foreground transition-all"
          >
            <ChevronDown className="w-3 h-3" />
          </button>
        </div>

        {/* Label input */}
        <input
          type="text"
          value={field.label}
          onChange={(e) => onUpdate({ label: e.target.value })}
          placeholder="Pertanyaan..."
          className="flex-1 text-sm font-medium text-foreground bg-transparent border-none focus:outline-none placeholder:text-muted-foreground/40 py-0.5"
        />

        {/* Type button */}
        <button
          onClick={onOpenPicker}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-80 active:scale-95 shrink-0"
          style={{
            backgroundColor: hexAlpha(color, 0.12),
            color,
          }}
        >
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: color }}
          />
          {label}
        </button>

        {/* Required toggle */}
        <label className="flex items-center gap-1.5 shrink-0 cursor-pointer select-none">
          <div
            onClick={() => onUpdate({ required: !field.required })}
            className={cn(
              'w-4 h-4 rounded border-2 flex items-center justify-center transition-all cursor-pointer',
              field.required
                ? 'bg-primary-blue border-primary-blue'
                : 'border-divider hover:border-primary-blue/50',
            )}
          >
            {field.required && (
              <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 10" fill="none">
                <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
          <span className="text-[11px] text-muted-foreground font-medium hidden sm:inline">
            {t('builder.requireQuestion')}
          </span>
        </label>

        {/* Delete */}
        <button
          onClick={onDelete}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-danger-red hover:bg-danger-red/5 transition-all opacity-0 group-hover:opacity-100 shrink-0"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Options editor for dropdown / checkbox / pass_fail */}
      {showOptions && (
        <div className="px-3 pb-3">
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
      <div className="bg-white rounded-2xl border border-divider shadow-sm overflow-hidden animate-fade-in-scale">
        {/* Section Header */}
        <div
          className={cn(
            'flex items-center gap-3 px-4 py-3.5 cursor-pointer transition-colors duration-150 select-none',
            isExpanded ? 'bg-primary-blue/5 border-b border-divider' : 'hover:bg-surface/60',
          )}
          onClick={onToggle}
        >
          {/* Section number + up/down */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={(e) => { e.stopPropagation(); onMoveUp() }}
              disabled={index === 0}
              className="p-0.5 rounded hover:bg-white disabled:opacity-20 text-muted-foreground hover:text-foreground transition-all"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
            <div className={cn(
              'w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0',
              isExpanded ? 'bg-primary-blue text-white' : 'bg-surface text-muted-foreground',
            )}>
              {index + 1}
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onMoveDown() }}
              disabled={index === total - 1}
              className="p-0.5 rounded hover:bg-white disabled:opacity-20 text-muted-foreground hover:text-foreground transition-all"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Title input */}
          <input
            type="text"
            value={section.title}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => onUpdateSection({ title: e.target.value })}
            placeholder={t('builder.sectionTitlePlaceholder')}
            className="flex-1 text-sm font-bold text-foreground bg-transparent border-none focus:outline-none placeholder:text-muted-foreground/40"
          />

          {/* Question count */}
          <span className="px-2 py-0.5 rounded-full bg-surface text-muted-foreground text-[10px] font-bold shrink-0">
            {sectionFields.length}q
          </span>

          {/* Chevron toggle */}
          <ChevronDown
            className={cn(
              'w-4 h-4 text-muted-foreground transition-transform duration-300 shrink-0',
              isExpanded && 'rotate-180',
            )}
          />

          {/* More menu (not for title page) */}
          {!isTitlePage && (
            <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1.5 rounded-lg hover:bg-white text-muted-foreground hover:text-foreground transition-colors"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
              {showMenu && (
                <>
                  <div
                    className="fixed inset-0 z-20"
                    onClick={() => setShowMenu(false)}
                  />
                  <div className="absolute right-0 top-8 z-30 w-40 bg-white rounded-xl border border-divider shadow-xl overflow-hidden animate-fade-in-scale">
                    <button
                      onClick={() => { onDuplicate(); setShowMenu(false) }}
                      className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-foreground hover:bg-surface transition-colors"
                    >
                      <Copy className="w-4 h-4 text-muted-foreground" />
                      Duplikat
                    </button>
                    <button
                      onClick={() => { onDelete(); setShowMenu(false) }}
                      className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-danger-red hover:bg-danger-red/5 transition-colors border-t border-divider"
                    >
                      <Trash2 className="w-4 h-4" />
                      Hapus
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Animated body */}
        <div
          style={{
            display: 'grid',
            gridTemplateRows: isExpanded ? '1fr' : '0fr',
            transition: 'grid-template-rows 280ms cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          <div style={{ overflow: 'hidden' }}>
            <div className="p-4 space-y-3 bg-surface/30">
              {/* Section description */}
              <input
                type="text"
                value={section.description || ''}
                onChange={(e) => onUpdateSection({ description: e.target.value })}
                placeholder="Deskripsi bab (opsional)..."
                className="w-full text-xs text-muted-foreground bg-white border border-divider rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-blue/20 focus:border-primary-blue/40 placeholder:text-muted-foreground/40 transition-all"
              />

              {/* Fields table header */}
              {sectionFields.length > 0 && (
                <div className="flex items-center gap-3 px-3 pb-1">
                  <div className="w-8 shrink-0" />
                  <span className="flex-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Pertanyaan
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Tipe
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground hidden sm:block">
                    Wajib
                  </span>
                  <div className="w-7" />
                </div>
              )}

              {/* Fields */}
              {sectionFields.map((field, fi) => (
                <FieldRow
                  key={field.id}
                  field={field}
                  index={fi}
                  total={sectionFields.length}
                  onUpdate={(patch) => onUpdateField(field.id, patch)}
                  onDelete={async () => {
                    const confirmed = await appSwal.confirmDelete(field.label || 'Question', 'question')
                    if (!confirmed) return

                    try {
                      await onDeleteField(field.id)
                      await appSwal.successDeleted('question', field.label || 'Question')
                    } catch (deleteError) {
                      await appSwal.errorDeleteFailed('question', getApiErrorMessage(deleteError))
                    }
                  }}
                  onMoveUp={() => onMoveFieldUp(fi)}
                  onMoveDown={() => onMoveFieldDown(fi)}
                  onOpenPicker={() => setPickerOpenFor(field.id)}
                />
              ))}

              {/* Add question button */}
              <button
                onClick={() => onAddField('text_answer')}
                className="w-full py-3 border-2 border-dashed border-divider rounded-xl flex items-center justify-center gap-2 text-muted-foreground hover:text-primary-blue hover:border-primary-blue/30 hover:bg-primary-blue/5 transition-all text-sm font-semibold group"
              >
                <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
                {t('builder.addQuestion')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Field type picker for this section */}
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
      // Create new template, then redirect to its builder URL
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

  // ── Loading state ─────────────────────────────────────────────────────────

  if (isLoading || !template) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-primary-blue animate-spin" />
          <p className="text-sm text-muted-foreground font-medium">Memuat template...</p>
        </div>
      </div>
    )
  }

  const isNew = id === 'new'

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* ── Sticky Header ──────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 h-14 bg-white border-b border-divider flex items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="p-2 hover:bg-surface rounded-xl transition-colors text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary-blue/10 flex items-center justify-center">
              <LayoutList className="w-4 h-4 text-primary-blue" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-foreground leading-tight">
                {isNew ? t('builder.createTemplate') : t('builder.title')}
              </h1>
              {isDirty && (
                <p className="text-[10px] text-warning-amber font-medium leading-none mt-0.5">
                  Perubahan belum disimpan
                </p>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={!isDirty || isSaving}
          className={cn(
            'flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold transition-all duration-200',
            isDirty && !isSaving
              ? 'bg-primary-blue text-white shadow-sm shadow-primary-blue/30 hover:bg-primary-blue-dark active:scale-95'
              : 'bg-surface text-muted-foreground cursor-not-allowed',
          )}
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {t('builder.save')}
        </button>
      </header>

      {/* ── Error Banner ───────────────────────────────────────────── */}
      {error && (
        <div className="mx-4 sm:mx-6 mt-4 p-3 bg-danger-red/10 border border-danger-red/20 rounded-xl flex items-center gap-2 text-danger-red text-sm animate-slide-in-down">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span className="flex-1">{error}</span>
        </div>
      )}

      {/* ── Page Content ───────────────────────────────────────────── */}
      <div className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-6 space-y-4">

        {/* ── Template Config Card ─────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-divider shadow-sm p-5 space-y-4 animate-fade-in-scale">
          {/* Title */}
          <input
            type="text"
            value={template.title}
            onChange={(e) => updateTemplateInfo({ title: e.target.value })}
            placeholder={t('builder.templateTitlePlaceholder')}
            className="w-full text-xl font-bold text-foreground bg-transparent border-none focus:outline-none placeholder:text-muted-foreground/40"
          />

          {/* Description */}
          <textarea
            value={template.description || ''}
            onChange={(e) => updateTemplateInfo({ description: e.target.value })}
            placeholder={t('builder.addDescription')}
            rows={2}
            className="w-full text-sm text-muted-foreground bg-transparent border-none focus:outline-none resize-none placeholder:text-muted-foreground/40"
          />

          {/* Divider */}
          <div className="border-t border-divider" />

          {/* Form type + Scoring */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Form type toggle */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                {t('builder.typeToggle')}
              </span>
              <div className="flex bg-surface p-1 rounded-xl">
                {(['inspection', 'cps'] as const).map((ft) => (
                  <button
                    key={ft}
                    onClick={() => updateTemplateInfo({ form_type: ft })}
                    className={cn(
                      'px-4 py-1.5 rounded-lg text-xs font-bold capitalize transition-all duration-200',
                      template.form_type === ft
                        ? 'bg-white text-primary-blue shadow-sm'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {ft}
                  </button>
                ))}
              </div>
            </div>

            {/* Scoring toggle */}
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <span className="text-xs font-semibold text-foreground">
                {t('builder.enableScoring')}
              </span>
              <button
                onClick={() => updateTemplateInfo({ scoring_enabled: !template.scoring_enabled })}
                className={cn(
                  'relative w-10 h-5.5 rounded-full transition-colors duration-200',
                  template.scoring_enabled ? 'bg-primary-blue' : 'bg-divider',
                )}
                style={{ height: '22px' }}
              >
                <span
                  className={cn(
                    'absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200',
                    template.scoring_enabled ? 'translate-x-5' : 'translate-x-0.5',
                  )}
                />
              </button>
              {template.scoring_enabled && (
                <CheckSquare className="w-4 h-4 text-primary-blue animate-fade-in" />
              )}
            </label>
          </div>
        </div>

        {/* ── Sections ─────────────────────────────────────────────── */}
        <div className="space-y-3">
          {sections.length === 0 && (
            <div className="text-center py-12 text-muted-foreground animate-fade-in">
              <p className="font-semibold">{t('builder.noSections')}</p>
              <p className="text-sm mt-1">Tambahkan bab pertama di bawah.</p>
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

        {/* ── Add Section ──────────────────────────────────────────── */}
        <button
          onClick={addSection}
          className="w-full py-4 border-2 border-dashed border-primary-blue/25 bg-primary-blue/[0.03] rounded-2xl flex items-center justify-center gap-2 text-primary-blue font-bold hover:bg-primary-blue/[0.07] hover:border-primary-blue/40 transition-all group"
        >
          <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
          {t('builder.addSection')}
        </button>

        {/* Bottom spacer */}
        <div className="h-6" />
      </div>
    </div>
  )
}

export default TemplateBuilderPage
