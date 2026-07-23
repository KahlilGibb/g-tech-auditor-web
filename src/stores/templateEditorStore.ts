import { create } from 'zustand'
import type {
  Template,
  TemplateVersion,
  TemplateSection,
  TemplateField,
  MasterField,
  FormType,
  FieldType,
} from '../types/template'
import { templateService } from '../services/templateService'
import { getApiErrorMessage } from '../lib/apiResponse'

// ─── State shape ──────────────────────────────────────────────────────────────

interface TemplateEditorState {
  template: Template | null
  version: TemplateVersion | null
  sections: TemplateSection[]
  fields: Record<string, TemplateField[]>   // keyed by section_id
  masterFields: MasterField[]

  isLoading: boolean
  isSaving: boolean
  isDirty: boolean
  error: string | null
  expandedSections: string[]

  // Actions
  initCreateTemplate: (formType: FormType) => Promise<string>
  loadTemplate: (templateId: string) => Promise<void>
  updateTemplateInfo: (
    patch: Partial<Pick<Template, 'title' | 'description' | 'form_type' | 'scoring_enabled'>>,
  ) => void
  saveTemplate: () => Promise<void>
  publishTemplate: () => Promise<void>

  addSection: () => Promise<void>
  updateSection: (
    sectionId: string,
    patch: Partial<Pick<TemplateSection, 'title' | 'description'>>,
  ) => void
  deleteSection: (sectionId: string) => Promise<void>
  duplicateSection: (sectionId: string) => Promise<void>
  reorderSections: (orderedIds: string[]) => Promise<void>
  toggleSection: (sectionId: string) => void

  addField: (sectionId: string, type: FieldType) => Promise<void>
  addFieldFromMaster: (sectionId: string, masterFieldId: string) => Promise<void>
  updateField: (
    sectionId: string,
    fieldId: string,
    patch: Partial<TemplateField>,
  ) => void
  deleteField: (sectionId: string, fieldId: string) => Promise<void>
  reorderFields: (sectionId: string, orderedIds: string[]) => Promise<void>

