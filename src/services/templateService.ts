import { apiClient, MockInterceptError } from '../lib/apiClient'
import { API_ENDPOINTS } from '../constants/api'
import type {
  Template,
  TemplateVersion,
  TemplateSection,
  TemplateField,
  MasterField,
  FormType,
  FieldType,
} from '../types/template'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).substring(2, 11)
const now = () => new Date().toISOString()
const rnd = () => new Promise<void>(r => setTimeout(r, 300 + Math.random() * 200))

// ─── In-memory mock database ──────────────────────────────────────────────────
// TODO: Remove this block when real API is connected. Data will come from the server.

interface MockDB {
  templates: Template[]
  versions: TemplateVersion[]
  sections: TemplateSection[]
  fields: TemplateField[]
  masterFields: MasterField[]
}

const _db: MockDB = {
  templates: [],
  versions: [],
  sections: [],
  fields: [],
  masterFields: [
    {
      id: 'mf-001',
      name: 'Site conducted',
      field_type: 'text_answer',
      configuration: {},
      created_at: '2026-01-01T00:00:00Z',
    },
    {
      id: 'mf-002',
      name: 'Conducted on',
      field_type: 'inspection_date',
      configuration: {},
      created_at: '2026-01-01T00:00:00Z',
    },
    {
      id: 'mf-003',
      name: 'Prepared by',
      field_type: 'person',
      configuration: {},
      created_at: '2026-01-01T00:00:00Z',
    },
    {
      id: 'mf-004',
      name: 'Location',
      field_type: 'text_answer',
      configuration: {},
      created_at: '2026-01-01T00:00:00Z',
    },
    {
      id: 'mf-005',
      name: 'Signature',
      field_type: 'signature',
      configuration: {},
      created_at: '2026-01-01T00:00:00Z',
    },
  ],
}

// ─── Return types ─────────────────────────────────────────────────────────────

export interface CreateTemplateResult {
  template: Template
  version: TemplateVersion
  sections: TemplateSection[]
}

export interface TemplateWithVersion {
  template: Template
  version: TemplateVersion
  sections: TemplateSection[]
  fields: Record<string, TemplateField[]>
}

// ─── Mock template list seed ──────────────────────────────────────────────────
// TODO: Remove when real API is connected; data will come from GET /templates.

export interface TemplateListItem {
  id: string
  name: string
  description: string
  author: string
  questionCount: number
  lastModified: string
  modifiedDate: string
}

const MOCK_TEMPLATE_LIST: TemplateListItem[] = [
  {
    id: 'tpl-001',
    name: 'Kebersihan Dealer Standard',
    description: 'Pengecekan standar kebersihan area showroom dan ruang tunggu dealer.',
    author: 'Alex R.',
    questionCount: 21,
    lastModified: '27 Feb 2026',
    modifiedDate: '2026-02-27',
  },
  {
    id: 'tpl-002',
    name: 'Audit Fasilitas Bulanan',
    description: 'Checklist kondisi fasilitas dan kelayakan sarana operasional dealer.',
    author: 'Diana K.',
    questionCount: 18,
    lastModified: '4 Feb 2026',
    modifiedDate: '2026-02-04',
  },
  {
    id: 'tpl-003',
    name: 'Audit 5R Showroom (FY25)',
    description: 'Audit internal terkait 5R area display, service bay, dan gudang.',
    author: 'Ari Budi',
    questionCount: 20,
    lastModified: '4 Feb 2026',
    modifiedDate: '2026-02-04',
  },
]

