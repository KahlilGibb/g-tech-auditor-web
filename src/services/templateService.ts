import { apiClient, MockInterceptError } from '../lib/apiClient'
import { API_ENDPOINTS } from '../constants/api'
import { toRecord, toStringValue, unwrapData, unwrapList } from '../lib/apiResponse'
import type {
  Template,
  TemplateVersion,
  TemplateSection,
  TemplateField,
  FieldOption,
  MasterField,
  FormType,
  FieldType,
} from '../types/template'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).substring(2, 11)
const now = () => new Date().toISOString()
const rnd = () => new Promise<void>(r => setTimeout(r, 300 + Math.random() * 200))

function toNumberValue(value: unknown, fallback = 0) {
  if (typeof value === 'number') return value
  if (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))) {
    return Number(value)
  }
  return fallback
}

function toBooleanValue(value: unknown, fallback = false) {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  if (typeof value === 'string') return ['true', '1', 'yes', 'active'].includes(value.toLowerCase())
  return fallback
}

function toArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function normalizeStatus(value: unknown): Template['status'] {
  const status = toStringValue(value, 'draft')
  if (status === 'published' || status === 'archived') return status
  return 'draft'
}

function normalizeFormType(value: unknown): FormType {
  return toStringValue(value) === 'cps' ? 'cps' : 'inspection'
}

function normalizeFieldType(value: unknown): FieldType {
  const type = toStringValue(value, 'text_answer')
  const map: Record<string, FieldType> = {
    text: 'text_answer',
    text_answer: 'text_answer',
    multiple_choice: 'multiple_choice',
    pass_fail: 'pass_fail',
    datetime: 'inspection_date',
    date: 'inspection_date',
    inspection_date: 'inspection_date',
    media: 'photo',
    photo: 'photo',
  }
  return map[type] ?? (type as FieldType)
}

function apiFieldType(type: FieldType) {
  const map: Partial<Record<FieldType, string>> = {
    text_answer: 'text',
    pass_fail: 'multiple_choice',
    dropdown: 'multiple_choice',
    inspection_date: 'datetime',
    person: 'text',
    photo: 'media',
  }
  return map[type] ?? type
}

function normalizeFieldOption(raw: unknown, fieldId: string): FieldOption {
  const record = toRecord(raw)
  return {
    id: toStringValue(record.id || record.option_id || record.master_field_option_id) || uid(),
    field_id: toStringValue(record.field_id || record.fieldId) || fieldId,
    label: toStringValue(record.label),
    value: toStringValue(record.value) || toStringValue(record.label).toLowerCase().replace(/\s+/g, '_'),
    score_value: toNumberValue(record.score_value || record.scoreValue),
  }
}

function normalizeTemplate(raw: unknown): Template {
  const record = toRecord(raw)
  const t = now()
  return {
    id: toStringValue(record.id || record.template_id) || uid(),
    org_id: toStringValue(record.org_id || record.orgId) || 'org-gtech-001',
    title: toStringValue(record.title || record.name),
    description: toStringValue(record.description),
    form_type: normalizeFormType(record.form_type || record.formType || record.type),
    scoring_enabled: toBooleanValue(record.scoring_enabled || record.scoringEnabled),
    status: normalizeStatus(record.status),
    created_at: toStringValue(record.created_at || record.createdAt) || t,
    updated_at: toStringValue(record.updated_at || record.updatedAt) || t,
  }
}

function normalizeVersion(raw: unknown, template: Template): TemplateVersion {
  const record = toRecord(raw)
  return {
    id: toStringValue(record.id || record.version_id) || uid(),
    template_id: toStringValue(record.template_id || record.templateId) || template.id,
    version_number: toNumberValue(record.version_number || record.versionNumber, 1),
    title: toStringValue(record.title) || template.title,
    description: toStringValue(record.description) || template.description,
    scoring_enabled: toBooleanValue(record.scoring_enabled || record.scoringEnabled, template.scoring_enabled),
    status: normalizeStatus(record.status || template.status),
    published_at: toStringValue(record.published_at || record.publishedAt) || null,
    created_by_id: toStringValue(record.created_by_id || record.createdById) || 'system',
    created_at: toStringValue(record.created_at || record.createdAt) || template.created_at,
  }
}

