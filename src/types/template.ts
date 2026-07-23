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

export type TriggerType = 'notify' | 'create_action'

interface BaseTrigger {
  id: string
}

export type NotifyTrigger = BaseTrigger & {
  type: 'notify'
  notify_user_ids?: string[]
  notify_group_ids?: string[]
  message?: string
  priority?: number
}

export type CreateActionTrigger = BaseTrigger & {
  type: 'create_action'
  action_title?: string
  action_priority?: 'low' | 'medium' | 'high'
  assignee_ids?: string[]
}

export type Trigger = NotifyTrigger | CreateActionTrigger

export type LogicActionType = 'notify' | 'create_action'

export interface LogicActionNotify {
  type: 'notify'
  notify_user_ids?: string[]
  notify_group_ids?: string[]
  message?: string
  priority?: number
}

export interface LogicActionCreateAction {
  type: 'create_action'
  action_title?: string
  action_priority?: 'low' | 'medium' | 'high'
  assignee_ids?: string[]
}

export type LogicAction = LogicActionNotify | LogicActionCreateAction

export type LogicOperator = 'eq'

export interface LogicRule {
  when_value: string
  operator?: LogicOperator
  actions: LogicAction[]
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
  rules: LogicRule[] | null
  options?: FieldOption[]
  table?: FieldTable
  config?: Record<string, any>
  /** Local-only: media attachment URI for instruction fields */
  mediaUri?: string
}

export interface FieldOption {
  id: string
  field_id: string
  label: string
  value: string
  score_value: number
  triggers?: Trigger[]
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

export interface TemplateRequest {
  id?: string;
  type: FormType;
  title: string;
  description: string;
  scoring_enabled: boolean;
  pages?: TemplatePageRequest[];
}

export interface TemplatePageRequest {
  id?: string;
  title: string;
  description: string;
  order: number;
  fields?: TemplateFieldRequest[];
}

export interface TemplateFieldRequest {
  id?: string;
  label: string;
  type: FieldType;
  required: boolean;
  order: number;
  options?: TemplateFieldOptionRequest[];
  config?: TemplateFieldConfigRequest;
  rules?: LogicRule[];
}

export interface TemplateFieldOptionRequest {
  id?: string;
  label: string;
  value: string;
  score_value: number;
  icon?: string;
  triggers?: Trigger[];
}

export interface TemplateFieldConfigRequest {
  text?: string;
  image_urls?: string[];
  max_files?: number;
  allowed_types?: string[];
  max_length?: number;
  multiline?: boolean;
  min?: number;
  max?: number;
  date_only?: boolean;
  time_only?: boolean;
  step?: number;
}

function ruleActionToTrigger(action: LogicAction): Trigger {
  const id = 'trigger-' + Math.random().toString(36).substring(2, 11);
  return { id, ...action } as Trigger;
}

export function rulesToOptionTriggers(
  rules: LogicRule[] | undefined | null,
  options: TemplateFieldOptionRequest[] | undefined
): TemplateFieldOptionRequest[] | undefined {
  if (!options) return options;
  return options.map((opt) => {
    const rule = rules?.find((r) => r.when_value === opt.value);
    return rule
      ? { ...opt, triggers: rule.actions.map(ruleActionToTrigger) }
      : opt;
  });
}

export const templateToRequestMapper = (
  version: TemplateVersion,
  sections: TemplateSection[],
  fields: TemplateField[]
): TemplateRequest => {
  return {
    id: version.template_id,
    type: 'inspection',
    title: version.title,
    description: version.description,
    scoring_enabled: version.scoring_enabled,
    pages: sections.map((section) => ({
      id: section.id,
      title: section.title,
      description: section.description,
      order: section.order,
      fields: fields.filter(f => f.section_id === section.id).map((field) => {
        return {
          id: field.id,
          label: field.label ?? '',
          type: field.type ?? 'text_answer',
          required: field.required,
          order: field.order,
          options: rulesToOptionTriggers(field.rules, field.options as any),
          config: field.config,
        };
      }),
    })),
  };
};

const triggerToAction = (trigger: Trigger): LogicAction => {
  if (trigger.type === 'notify') {
    return {
      type: 'notify',
      notify_user_ids: trigger.notify_user_ids,
      notify_group_ids: trigger.notify_group_ids,
      message: trigger.message,
      priority: 0,
    };
  }
  return {
    type: 'create_action',
    action_title: trigger.action_title,
    action_priority: trigger.action_priority,
    assignee_ids: trigger.assignee_ids,
  };
};

export const optionsToRules = (
  options: TemplateFieldOptionRequest[] = []
): LogicRule[] => {
  return options
    .filter((o) => (o.triggers?.length ?? 0) > 0)
    .map((o) => ({
      when_value: o.value,
      actions: o.triggers!.map(triggerToAction),
    }));
};

const fieldToRequest = (field: TemplateFieldRequest): TemplateFieldRequest => ({
  ...field,
  rules: optionsToRules(field.options),
});

const pageToRequest = (page: TemplatePageRequest): TemplatePageRequest => ({
  ...page,
  fields: page.fields?.map(fieldToRequest),
});

export const buildPayload = (template: TemplateRequest): TemplateRequest => ({
  ...template,
  pages: template.pages?.map(pageToRequest),
});
