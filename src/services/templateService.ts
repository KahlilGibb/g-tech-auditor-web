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
  MasterFieldOption,
  FormType,
  FieldType,
  Trigger,
  LogicRule,
  LogicAction,
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

function ruleActionToTrigger(action: LogicAction): Trigger {
  const id = `trigger-${Math.random().toString(36).substring(2, 11)}`
  return { id, ...action } as Trigger
}

function rulesToOptionTriggers(
  rules: LogicRule[] | undefined,
  options: FieldOption[] | undefined,
): FieldOption[] | undefined {
  if (!options) return options
  return options.map(opt => {
    const rule = rules?.find(r => r.when_value === opt.value)
    return rule
      ? { ...opt, triggers: rule.actions.map(ruleActionToTrigger) }
      : opt
  })
}

const triggerToAction = (trigger: Trigger): LogicAction => {
  if (trigger.type === 'notify') {
    return {
      type: 'notify',
      notify_user_ids: trigger.notify_user_ids,
      notify_group_ids: trigger.notify_group_ids,
      message: trigger.message,
      priority: trigger.priority ?? 0,
    }
  }
  return {
    type: 'create_action',
    action_title: trigger.action_title,
    action_priority: trigger.action_priority,
    assignee_ids: trigger.assignee_ids,
  }
}

export const optionsToRules = (options: FieldOption[] = []): LogicRule[] => {
  return options
    .filter(o => (o.triggers?.length ?? 0) > 0)
    .map(o => ({
      when_value: o.value,
      actions: o.triggers!.map(triggerToAction),
    }))
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
  const masterField = toRecord(record.master_field || record.masterField)
  const rawRules = record.rules || record.logic_rules
  const rules = Array.isArray(rawRules) ? (rawRules as LogicRule[]) : null
  const rawOptions = toArray(record.options || masterField.options)
  const options = rawOptions.map(option => normalizeFieldOption(option, fieldId))
  const config = toRecord(record.config || record.configuration || masterField.config || masterField.configuration)

  return {
    id: fieldId,
    section_id:
      toStringValue(record.section_id || record.sectionId || record.page_id || record.pageId) ||
      section.id,
    master_field_id:
      toStringValue(record.master_field_id || record.masterFieldId) || null,
    label: toStringValue(record.label || record.name || masterField.label || masterField.name) || 'Question',
    type: normalizeFieldType(record.type || record.field_type || record.fieldType || masterField.type || masterField.field_type || masterField.fieldType),
    required: toBooleanValue(record.required),
    order: toNumberValue(record.order || record.field_order || record.fieldOrder || record.ord, 1),
    rules,
    options: rulesToOptionTriggers(rules || undefined, options),
    config: Object.keys(config).length > 0 ? config : undefined,
  }
}

function normalizeMasterFieldOption(raw: unknown, masterFieldId: string): MasterFieldOption {
  const record = toRecord(raw)
  return {
    id: toStringValue(record.id || record.option_id || record.master_field_option_id) || uid(),
    master_field_id:
      toStringValue(record.master_field_id || record.masterFieldId) ||
      masterFieldId,
    label: toStringValue(record.label),
    value: toStringValue(record.value) || toStringValue(record.label).toLowerCase().replace(/\s+/g, '_'),
    score_value: toNumberValue(record.score_value || record.scoreValue),
  }
}