function normalizeSection(raw: unknown, version: TemplateVersion): TemplateSection {
  const record = toRecord(raw)
  return {
    id: toStringValue(record.id || record.page_id || record.section_id) || uid(),
    version_id: toStringValue(record.version_id || record.versionId) || version.id,
    title: toStringValue(record.title || record.name) || 'Untitled Page',
    description: toStringValue(record.description),
    order: toNumberValue(record.order || record.page_order || record.pageOrder, 1),
    status: toStringValue(record.status, 'active') === 'inactive' ? 'inactive' : 'active',
    created_at: toStringValue(record.created_at || record.createdAt) || now(),
  }
}

function normalizeField(raw: unknown, section: TemplateSection): TemplateField {
  const record = toRecord(raw)
  const fieldId = toStringValue(record.id || record.field_id) || uid()
  return {
    id: fieldId,
    section_id:
      toStringValue(record.section_id || record.sectionId || record.page_id || record.pageId) ||
      section.id,
    master_field_id:
      toStringValue(record.master_field_id || record.masterFieldId) || null,
    label: toStringValue(record.label || record.name) || 'Question',
    type: normalizeFieldType(record.type || record.field_type || record.fieldType),
    required: toBooleanValue(record.required),
    order: toNumberValue(record.order || record.field_order || record.fieldOrder, 1),
    logic_rules: Array.isArray(record.logic_rules) ? record.logic_rules as TemplateField['logic_rules'] : null,
    options: toArray(record.options).map(option => normalizeFieldOption(option, fieldId)),
  }
}

function dataRecord(payload: unknown) {
  return toRecord(unwrapData(payload))
}

function nestedRecord(record: Record<string, unknown>, key: string) {
  return toRecord(record[key])
}

function extractTemplateRecord(payload: unknown) {
  const data = dataRecord(payload)
  return Object.keys(nestedRecord(data, 'template')).length ? nestedRecord(data, 'template') : data
}

function extractVersionRecord(payload: unknown) {
  const data = dataRecord(payload)
  if (Object.keys(nestedRecord(data, 'version')).length) return nestedRecord(data, 'version')
  if (Object.keys(nestedRecord(data, 'current_version')).length) return nestedRecord(data, 'current_version')
  if (Object.keys(nestedRecord(data, 'latest_version')).length) return nestedRecord(data, 'latest_version')
  return data
}

function extractPages(payload: unknown) {
  const data = dataRecord(payload)
  const version = extractVersionRecord(payload)
  const template = extractTemplateRecord(payload)
  return (
    toArray(data.pages).length ? toArray(data.pages) :
    toArray(data.sections).length ? toArray(data.sections) :
    toArray(version.pages).length ? toArray(version.pages) :
    toArray(version.sections).length ? toArray(version.sections) :
    toArray(template.pages).length ? toArray(template.pages) :
    toArray(template.sections)
  )
}

function normalizeTemplateTree(payload: unknown, fallbackTemplateId?: string): TemplateWithVersion {
  const template = normalizeTemplate({
    ...extractTemplateRecord(payload),
    id: toStringValue(extractTemplateRecord(payload).id) || fallbackTemplateId,
  })
  const version = normalizeVersion(extractVersionRecord(payload), template)
  const rawPages = extractPages(payload)
  const sections = rawPages.length
    ? rawPages.map(page => normalizeSection(page, version)).sort((a, b) => a.order - b.order)
    : [{
        id: uid(),
        version_id: version.id,
        title: 'Title Page',
        description: 'First page of the inspection report.',
        order: 1,
        status: 'active' as const,
        created_at: now(),
      }]

  const fields: Record<string, TemplateField[]> = {}
  sections.forEach((section, index) => {
    const pageRecord = toRecord(rawPages[index])
    fields[section.id] = toArray(pageRecord.fields)
      .map(field => normalizeField(field, section))
      .sort((a, b) => a.order - b.order)
  })

  return { template, version, sections, fields }
}

function defaultBuildPages() {
  return [
    {
      title: 'Title Page',
      description: 'First page of the inspection report.',
      order: 1,
      fields: [],
    },
  ]
}

function defaultPassFailOptions(fieldId: string): FieldOption[] {
  return [
    { id: `${fieldId}-pass`, field_id: fieldId, label: 'Pass', value: 'pass', score_value: 1 },
    { id: `${fieldId}-fail`, field_id: fieldId, label: 'Fail', value: 'fail', score_value: 0 },
  ]
}