  loadMasterFields: () => Promise<void>
  resetEditor: () => void
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useTemplateEditorStore = create<TemplateEditorState>()((set, get) => ({
  template: null,
  version: null,
  sections: [],
  fields: {},
  masterFields: [],

  isLoading: false,
  isSaving: false,
  isDirty: false,
  error: null,
  expandedSections: [],

  // ── Init / Load ─────────────────────────────────────────────────────────────

  initCreateTemplate: async (formType) => {
    set({ isLoading: true, error: null })
    try {
      const { template, version, sections } = await templateService.createTemplate(formType)
      set({
        template,
        version,
        sections,
        fields: { [sections[0].id]: [] },
        expandedSections: [sections[0].id],
        isDirty: false,
        isLoading: false,
      })
      return template.id
    } catch (e) {
      set({ error: getApiErrorMessage(e, 'Failed to create template'), isLoading: false })
      throw e
    }
  },

  loadTemplate: async (templateId) => {
    // Skip if already loaded
    if (get().template?.id === templateId) return
    set({ isLoading: true, error: null })
    try {
      const { template, version, sections, fields } = await templateService.getTemplateEdit(templateId)
      set({
        template,
        version,
        sections,
        fields,
        expandedSections: sections.length > 0 ? [sections[0].id] : [],
        isDirty: false,
        isLoading: false,
      })
    } catch (e) {
      set({ error: getApiErrorMessage(e, 'Failed to load template'), isLoading: false })
    }
  },

  // ── Template metadata ───────────────────────────────────────────────────────

  updateTemplateInfo: (patch) => {
    set(state => ({
      template: state.template ? { ...state.template, ...patch } : null,
      isDirty: true,
    }))
  },

  saveTemplate: async () => {
    const { template, version, sections, fields } = get()
    if (!template || !version) return
    set({ isSaving: true })
    try {
      const result = await templateService.saveTemplateTree(template, sections, fields)
      set({
        template: result.template,
        version: result.version,
        sections: result.sections,
        fields: result.fields,
        expandedSections: result.sections.length > 0 ? [result.sections[0].id] : [],
        isSaving: false,
        isDirty: false,
      })
    } catch (e) {
      set({ isSaving: false, error: getApiErrorMessage(e, 'Failed to save template') })
      throw e
    }
  },

  publishTemplate: async () => {
    const { template } = get()
    if (!template) return
    set({ isSaving: true, error: null })
    try {
      const published = await templateService.publishTemplate(template.id)
      set(state => ({
        template: published,
        version: state.version
          ? { ...state.version, status: 'published', published_at: new Date().toISOString() }
          : state.version,
        isSaving: false,
        isDirty: false,
      }))
    } catch (e) {
      set({ isSaving: false, error: getApiErrorMessage(e, 'Failed to publish template') })
      throw e
    }
  },

  // ── Sections ────────────────────────────────────────────────────────────────

  addSection: async () => {
    const { version, sections } = get()
    if (!version) return

    const newOrder = sections.length + 1
    const sectionId = `draft-section-${Date.now()}`
    const section: TemplateSection = {
      id: sectionId,
      version_id: version.id,
      title: 'Untitled Page',
      description:
        'This is where you add your inspection questions and how you want them answered.',
      order: newOrder,
      status: 'active',
      created_at: new Date().toISOString(),
    }
    set(state => ({
      sections: [...state.sections, section],
      fields: { ...state.fields, [sectionId]: [] },
      expandedSections: [...state.expandedSections, sectionId],
      isDirty: true,
    }))
  },

  updateSection: (sectionId, patch) => {
    set(state => ({
      sections: state.sections.map(s =>
        s.id === sectionId ? { ...s, ...patch } : s,
      ),
      isDirty: true,
    }))
  },

  deleteSection: async (sectionId) => {
    set(state => {
      const newFields = { ...state.fields }
      delete newFields[sectionId]
      return {
        sections: state.sections.filter(s => s.id !== sectionId),
        fields: newFields,
        expandedSections: state.expandedSections.filter(id => id !== sectionId),
        isDirty: true,
      }
    })
  },

  duplicateSection: async (sectionId) => {
    const { version, sections, fields } = get()
    if (!version) return
    const source = sections.find(section => section.id === sectionId)
    if (!source) return

    const newSectionId = `draft-section-${Date.now()}`
    const section: TemplateSection = {
      ...source,
      id: newSectionId,
      title: `${source.title} (copy)`,
      order: sections.length + 1,
      created_at: new Date().toISOString(),
    }
    const copiedFields = (fields[sectionId] ?? []).map((field, index) => ({
      ...field,
      id: `draft-field-${Date.now()}-${index}`,
      section_id: newSectionId,
      order: index + 1,
    }))

    set(state => ({
      sections: [...state.sections, section].sort((a, b) => a.order - b.order),
      fields: { ...state.fields, [section.id]: copiedFields },
      expandedSections: [...state.expandedSections, section.id],
      isDirty: true,
    }))
  },

  reorderSections: async (orderedIds) => {
    const { version, sections } = get()
    if (!version) return
    const reordered = orderedIds
      .map((id, idx) => {
        const s = sections.find(s => s.id === id)
        return s ? { ...s, order: idx + 1 } : null
      })
      .filter((s): s is TemplateSection => s !== null)
    set({ sections: reordered, isDirty: true })
  },

  toggleSection: (sectionId) => {
    set(state => ({
      expandedSections: state.expandedSections.includes(sectionId)
        ? state.expandedSections.filter(id => id !== sectionId)
        : [...state.expandedSections, sectionId],
    }))
  },

  // ── Fields ──────────────────────────────────────────────────────────────────

  addField: async (sectionId, type) => {
    const existing = get().fields[sectionId] ?? []
    const fieldId = `draft-field-${Date.now()}`
    const field: TemplateField = {
      id: fieldId,
      section_id: sectionId,
      master_field_id: null,
      label: 'Question',
      type,
      required: false,
      order: existing.length + 1,
      rules: null,
    }
    set(state => ({
      fields: {
        ...state.fields,
        [sectionId]: [...(state.fields[sectionId] ?? []), field],
      },
      isDirty: true,
    }))
  },

  addFieldFromMaster: async (sectionId, masterFieldId) => {
    const master = get().masterFields.find(field => field.id === masterFieldId)
    if (!master) return
    const existing = get().fields[sectionId] ?? []
    const fieldId = `draft-field-${Date.now()}`
    const field: TemplateField = {
      id: fieldId,
      section_id: sectionId,
      master_field_id: masterFieldId,
      label: master.name,
      type: master.field_type,
      required: false,
      order: existing.length + 1,
      rules: null,
      options: master.options?.map(option => ({
        id: option.id,
        field_id: fieldId,
        label: option.label,
        value: option.value,
        score_value: option.score_value,
      })),
    }
    set(state => ({
      fields: {
        ...state.fields,
        [sectionId]: [...(state.fields[sectionId] ?? []), field],
      },
      isDirty: true,
    }))
  },

  updateField: (sectionId, fieldId, patch) => {
    set(state => ({
      fields: {
        ...state.fields,
        [sectionId]: (state.fields[sectionId] ?? []).map(f =>
          f.id === fieldId ? { ...f, ...patch } : f,
        ),
      },
      isDirty: true,
    }))
  },

  deleteField: async (sectionId, fieldId) => {
    set(state => ({
      fields: {
        ...state.fields,
        [sectionId]: (state.fields[sectionId] ?? []).filter(f => f.id !== fieldId),
      },
      isDirty: true,
    }))
  },

  reorderFields: async (sectionId, orderedIds) => {
    const current = get().fields[sectionId] ?? []
    const reordered = orderedIds
      .map((id, idx) => {
        const f = current.find(f => f.id === id)
        return f ? { ...f, order: idx + 1 } : null
      })
      .filter((f): f is TemplateField => f !== null)
    set(state => ({
      fields: { ...state.fields, [sectionId]: reordered },
      isDirty: true,
    }))
  },

  // ── Master fields ────────────────────────────────────────────────────────────

  loadMasterFields: async () => {
    try {
      const masterFields = await templateService.getMasterFields()
      set({ masterFields })
    } catch (e) {
      set({ error: getApiErrorMessage(e, 'Failed to load master fields') })
    }
  },

  resetEditor: () => {
    set({
      template: null,
      version: null,
      sections: [],
      fields: {},
      masterFields: [],
      isLoading: false,
      isSaving: false,
      isDirty: false,
      error: null,
      expandedSections: [],
    })
  },
}))