function normalizeMasterField(raw: unknown): MasterField {
  const record = toRecord(raw)
  const id = toStringValue(record.id || record.master_field_id) || uid()
  return {
    id,
    name: toStringValue(record.name || record.label) || 'Master field',
    field_type: normalizeFieldType(record.field_type || record.fieldType || record.type),
    configuration: toRecord(record.configuration || record.config),
    created_at: toStringValue(record.created_at || record.createdAt) || now(),
    options: toArray(record.options).map(option => normalizeMasterFieldOption(option, id)),
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
  if (field.master_field_id) {
    return {
      master_field_id: field.master_field_id,
      required: field.required,
      order: field.order,
    }
  }

  const options = field.options?.length
    ? field.options
    : field.type === 'pass_fail'
      ? defaultPassFailOptions(field.id)
      : []

  const rules = optionsToRules(options)

  return {
    label: field.label,
    type: apiFieldType(field.type),
    required: field.required,
    order: field.order,
    options: options.map(option => ({
      label: option.label,
      value: option.value,
      score_value: option.score_value,
    })),
    rules: rules.length > 0 ? rules : undefined,
    config: field.config,
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
  trashedTemplates: Template[]
  trashedMasterFields: MasterField[]
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
  { id: 'f-001-1-1', section_id: 'sec-001-1', master_field_id: null, label: 'Nama Auditor', type: 'person', required: true, order: 1, rules: null },
  { id: 'f-001-1-2', section_id: 'sec-001-1', master_field_id: null, label: 'Tanggal Inspeksi', type: 'inspection_date', required: true, order: 2, rules: null },
  { id: 'f-001-1-3', section_id: 'sec-001-1', master_field_id: null, label: 'Nama Dealer', type: 'text_answer', required: true, order: 3, rules: null },
  // sec-001-2 (Area Parkir)
  { id: 'f-001-2-1', section_id: 'sec-001-2', master_field_id: null, label: 'Kebersihan area parkir', type: 'pass_fail', required: true, order: 1, rules: null },
  { id: 'f-001-2-2', section_id: 'sec-001-2', master_field_id: null, label: 'Marka parkir terlihat jelas', type: 'pass_fail', required: true, order: 2, rules: null },
  { id: 'f-001-2-3', section_id: 'sec-001-2', master_field_id: null, label: 'Pencahayaan memadai', type: 'pass_fail', required: false, order: 3, rules: null },
  { id: 'f-001-2-4', section_id: 'sec-001-2', master_field_id: null, label: 'Catatan tambahan', type: 'text_answer', required: false, order: 4, rules: null },
  // sec-001-3 (Eksterior)
  { id: 'f-001-3-1', section_id: 'sec-001-3', master_field_id: null, label: 'Kondisi fasad bangunan', type: 'pass_fail', required: true, order: 1, rules: null },
  { id: 'f-001-3-2', section_id: 'sec-001-3', master_field_id: null, label: 'Signage dealer terlihat jelas', type: 'pass_fail', required: true, order: 2, rules: null },
  { id: 'f-001-3-3', section_id: 'sec-001-3', master_field_id: null, label: 'Foto eksterior', type: 'photo', required: false, order: 3, rules: null },
  // sec-001-4 (Resepsi)
  { id: 'f-001-4-1', section_id: 'sec-001-4', master_field_id: null, label: 'Kebersihan meja resepsi', type: 'pass_fail', required: true, order: 1, rules: null },
  { id: 'f-001-4-2', section_id: 'sec-001-4', master_field_id: null, label: 'Seragam staff lengkap & rapi', type: 'pass_fail', required: true, order: 2, rules: null },
  { id: 'f-001-4-3', section_id: 'sec-001-4', master_field_id: null, label: 'Ketersediaan brosur/katalog', type: 'pass_fail', required: false, order: 3, rules: null },
  // sec-002-1 (Title Page tpl-002)
  { id: 'f-002-1-1', section_id: 'sec-002-1', master_field_id: null, label: 'Auditor', type: 'person', required: true, order: 1, rules: null },
  { id: 'f-002-1-2', section_id: 'sec-002-1', master_field_id: null, label: 'Tanggal Audit', type: 'inspection_date', required: true, order: 2, rules: null },
  // sec-002-2 (Fasilitas Umum)
  { id: 'f-002-2-1', section_id: 'sec-002-2', master_field_id: null, label: 'AC berfungsi baik', type: 'pass_fail', required: true, order: 1, rules: null },
  { id: 'f-002-2-2', section_id: 'sec-002-2', master_field_id: null, label: 'Pencahayaan ruangan memadai', type: 'pass_fail', required: true, order: 2, rules: null },
  { id: 'f-002-2-3', section_id: 'sec-002-2', master_field_id: null, label: 'CCTV aktif & terawat', type: 'pass_fail', required: false, order: 3, rules: null },
  // sec-002-3 (Toilet)
  { id: 'f-002-3-1', section_id: 'sec-002-3', master_field_id: null, label: 'Toilet bersih', type: 'pass_fail', required: true, order: 1, rules: null },
  { id: 'f-002-3-2', section_id: 'sec-002-3', master_field_id: null, label: 'Sabun & tissue tersedia', type: 'pass_fail', required: true, order: 2, rules: null },
  // sec-003-1 (Title Page tpl-003)
  { id: 'f-003-1-1', section_id: 'sec-003-1', master_field_id: null, label: 'Auditor 5R', type: 'person', required: true, order: 1, rules: null },
  { id: 'f-003-1-2', section_id: 'sec-003-1', master_field_id: null, label: 'Tanggal Audit', type: 'inspection_date', required: true, order: 2, rules: null },
  // sec-003-2 (Ringkas)
  { id: 'f-003-2-1', section_id: 'sec-003-2', master_field_id: null, label: 'Barang tidak perlu sudah disingkirkan', type: 'pass_fail', required: true, order: 1, rules: null },
  { id: 'f-003-2-2', section_id: 'sec-003-2', master_field_id: null, label: 'Label merah pada barang tidak diperlukan', type: 'pass_fail', required: false, order: 2, rules: null },
  // sec-003-3 (Rapi)
  { id: 'f-003-3-1', section_id: 'sec-003-3', master_field_id: null, label: 'Setiap barang punya tempat tetap', type: 'pass_fail', required: true, order: 1, rules: null },
  { id: 'f-003-3-2', section_id: 'sec-003-3', master_field_id: null, label: 'Label/tanda posisi barang terpasang', type: 'pass_fail', required: true, order: 2, rules: null },
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
    {
      id: 'mf-006',
      name: 'Condition rating',
      field_type: 'multiple_choice',
      configuration: {},
      created_at: '2026-01-01T00:00:00Z',
      options: [
        { id: 'mf-006-opt-good', master_field_id: 'mf-006', label: 'Good', value: 'good', score_value: 2 },
        { id: 'mf-006-opt-fair', master_field_id: 'mf-006', label: 'Fair', value: 'fair', score_value: 1 },
        { id: 'mf-006-opt-poor', master_field_id: 'mf-006', label: 'Poor', value: 'poor', score_value: 0 },
      ],
    },
  ],
  trashedTemplates: [],
  trashedMasterFields: [],
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

  async duplicateTemplate(templateId: string): Promise<CreateTemplateResult> {
    try {
      const { template, sections, fields } = await templateService.getTemplateWithVersion(templateId)
      const res = await apiClient.post(
        API_ENDPOINTS.TEMPLATES.BUILD,
        templateBuildPayload(
          {
            ...template,
            title: `${template.title.trim() || 'Untitled'} (Copy)`,
          },
          sections,
          fields,
        ),
      )
      const { template: newT, version: newV, sections: newS } = normalizeTemplateTree(res.data)
      return { template: newT, version: newV, sections: newS }
    } catch (e) {
      if (e instanceof MockInterceptError) {
        await rnd()
        const { template, sections, fields } = await templateService.getTemplateWithVersion(templateId)
        const t = now()
        const newTemplateId = uid()
        const newVersionId = uid()
        const newTemplate: Template = {
          ...template,
          id: newTemplateId,
          title: `${template.title.trim() || 'Untitled'} (Copy)`,
          created_at: t,
          updated_at: t,
        }
        const newVersion: TemplateVersion = {
          id: newVersionId,
          template_id: newTemplateId,
          version_number: 1,
          title: newTemplate.title,
          description: newTemplate.description,
          scoring_enabled: newTemplate.scoring_enabled,
          status: 'draft',
          published_at: null,
          created_by_id: 'user-mock',
          created_at: t,
        }
        const newSections = sections.map((sec, idx) => ({
          ...sec,
          id: `dup-sec-${uid()}`,
          version_id: newVersionId,
          order: idx + 1,
          created_at: t,
        }))

        _db.templates.push(newTemplate)
        _db.versions.push(newVersion)
        _db.sections.push(...newSections)
        newSections.forEach((newSec, idx) => {
          const originalSec = sections[idx]
          const originalFields = fields[originalSec.id] ?? []
          const newFields = originalFields.map((field, fieldIdx) => ({
            ...field,
            id: `dup-field-${uid()}`,
            section_id: newSec.id,
            order: fieldIdx + 1,
          }))
          _db.fields.push(...newFields)
        })

        return { template: newTemplate, version: newVersion, sections: newSections }
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

  async publishTemplate(id: string): Promise<Template> {
    try {
      const res = await apiClient.post(API_ENDPOINTS.TEMPLATES.PUBLISH(id))
      return normalizeTemplate(unwrapData(res.data))
    } catch (e) {
      if (e instanceof MockInterceptError) {
        await rnd()
        const idx = _db.templates.findIndex(t => t.id === id)
        if (idx === -1) throw new Error(`Template ${id} not found`)

        const publishedAt = now()
        _db.templates[idx] = { ..._db.templates[idx], status: 'published', updated_at: publishedAt }
        _db.versions = _db.versions.map(version =>
          version.template_id === id
            ? { ...version, status: 'published', published_at: publishedAt }
            : version,
        )
        return _db.templates[idx]
      }
      throw e
    }
  },

  async deleteTemplate(id: string): Promise<void> {
    try {
      await apiClient.delete(API_ENDPOINTS.TEMPLATES.DELETE(id))
    } catch (e) {
      if (e instanceof MockInterceptError) {
        await rnd()
        const t = _db.templates.find(item => item.id === id)
        if (t) {
          _db.trashedTemplates.push(t)
          _db.templates = _db.templates.filter(item => item.id !== id)
        }
        return
      }
      throw e
    }
  },

  async listTrashedTemplates(): Promise<Template[]> {
    try {
      const res = await apiClient.get(API_ENDPOINTS.TEMPLATES.TRASH)
      return unwrapList<unknown>(res.data).map(normalizeTemplate)
    } catch (e) {
      if (e instanceof MockInterceptError) {
        return [..._db.trashedTemplates]
      }
      throw e
    }
  },

  async restoreTemplate(id: string): Promise<void> {
    try {
      await apiClient.post(API_ENDPOINTS.TEMPLATES.RESTORE(id))
    } catch (e) {
      if (e instanceof MockInterceptError) {
        await rnd()
        const t = _db.trashedTemplates.find(item => item.id === id)
        if (t) {
          _db.templates.push(t)
          _db.trashedTemplates = _db.trashedTemplates.filter(item => item.id !== id)
        }
        return
      }
      throw e
    }
  },

  async permanentDeleteTemplate(id: string): Promise<void> {
    try {
      await apiClient.delete(API_ENDPOINTS.TEMPLATES.PERMANENT_DELETE(id))
    } catch (e) {
      if (e instanceof MockInterceptError) {
        await rnd()
        _db.trashedTemplates = _db.trashedTemplates.filter(item => item.id !== id)
        _db.versions = _db.versions.filter(v => v.template_id !== id)
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
          rules: null,
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
      return unwrapList<unknown>(res.data).map(normalizeMasterField)
    } catch (e) {
      if (e instanceof MockInterceptError) {
        await new Promise<void>(r => setTimeout(r, 200))
        return [..._db.masterFields]
      }
      throw e
    }
  },

  async getMasterField(id: string): Promise<MasterField> {
    try {
      const res = await apiClient.get(API_ENDPOINTS.MASTER_FIELDS.DETAIL(id))
      return normalizeMasterField(unwrapData(res.data))
    } catch (e) {
      if (e instanceof MockInterceptError) {
        await rnd()
        const masterField = _db.masterFields.find(item => item.id === id)
        if (!masterField) throw new Error(`MasterField ${id} not found`)
        return { ...masterField, options: [...(masterField.options ?? [])] }
      }
      throw e
    }
  },

  async createMasterField(input: Pick<MasterField, 'name' | 'field_type'> & { configuration?: Record<string, unknown> }): Promise<MasterField> {
    const payload = {
      name: input.name,
      field_type: apiFieldType(input.field_type),
      configuration: input.configuration ?? {},
    }

    try {
      const res = await apiClient.post(API_ENDPOINTS.MASTER_FIELDS.CREATE, payload)
      return normalizeMasterField(unwrapData(res.data))
    } catch (e) {
      if (e instanceof MockInterceptError) {
        await rnd()
        const masterField: MasterField = {
          id: uid(),
          name: input.name,
          field_type: input.field_type,
          configuration: input.configuration ?? {},
          created_at: now(),
          options: [],
        }
        _db.masterFields = [masterField, ..._db.masterFields]
        return masterField
      }
      throw e
    }
  },

  async updateMasterField(id: string, input: Partial<Pick<MasterField, 'name' | 'field_type' | 'configuration'>>): Promise<MasterField> {
    const payload = {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.field_type !== undefined ? { field_type: apiFieldType(input.field_type) } : {}),
      ...(input.configuration !== undefined ? { configuration: input.configuration } : {}),
    }

    try {
      const res = await apiClient.put(API_ENDPOINTS.MASTER_FIELDS.UPDATE(id), payload)
      return normalizeMasterField(unwrapData(res.data))
    } catch (e) {
      if (e instanceof MockInterceptError) {
        await rnd()
        const index = _db.masterFields.findIndex(item => item.id === id)
        if (index === -1) throw new Error(`MasterField ${id} not found`)
        _db.masterFields[index] = { ..._db.masterFields[index], ...input }
        return _db.masterFields[index]
      }
      throw e
    }
  },

  async deleteMasterField(id: string): Promise<void> {
    try {
      await apiClient.delete(API_ENDPOINTS.MASTER_FIELDS.DELETE(id))
    } catch (e) {
      if (e instanceof MockInterceptError) {
        await rnd()
        const mf = _db.masterFields.find(item => item.id === id)
        if (mf) {
          _db.trashedMasterFields.push(mf)
          _db.masterFields = _db.masterFields.filter(item => item.id !== id)
        }
        return
      }
      throw e
    }
  },

  async listTrashedMasterFields(): Promise<MasterField[]> {
    try {
      const res = await apiClient.get(API_ENDPOINTS.MASTER_FIELDS.TRASH)
      return unwrapList<unknown>(res.data).map(normalizeMasterField)
    } catch (e) {
      if (e instanceof MockInterceptError) {
        return [..._db.trashedMasterFields]
      }
      throw e
    }
  },

  async restoreMasterField(id: string): Promise<void> {
    try {
      await apiClient.post(API_ENDPOINTS.MASTER_FIELDS.RESTORE(id))
    } catch (e) {
      if (e instanceof MockInterceptError) {
        await rnd()
        const mf = _db.trashedMasterFields.find(item => item.id === id)
        if (mf) {
          _db.masterFields.push(mf)
          _db.trashedMasterFields = _db.trashedMasterFields.filter(item => item.id !== id)
        }
        return
      }
      throw e
    }
  },

  async permanentDeleteMasterField(id: string): Promise<void> {
    try {
      await apiClient.delete(API_ENDPOINTS.MASTER_FIELDS.PERMANENT_DELETE(id))
    } catch (e) {
      if (e instanceof MockInterceptError) {
        await rnd()
        _db.trashedMasterFields = _db.trashedMasterFields.filter(item => item.id !== id)
        return
      }
      throw e
    }
  },

  async getMasterFieldOptions(masterFieldId: string): Promise<MasterFieldOption[]> {
    try {
      const res = await apiClient.get(API_ENDPOINTS.MASTER_FIELDS.OPTIONS(masterFieldId))
      return unwrapList<unknown>(res.data).map(item => normalizeMasterFieldOption(item, masterFieldId))
    } catch (e) {
      if (e instanceof MockInterceptError) {
        await rnd()
        return [...(_db.masterFields.find(item => item.id === masterFieldId)?.options ?? [])]
      }
      throw e
    }
  },

  async createMasterFieldOption(masterFieldId: string, input: Pick<MasterFieldOption, 'label' | 'value' | 'score_value'>): Promise<MasterFieldOption> {
    try {
      const res = await apiClient.post(API_ENDPOINTS.MASTER_FIELDS.OPTIONS(masterFieldId), input)
      return normalizeMasterFieldOption(unwrapData(res.data), masterFieldId)
    } catch (e) {
      if (e instanceof MockInterceptError) {
        await rnd()
        const masterField = _db.masterFields.find(item => item.id === masterFieldId)
        if (!masterField) throw new Error(`MasterField ${masterFieldId} not found`)
        const option: MasterFieldOption = {
          id: uid(),
          master_field_id: masterFieldId,
          label: input.label,
          value: input.value || input.label.toLowerCase().replace(/\s+/g, '_'),
          score_value: input.score_value,
        }
        masterField.options = [option, ...(masterField.options ?? [])]
        return option
      }
      throw e
    }
  },

  async updateMasterFieldOption(
    masterFieldId: string,
    optionId: string,
    input: Partial<Pick<MasterFieldOption, 'label' | 'value' | 'score_value'>>,
  ): Promise<MasterFieldOption> {
    try {
      const res = await apiClient.put(API_ENDPOINTS.MASTER_FIELDS.OPTION(masterFieldId, optionId), input)
      return normalizeMasterFieldOption(unwrapData(res.data), masterFieldId)
    } catch (e) {
      if (e instanceof MockInterceptError) {
        await rnd()
        const masterField = _db.masterFields.find(item => item.id === masterFieldId)
        const options = masterField?.options ?? []
        const index = options.findIndex(option => option.id === optionId)
        if (!masterField || index === -1) throw new Error(`MasterField option ${optionId} not found`)
        options[index] = { ...options[index], ...input }
        masterField.options = options
        return options[index]
      }
      throw e
    }
  },

  async deleteMasterFieldOption(masterFieldId: string, optionId: string): Promise<void> {
    try {
      await apiClient.delete(API_ENDPOINTS.MASTER_FIELDS.OPTION(masterFieldId, optionId))
    } catch (e) {
      if (e instanceof MockInterceptError) {
        await rnd()
        const masterField = _db.masterFields.find(item => item.id === masterFieldId)
        if (masterField) {
          masterField.options = (masterField.options ?? []).filter(option => option.id !== optionId)
        }
        return
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
          rules: null,
        }
        _db.fields.push(field)
        return field
      }
      throw e
    }
  },
}