function fieldPayload(field: TemplateField) {
  const options = field.options?.length
    ? field.options
    : field.type === 'pass_fail'
      ? defaultPassFailOptions(field.id)
      : []

  return {
    label: field.label,
    type: apiFieldType(field.type),
    required: field.required,
    order: field.order,
    master_field_id: field.master_field_id,
    options: options.map(option => ({
      label: option.label,
      value: option.value,
      score_value: option.score_value,
    })),
  }
}

function templateBuildPayload(
  template: Template,
  sections: TemplateSection[],
  fields: Record<string, TemplateField[]>,
) {
  return {
    type: template.form_type,
    title: template.title || 'Untitled Template',
    description: template.description || '',
    scoring_enabled: template.scoring_enabled,
    pages: sections
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((section, index) => ({
        title: section.title || 'Untitled Page',
        description: section.description || '',
        order: index + 1,
        fields: (fields[section.id] ?? [])
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((field, fieldIndex) => fieldPayload({ ...field, order: fieldIndex + 1 })),
      })),
  }
}

function templateListItem(raw: unknown): TemplateListItem {
  const record = toRecord(raw)
  const pages = toArray(record.pages || record.sections)
  const questionCount =
    toNumberValue(record.question_count || record.questionCount || record.fields_count || record.fieldsCount) ||
    pages.reduce<number>((total, page) => total + toArray(toRecord(page).fields).length, 0)

  return {
    id: toStringValue(record.id || record.template_id) || uid(),
    name: toStringValue(record.name || record.title) || 'Untitled Template',
    description: toStringValue(record.description),
    author:
      toStringValue(record.author || record.created_by_name || record.createdByName) ||
      'System',
    questionCount,
    lastModified:
      toStringValue(record.last_modified || record.lastModified || record.updated_at || record.updatedAt) ||
      '-',
    modifiedDate:
      toStringValue(record.modified_date || record.modifiedDate || record.updated_at || record.updatedAt) ||
      '',
  }
}

// ─── In-memory mock database ──────────────────────────────────────────────────
// TODO: Remove this block when real API is connected. Data will come from the server.

interface MockDB {
  templates: Template[]
  versions: TemplateVersion[]
  sections: TemplateSection[]
  fields: TemplateField[]
  masterFields: MasterField[]
}

// ─── Seed data for existing mock templates ────────────────────────────────────

const SEED_TEMPLATES: Template[] = [
  { id: 'tpl-001', org_id: 'org-gtech-001', title: 'Kebersihan Dealer Standard', description: 'Pengecekan standar kebersihan area showroom dan ruang tunggu dealer.', form_type: 'inspection', scoring_enabled: true, status: 'published', created_at: '2026-02-01T00:00:00Z', updated_at: '2026-02-27T00:00:00Z' },
  { id: 'tpl-002', org_id: 'org-gtech-001', title: 'Audit Fasilitas Bulanan', description: 'Checklist kondisi fasilitas dan kelayakan sarana operasional dealer.', form_type: 'inspection', scoring_enabled: false, status: 'published', created_at: '2026-01-15T00:00:00Z', updated_at: '2026-02-04T00:00:00Z' },
  { id: 'tpl-003', org_id: 'org-gtech-001', title: 'Audit 5R Showroom (FY25)', description: 'Audit internal terkait 5R area display, service bay, dan gudang.', form_type: 'cps', scoring_enabled: true, status: 'draft', created_at: '2026-01-10T00:00:00Z', updated_at: '2026-02-04T00:00:00Z' },
]

const SEED_VERSIONS: TemplateVersion[] = [
  { id: 'ver-001', template_id: 'tpl-001', version_number: 1, title: 'Kebersihan Dealer Standard', description: '', scoring_enabled: true, status: 'published', published_at: '2026-02-27T00:00:00Z', created_by_id: 'user-mock', created_at: '2026-02-01T00:00:00Z' },
  { id: 'ver-002', template_id: 'tpl-002', version_number: 1, title: 'Audit Fasilitas Bulanan', description: '', scoring_enabled: false, status: 'published', published_at: '2026-02-04T00:00:00Z', created_by_id: 'user-mock', created_at: '2026-01-15T00:00:00Z' },
  { id: 'ver-003', template_id: 'tpl-003', version_number: 1, title: 'Audit 5R Showroom (FY25)', description: '', scoring_enabled: true, status: 'draft', published_at: null, created_by_id: 'user-mock', created_at: '2026-01-10T00:00:00Z' },
]