export const templateService = {
  async getTemplates(): Promise<TemplateListItem[]> {
    try {
      const res = await apiClient.get<TemplateListItem[]>(API_ENDPOINTS.TEMPLATES.LIST)
      return res.data
    } catch (e) {
      if (e instanceof MockInterceptError) {
        await rnd()
        return [...MOCK_TEMPLATE_LIST]
      }
      throw e
    }
  },

  async createTemplate(formType: FormType): Promise<CreateTemplateResult> {
    try {
      const res = await apiClient.post<CreateTemplateResult>(
        API_ENDPOINTS.TEMPLATES.CREATE,
        { formType },
      )
      return res.data
    } catch (e) {
      if (e instanceof MockInterceptError) {
        await rnd()
        const t = now()
        const templateId = uid()
        const versionId = uid()
        const sectionId = uid()

        const template: Template = {
          id: templateId,
          org_id: 'org-gtech-001',
          title: '',
          description: '',
          form_type: formType,
          scoring_enabled: false,
          status: 'draft',
          created_at: t,
          updated_at: t,
        }
        const version: TemplateVersion = {
          id: versionId,
          template_id: templateId,
          version_number: 1,
          title: '',
          description: '',
          scoring_enabled: false,
          status: 'draft',
          published_at: null,
          created_by_id: 'user-mock',
          created_at: t,
        }
        const titlePage: TemplateSection = {
          id: sectionId,
          version_id: versionId,
          title: 'Title Page',
          description: 'First page of the inspection report.',
          order: 1,
          status: 'active',
          created_at: t,
        }

        _db.templates.push(template)
        _db.versions.push(version)
        _db.sections.push(titlePage)

        return { template, version, sections: [titlePage] }
      }
      throw e
    }
  },

  async getTemplateWithVersion(templateId: string): Promise<TemplateWithVersion> {
    try {
      const res = await apiClient.get<TemplateWithVersion>(
        API_ENDPOINTS.TEMPLATES.DETAIL(templateId),
      )
      return res.data
    } catch (e) {
      if (e instanceof MockInterceptError) {
        await rnd()
        const template = _db.templates.find(t => t.id === templateId)
        if (!template) throw new Error(`Template ${templateId} not found`)

        const version = _db.versions.find(v => v.template_id === templateId)
        if (!version) throw new Error(`Version for ${templateId} not found`)

        const sections = _db.sections
          .filter(s => s.version_id === version.id)
          .sort((a, b) => a.order - b.order)

        const fields: Record<string, TemplateField[]> = {}
        for (const section of sections) {
          fields[section.id] = _db.fields
            .filter(f => f.section_id === section.id)
            .sort((a, b) => a.order - b.order)
        }
        return { template, version, sections, fields }
      }
      throw e
    }
  },

  async updateTemplate(
    id: string,
    patch: Partial<Pick<Template, 'title' | 'description' | 'form_type' | 'scoring_enabled'>>,
  ): Promise<void> {
    try {
      await apiClient.put(API_ENDPOINTS.TEMPLATES.UPDATE(id), patch)
    } catch (e) {
      if (e instanceof MockInterceptError) {
        await rnd()
        const idx = _db.templates.findIndex(t => t.id === id)
        if (idx !== -1) {
          _db.templates[idx] = { ..._db.templates[idx], ...patch, updated_at: now() }
        }
        return
      }
      throw e
    }
  },

  async updateVersion(id: string, patch: Partial<TemplateVersion>): Promise<void> {
    try {
      await apiClient.put(API_ENDPOINTS.TEMPLATE_VERSIONS.UPDATE(id), patch)
    } catch (e) {
      if (e instanceof MockInterceptError) {
        await rnd()
        const idx = _db.versions.findIndex(v => v.id === id)
        if (idx !== -1) {
          _db.versions[idx] = { ..._db.versions[idx], ...patch }
        }
        return
      }
      throw e
    }
  },

  async createSection(
    versionId: string,
    data: Pick<TemplateSection, 'title' | 'description' | 'order'>,
  ): Promise<TemplateSection> {
    try {
      const res = await apiClient.post<TemplateSection>(
        API_ENDPOINTS.SECTIONS.CREATE(versionId),
        data,
      )
      return res.data
    } catch (e) {
      if (e instanceof MockInterceptError) {
        await rnd()
        const section: TemplateSection = {
          id: uid(),
          version_id: versionId,
          title: data.title,
          description: data.description,
          order: data.order,
          status: 'active',
          created_at: now(),
        }
        _db.sections.push(section)
        return section
      }
      throw e
    }
  },

  async updateSection(
    id: string,
    patch: Partial<Pick<TemplateSection, 'title' | 'description'>>,
  ): Promise<TemplateSection> {
    try {
      const res = await apiClient.put<TemplateSection>(
        API_ENDPOINTS.SECTIONS.UPDATE(id),
        patch,
      )
      return res.data
    } catch (e) {
      if (e instanceof MockInterceptError) {
        await rnd()
        const idx = _db.sections.findIndex(s => s.id === id)
        if (idx === -1) throw new Error(`Section ${id} not found`)
        _db.sections[idx] = { ..._db.sections[idx], ...patch }
        return _db.sections[idx]
      }
      throw e
    }
  },

  async deleteSection(id: string): Promise<void> {
    try {
      await apiClient.delete(API_ENDPOINTS.SECTIONS.DELETE(id))
    } catch (e) {
      if (e instanceof MockInterceptError) {
        await rnd()
        _db.sections = _db.sections.filter(s => s.id !== id)
        _db.fields = _db.fields.filter(f => f.section_id !== id)
        return
      }
      throw e
    }
  },

  async duplicateSection(id: string): Promise<{ section: TemplateSection; fields: TemplateField[] }> {
    try {
      const res = await apiClient.post<{ section: TemplateSection; fields: TemplateField[] }>(
        API_ENDPOINTS.SECTIONS.DUPLICATE(id),
      )
      return res.data
    } catch (e) {
      if (e instanceof MockInterceptError) {
        await rnd()
        const src = _db.sections.find(s => s.id === id)
        if (!src) throw new Error(`Section ${id} not found`)

        const newSectionId = uid()
        const maxOrder = Math.max(
          ..._db.sections.filter(s => s.version_id === src.version_id).map(s => s.order),
          0,
        )
        const section: TemplateSection = {
          ...src,
          id: newSectionId,
          title: `${src.title} (copy)`,
          order: maxOrder + 1,
          created_at: now(),
        }
        const srcFields = _db.fields.filter(f => f.section_id === id)
        const newFields: TemplateField[] = srcFields.map(f => ({
          ...f,
          id: uid(),
          section_id: newSectionId,
        }))

        _db.sections.push(section)
        _db.fields.push(...newFields)
        return { section, fields: newFields }
      }
      throw e
    }
  },

  async reorderSections(versionId: string, orderedIds: string[]): Promise<void> {
    try {
      await apiClient.put(API_ENDPOINTS.SECTIONS.REORDER(versionId), { orderedIds })
    } catch (e) {
      if (e instanceof MockInterceptError) {
        await rnd()
        orderedIds.forEach((id, idx) => {
          const i = _db.sections.findIndex(s => s.id === id && s.version_id === versionId)
          if (i !== -1) _db.sections[i].order = idx + 1
        })
        return
      }
      throw e
    }
  },

  async createField(sectionId: string, type: FieldType): Promise<TemplateField> {
    try {
      const res = await apiClient.post<TemplateField>(
        API_ENDPOINTS.FIELDS.CREATE(sectionId),
        { type },
      )
      return res.data
    } catch (e) {
      if (e instanceof MockInterceptError) {
        await rnd()
        const existing = _db.fields.filter(f => f.section_id === sectionId)
        const field: TemplateField = {
          id: uid(),
          section_id: sectionId,
          master_field_id: null,
          label: 'Question',
          type,
          required: false,
          order: existing.length + 1,
          logic_rules: null,
        }
        _db.fields.push(field)
        return field
      }
      throw e
    }
  },

  async updateField(id: string, patch: Partial<TemplateField>): Promise<TemplateField> {
    try {
      const res = await apiClient.put<TemplateField>(
        API_ENDPOINTS.FIELDS.UPDATE(id),
        patch,
      )
      return res.data
    } catch (e) {
      if (e instanceof MockInterceptError) {
        await rnd()
        const idx = _db.fields.findIndex(f => f.id === id)
        if (idx === -1) throw new Error(`Field ${id} not found`)
        _db.fields[idx] = { ..._db.fields[idx], ...patch }
        return _db.fields[idx]
      }
      throw e
    }
  },

  async deleteField(id: string): Promise<void> {
    try {
      await apiClient.delete(API_ENDPOINTS.FIELDS.DELETE(id))
    } catch (e) {
      if (e instanceof MockInterceptError) {
        await rnd()
        _db.fields = _db.fields.filter(f => f.id !== id)
        return
      }
      throw e
    }
  },

  async reorderFields(sectionId: string, orderedIds: string[]): Promise<void> {
    try {
      await apiClient.put(API_ENDPOINTS.FIELDS.REORDER(sectionId), { orderedIds })
    } catch (e) {
      if (e instanceof MockInterceptError) {
        await rnd()
        orderedIds.forEach((id, idx) => {
          const i = _db.fields.findIndex(f => f.id === id && f.section_id === sectionId)
          if (i !== -1) _db.fields[i].order = idx + 1
        })
        return
      }
      throw e
    }
  },

  async getMasterFields(): Promise<MasterField[]> {
    try {
      const res = await apiClient.get<MasterField[]>(API_ENDPOINTS.MASTER_FIELDS.LIST)
      return res.data
    } catch (e) {
      if (e instanceof MockInterceptError) {
        await new Promise<void>(r => setTimeout(r, 200))
        return [..._db.masterFields]
      }
      throw e
    }
  },

  async createFieldFromMaster(sectionId: string, masterFieldId: string): Promise<TemplateField> {
    try {
      const res = await apiClient.post<TemplateField>(
        API_ENDPOINTS.MASTER_FIELDS.CREATE_FROM_MASTER(sectionId),
        { masterFieldId },
      )
      return res.data
    } catch (e) {
      if (e instanceof MockInterceptError) {
        await rnd()
        const master = _db.masterFields.find(m => m.id === masterFieldId)
        if (!master) throw new Error(`MasterField ${masterFieldId} not found`)

        const existing = _db.fields.filter(f => f.section_id === sectionId)
        const field: TemplateField = {
          id: uid(),
          section_id: sectionId,
          master_field_id: masterFieldId,
          label: master.name,
          type: master.field_type,
          required: false,
          order: existing.length + 1,
          logic_rules: null,
        }
        _db.fields.push(field)
        return field
      }
      throw e
    }
  },
}
