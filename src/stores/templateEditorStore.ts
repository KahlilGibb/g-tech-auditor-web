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
      set({ error: String(e), isLoading: false })
      throw e
    }
  },

  loadTemplate: async (templateId) => {
    // Skip if already loaded
    if (get().template?.id === templateId) return
    set({ isLoading: true, error: null })
    try {
      const { template, version, sections, fields } = await templateService.getTemplateWithVersion(templateId)
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
      set({ error: String(e), isLoading: false })
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
    const { template, version } = get()
    if (!template || !version) return
    set({ isSaving: true })
    try {
      await templateService.updateTemplate(template.id, {
        title: template.title,
        description: template.description,
        form_type: template.form_type,
        scoring_enabled: template.scoring_enabled,
      })
      set({ isSaving: false, isDirty: false })
    } catch (e) {
      set({ isSaving: false, error: String(e) })
    }
  },

  // ── Sections ────────────────────────────────────────────────────────────────

  addSection: async () => {
    const { version, sections } = get()
    if (!version) return

    const newOrder = sections.length + 1
    // Optimistic placeholder
    const tempId = `temp-${Date.now()}`
    const optimistic: TemplateSection = {
      id: tempId,
      version_id: version.id,
      title: 'Untitled Page',
      description:
        'This is where you add your inspection questions and how you want them answered.',
      order: newOrder,
      status: 'active',
      created_at: new Date().toISOString(),
    }
    set(state => ({
      sections: [...state.sections, optimistic],
      fields: { ...state.fields, [tempId]: [] },
      expandedSections: [...state.expandedSections, tempId],
      isDirty: true,
    }))

    try {
      const saved = await templateService.createSection(version.id, {
        title: 'Untitled Page',
        description: 'This is where you add your inspection questions and how you want them answered.',
        order: newOrder,
      })
      // Replace temp with real
      set(state => {
        const newFields = { ...state.fields }
        newFields[saved.id] = newFields[tempId] ?? []
        delete newFields[tempId]
        return {
          sections: state.sections.map(s => (s.id === tempId ? saved : s)),
          fields: newFields,
          expandedSections: state.expandedSections.map(id => (id === tempId ? saved.id : id)),
        }
      })
    } catch (e) {
      // Rollback
      set(state => {
        const newFields = { ...state.fields }
        delete newFields[tempId]
        return {
          sections: state.sections.filter(s => s.id !== tempId),
          fields: newFields,
          expandedSections: state.expandedSections.filter(id => id !== tempId),
        }
      })
    }
  },

  updateSection: (sectionId, patch) => {
    set(state => ({
      sections: state.sections.map(s =>
        s.id === sectionId ? { ...s, ...patch } : s,
      ),
      isDirty: true,
    }))
    templateService.updateSection(sectionId, patch).catch(() => {})
  },

  deleteSection: async (sectionId) => {
    const snapshot = get().sections
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
    try {
      await templateService.deleteSection(sectionId)
    } catch {
      set({ sections: snapshot })
    }
  },

  duplicateSection: async (sectionId) => {
    const { version } = get()
    if (!version) return
    try {
      const { section, fields } = await templateService.duplicateSection(sectionId)
      set(state => ({
        sections: [...state.sections, section].sort((a, b) => a.order - b.order),
        fields: { ...state.fields, [section.id]: fields },
        expandedSections: [...state.expandedSections, section.id],
        isDirty: true,
      }))
    } catch (e) {
      set({ error: String(e) })
    }
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
    templateService.reorderSections(version.id, orderedIds).catch(() => {})
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
    const tempId = `temp-${Date.now()}`
    const optimistic: TemplateField = {
      id: tempId,
      section_id: sectionId,
      master_field_id: null,
      label: 'Question',
      type,
      required: false,
      order: existing.length + 1,
      logic_rules: null,
    }
    set(state => ({
      fields: {
        ...state.fields,
        [sectionId]: [...(state.fields[sectionId] ?? []), optimistic],
      },
      isDirty: true,
    }))
    try {
      const saved = await templateService.createField(sectionId, type)
      set(state => ({
        fields: {
          ...state.fields,
          [sectionId]: (state.fields[sectionId] ?? []).map(f =>
            f.id === tempId ? saved : f,
          ),
        },
      }))
    } catch {
      set(state => ({
        fields: {
          ...state.fields,
          [sectionId]: (state.fields[sectionId] ?? []).filter(f => f.id !== tempId),
        },
      }))
    }
  },

  addFieldFromMaster: async (sectionId, masterFieldId) => {
    try {
      const field = await templateService.createFieldFromMaster(sectionId, masterFieldId)
      set(state => ({
        fields: {
          ...state.fields,
          [sectionId]: [...(state.fields[sectionId] ?? []), field],
        },
        isDirty: true,
      }))
    } catch (e) {
      set({ error: String(e) })
    }
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
    templateService.updateField(fieldId, patch).catch(() => {})
  },

  deleteField: async (sectionId, fieldId) => {
    const snapshot = get().fields[sectionId] ?? []
    set(state => ({
      fields: {
        ...state.fields,
        [sectionId]: (state.fields[sectionId] ?? []).filter(f => f.id !== fieldId),
      },
      isDirty: true,
    }))
    try {
      await templateService.deleteField(fieldId)
    } catch {
      set(state => ({
        fields: { ...state.fields, [sectionId]: snapshot },
      }))
    }
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
    templateService.reorderFields(sectionId, orderedIds).catch(() => {})
  },

  // ── Master fields ────────────────────────────────────────────────────────────

  loadMasterFields: async () => {
    try {
      const masterFields = await templateService.getMasterFields()
      set({ masterFields })
    } catch {}
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