const SEED_SECTIONS: TemplateSection[] = [
  // tpl-001 sections
  { id: 'sec-001-1', version_id: 'ver-001', title: 'Title Page', description: 'Halaman judul inspeksi.', order: 1, status: 'active', created_at: '2026-02-01T00:00:00Z' },
  { id: 'sec-001-2', version_id: 'ver-001', title: 'Area Parkir', description: 'Pengecekan kebersihan dan kerapian area parkir.', order: 2, status: 'active', created_at: '2026-02-01T00:00:00Z' },
  { id: 'sec-001-3', version_id: 'ver-001', title: 'Eksterior & Fasad', description: 'Kondisi eksterior dan tampilan luar bangunan dealer.', order: 3, status: 'active', created_at: '2026-02-01T00:00:00Z' },
  { id: 'sec-001-4', version_id: 'ver-001', title: 'Area Resepsi', description: 'Kebersihan dan kerapian meja resepsi serta seragam staff.', order: 4, status: 'active', created_at: '2026-02-01T00:00:00Z' },
  // tpl-002 sections
  { id: 'sec-002-1', version_id: 'ver-002', title: 'Title Page', description: 'Halaman judul audit.', order: 1, status: 'active', created_at: '2026-01-15T00:00:00Z' },
  { id: 'sec-002-2', version_id: 'ver-002', title: 'Fasilitas Umum', description: 'Kondisi fasilitas umum dealer.', order: 2, status: 'active', created_at: '2026-01-15T00:00:00Z' },
  { id: 'sec-002-3', version_id: 'ver-002', title: 'Toilet & Sanitasi', description: 'Kebersihan dan kelengkapan toilet.', order: 3, status: 'active', created_at: '2026-01-15T00:00:00Z' },
  // tpl-003 sections
  { id: 'sec-003-1', version_id: 'ver-003', title: 'Title Page', description: 'Halaman judul 5R.', order: 1, status: 'active', created_at: '2026-01-10T00:00:00Z' },
  { id: 'sec-003-2', version_id: 'ver-003', title: 'Ringkas (Seiri)', description: 'Pemisahan barang yang dibutuhkan dan tidak dibutuhkan.', order: 2, status: 'active', created_at: '2026-01-10T00:00:00Z' },
  { id: 'sec-003-3', version_id: 'ver-003', title: 'Rapi (Seiton)', description: 'Penataan dan penempatan barang secara teratur.', order: 3, status: 'active', created_at: '2026-01-10T00:00:00Z' },
]

