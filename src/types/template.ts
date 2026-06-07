// ─── Primitive types ──────────────────────────────────────────────────────────

export type FormType = 'inspection' | 'cps'
export type TemplateStatus = 'draft' | 'published' | 'archived'
export type FieldType =
  | 'text_answer'
  | 'text'
  | 'pass_fail'
  | 'multiple_choice'
  | 'inspection_date'
  | 'datetime'
  | 'person'
  | 'number'
  | 'checkbox'
  | 'dropdown'
  | 'photo'
  | 'media'
  | 'annotation'
  | 'signature'
  | 'location'
  | 'instruction'
  | 'slider'
  | 'table'
  | 'title_site'
  | 'title_inspection_date'
  | 'title_document_number'
  | 'title_asset'
  | 'title_company'

// ─── Domain interfaces (mirror DB schema) ─────────────────────────────────────

export interface LogicRule {
  condition: 'equals' | 'not_equals'
  value: string
  action: 'show' | 'hide' | 'trigger_action'
  target_field_id?: string
}

export interface Template {
  id: string
  org_id: string
  title: string
  description: string
  form_type: FormType
  scoring_enabled: boolean
  status: TemplateStatus
  created_at: string
  updated_at: string
}

export interface TemplateVersion {
  id: string
  template_id: string
  version_number: number
  title: string
  description: string
  scoring_enabled: boolean
  status: TemplateStatus
  published_at: string | null
  created_by_id: string
  created_at: string
}

export interface TemplateSection {
  id: string
  version_id: string
  title: string
  description: string
  order: number
  status: 'active' | 'inactive'
  created_at: string
}

export interface TemplateField {
  id: string
  section_id: string
  master_field_id: string | null
  label: string
  type: FieldType
  required: boolean
  order: number
  logic_rules: LogicRule[] | null
  options?: FieldOption[]
  table?: FieldTable
  /** Local-only: media attachment URI for instruction fields */
  mediaUri?: string
}

export interface FieldOption {
  id: string
  field_id: string
  label: string
  value: string
  score_value: number
}

export interface FieldTable {
  id: string
  field_id: string
  title: string
  columns: TableColumn[]
}

export interface TableColumn {
  id: string
  table_id: string
  label: string
  column_type: string
  order: number
}

export interface MasterField {
  id: string
  name: string
  field_type: FieldType
  configuration: Record<string, unknown>
  created_at: string
  options?: MasterFieldOption[]
}

export interface MasterFieldOption {
  id: string
  master_field_id: string
  label: string
  value: string
  score_value: number
}

// ─── Field type catalog ────────────────────────────────────────────────────────

export const FIELD_TYPES: { value: FieldType; label: string; color: string }[] = [
  { value: 'text_answer',     label: 'Text answer',     color: '#F59E0B' },
  { value: 'multiple_choice', label: 'Multiple choice', color: '#6B7280' },
  { value: 'pass_fail',       label: 'Pass / Fail',     color: '#6B7280' },
  { value: 'inspection_date', label: 'Inspection date', color: '#10B981' },
  { value: 'person',          label: 'Person',          color: '#8B5CF6' },
  { value: 'number',          label: 'Number',          color: '#3B82F6' },
  { value: 'checkbox',        label: 'Checkbox',        color: '#EC4899' },
  { value: 'dropdown',        label: 'Dropdown',        color: '#F97316' },
  { value: 'photo',           label: 'Photo',           color: '#14B8A6' },
  { value: 'signature',       label: 'Signature',       color: '#6366F1' },
  { value: 'instruction',     label: 'Instruction',     color: '#94A3B8' },
  { value: 'slider',          label: 'Slider',          color: '#F43F5E' },
  { value: 'table',           label: 'Table',           color: '#0EA5E9' },
]

export function fieldTypeColor(type: FieldType): string {
  return FIELD_TYPES.find(t => t.value === type)?.color ?? '#6B7280'
}

export function fieldTypeLabel(type: FieldType): string {
  return FIELD_TYPES.find(t => t.value === type)?.label ?? type
}

// ─── Response Set types (used by Template Builder) ────────────────────────────

export type ResponseColor = 'green' | 'amber' | 'red' | 'neutral' | 'blue' | 'purple'

export type ResponseTypeId = string // built-in id ('site', 'text') or a custom set id

export interface ResponseOption {
  id: string
  label: string
  color: ResponseColor
}

export interface ResponseSet {
  id: string
  name?: string
  options: ResponseOption[]
  isBuiltIn?: boolean
}