const SEED_FIELDS: TemplateField[] = [
  // sec-001-1 (Title Page tpl-001)
  { id: 'f-001-1-1', section_id: 'sec-001-1', master_field_id: null, label: 'Nama Auditor', type: 'person', required: true, order: 1, logic_rules: null },
  { id: 'f-001-1-2', section_id: 'sec-001-1', master_field_id: null, label: 'Tanggal Inspeksi', type: 'inspection_date', required: true, order: 2, logic_rules: null },
  { id: 'f-001-1-3', section_id: 'sec-001-1', master_field_id: null, label: 'Nama Dealer', type: 'text_answer', required: true, order: 3, logic_rules: null },
  // sec-001-2 (Area Parkir)
  { id: 'f-001-2-1', section_id: 'sec-001-2', master_field_id: null, label: 'Kebersihan area parkir', type: 'pass_fail', required: true, order: 1, logic_rules: null },
  { id: 'f-001-2-2', section_id: 'sec-001-2', master_field_id: null, label: 'Marka parkir terlihat jelas', type: 'pass_fail', required: true, order: 2, logic_rules: null },
  { id: 'f-001-2-3', section_id: 'sec-001-2', master_field_id: null, label: 'Pencahayaan memadai', type: 'pass_fail', required: false, order: 3, logic_rules: null },
  { id: 'f-001-2-4', section_id: 'sec-001-2', master_field_id: null, label: 'Catatan tambahan', type: 'text_answer', required: false, order: 4, logic_rules: null },
  // sec-001-3 (Eksterior)
  { id: 'f-001-3-1', section_id: 'sec-001-3', master_field_id: null, label: 'Kondisi fasad bangunan', type: 'pass_fail', required: true, order: 1, logic_rules: null },
  { id: 'f-001-3-2', section_id: 'sec-001-3', master_field_id: null, label: 'Signage dealer terlihat jelas', type: 'pass_fail', required: true, order: 2, logic_rules: null },
  { id: 'f-001-3-3', section_id: 'sec-001-3', master_field_id: null, label: 'Foto eksterior', type: 'photo', required: false, order: 3, logic_rules: null },
  // sec-001-4 (Resepsi)
  { id: 'f-001-4-1', section_id: 'sec-001-4', master_field_id: null, label: 'Kebersihan meja resepsi', type: 'pass_fail', required: true, order: 1, logic_rules: null },
  { id: 'f-001-4-2', section_id: 'sec-001-4', master_field_id: null, label: 'Seragam staff lengkap & rapi', type: 'pass_fail', required: true, order: 2, logic_rules: null },
  { id: 'f-001-4-3', section_id: 'sec-001-4', master_field_id: null, label: 'Ketersediaan brosur/katalog', type: 'pass_fail', required: false, order: 3, logic_rules: null },
  // sec-002-1 (Title Page tpl-002)
  { id: 'f-002-1-1', section_id: 'sec-002-1', master_field_id: null, label: 'Auditor', type: 'person', required: true, order: 1, logic_rules: null },
  { id: 'f-002-1-2', section_id: 'sec-002-1', master_field_id: null, label: 'Tanggal Audit', type: 'inspection_date', required: true, order: 2, logic_rules: null },
  // sec-002-2 (Fasilitas Umum)
  { id: 'f-002-2-1', section_id: 'sec-002-2', master_field_id: null, label: 'AC berfungsi baik', type: 'pass_fail', required: true, order: 1, logic_rules: null },
  { id: 'f-002-2-2', section_id: 'sec-002-2', master_field_id: null, label: 'Pencahayaan ruangan memadai', type: 'pass_fail', required: true, order: 2, logic_rules: null },
  { id: 'f-002-2-3', section_id: 'sec-002-2', master_field_id: null, label: 'CCTV aktif & terawat', type: 'pass_fail', required: false, order: 3, logic_rules: null },
  // sec-002-3 (Toilet)
  { id: 'f-002-3-1', section_id: 'sec-002-3', master_field_id: null, label: 'Toilet bersih', type: 'pass_fail', required: true, order: 1, logic_rules: null },
  { id: 'f-002-3-2', section_id: 'sec-002-3', master_field_id: null, label: 'Sabun & tissue tersedia', type: 'pass_fail', required: true, order: 2, logic_rules: null },
  // sec-003-1 (Title Page tpl-003)
  { id: 'f-003-1-1', section_id: 'sec-003-1', master_field_id: null, label: 'Auditor 5R', type: 'person', required: true, order: 1, logic_rules: null },
  { id: 'f-003-1-2', section_id: 'sec-003-1', master_field_id: null, label: 'Tanggal Audit', type: 'inspection_date', required: true, order: 2, logic_rules: null },
  // sec-003-2 (Ringkas)
  { id: 'f-003-2-1', section_id: 'sec-003-2', master_field_id: null, label: 'Barang tidak perlu sudah disingkirkan', type: 'pass_fail', required: true, order: 1, logic_rules: null },
  { id: 'f-003-2-2', section_id: 'sec-003-2', master_field_id: null, label: 'Label merah pada barang tidak diperlukan', type: 'pass_fail', required: false, order: 2, logic_rules: null },
  // sec-003-3 (Rapi)
  { id: 'f-003-3-1', section_id: 'sec-003-3', master_field_id: null, label: 'Setiap barang punya tempat tetap', type: 'pass_fail', required: true, order: 1, logic_rules: null },
  { id: 'f-003-3-2', section_id: 'sec-003-3', master_field_id: null, label: 'Label/tanda posisi barang terpasang', type: 'pass_fail', required: true, order: 2, logic_rules: null },
]

const _db: MockDB = {
  templates: [...SEED_TEMPLATES],
  versions: [...SEED_VERSIONS],
  sections: [...SEED_SECTIONS],
  fields: [...SEED_FIELDS],
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
      const res = await apiClient.get(API_ENDPOINTS.TEMPLATES.LIST, {
        params: { page: 1, limit: 50 },
      })
      return unwrapList<unknown>(res.data).map(templateListItem)
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
      const res = await apiClient.post(
        API_ENDPOINTS.TEMPLATES.BUILD,
        {
          type: formType,
          title: 'Untitled Template',
          description: '',
          scoring_enabled: false,
          pages: defaultBuildPages(),
        },
      )
      const { template, version, sections } = normalizeTemplateTree(res.data)
      return { template, version, sections }
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
      const detail = await apiClient.get(API_ENDPOINTS.TEMPLATES.DETAIL(templateId))
      const detailTree = normalizeTemplateTree(detail.data, templateId)

      if (detailTree.sections.length > 1 || Object.values(detailTree.fields).some(items => items.length > 0)) {
        return detailTree
      }

      const versions = await apiClient.get(API_ENDPOINTS.TEMPLATES.VERSIONS(templateId))
      const versionItems = unwrapList<unknown>(versions.data)
      const selectedVersion =
        versionItems.find(item => toStringValue(toRecord(item).status) === 'draft') ??
        versionItems[0]

      if (!selectedVersion) return detailTree

      const version = normalizeVersion(selectedVersion, detailTree.template)
      const fullTree = await apiClient.get(API_ENDPOINTS.TEMPLATES.VERSION_DETAIL(templateId, version.id))
      return normalizeTemplateTree({
        ...dataRecord(fullTree.data),
        template: detailTree.template,
        version,
      }, templateId)
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
      await apiClient.put(API_ENDPOINTS.TEMPLATES.UPDATE(id), {
        title: patch.title,
        description: patch.description,
        type: patch.form_type,
        scoring_enabled: patch.scoring_enabled,
      })
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

  async saveTemplateTree(
    template: Template,
    sections: TemplateSection[],
    fields: Record<string, TemplateField[]>,
  ): Promise<TemplateWithVersion> {
    try {
      const res = await apiClient.put(
        API_ENDPOINTS.TEMPLATES.UPDATE_BUILD(template.id),
        templateBuildPayload(template, sections, fields),
      )
      return normalizeTemplateTree(res.data, template.id)
    } catch (e) {
      if (e instanceof MockInterceptError) {
        await rnd()
        const templateIndex = _db.templates.findIndex(item => item.id === template.id)
        if (templateIndex !== -1) {
          _db.templates[templateIndex] = { ...template, updated_at: now() }
        }

        _db.sections = _db.sections.filter(section => section.version_id !== sections[0]?.version_id)
        _db.fields = _db.fields.filter(field => !sections.some(section => field.section_id === section.id))
        _db.sections.push(...sections)
        _db.fields.push(...Object.values(fields).flat())

        const version = _db.versions.find(item => item.template_id === template.id) ?? {
          id: uid(),
          template_id: template.id,
          version_number: 1,
          title: template.title,
          description: template.description,
          scoring_enabled: template.scoring_enabled,
          status: 'draft' as const,
          published_at: null,
          created_by_id: 'user-mock',
          created_at: now(),
        }
        if (!_db.versions.some(item => item.id === version.id)) _db.versions.push(version)

        return { template: { ...template, updated_at: now() }, version, sections, fields }
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
      const res = await apiClient.get(API_ENDPOINTS.MASTER_FIELDS.LIST, {
        params: { page: 1, limit: 50 },
      })
      return unwrapList<unknown>(res.data).map(item => {
        const record = toRecord(item)
        return {
          id: toStringValue(record.id || record.master_field_id) || uid(),
          name: toStringValue(record.name || record.label) || 'Master field',
          field_type: normalizeFieldType(record.field_type || record.fieldType || record.type),
          configuration: toRecord(record.configuration || record.config),
          created_at: toStringValue(record.created_at || record.createdAt) || now(),
          options: toArray(record.options).map(option => {
            const optionRecord = toRecord(option)
            return {
              id: toStringValue(optionRecord.id || optionRecord.master_field_option_id) || uid(),
              master_field_id:
                toStringValue(optionRecord.master_field_id || optionRecord.masterFieldId) ||
                toStringValue(record.id || record.master_field_id) ||
                '',
              label: toStringValue(optionRecord.label),
              value: toStringValue(optionRecord.value),
              score_value: toNumberValue(optionRecord.score_value || optionRecord.scoreValue),
            }
          }),
        }
      })
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
