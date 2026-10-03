import { Bell, ListTodo, Plus, Trash2, X, Zap } from 'lucide-react'
import { BUILT_IN_RESPONSE_SETS } from '../../stores/responseSetStore'
import type { FieldOption, ResponseColor, Trigger, TriggerType } from '../../types/template'
import type { Branch, ManagementUser } from '../../types/management'
import { cn } from '../../utils/cn'

// ─── Color map ────────────────────────────────────────────────────────────────

const COLOR_STYLES: Record<ResponseColor, { dot: string; badge: string }> = {
  green:   { dot: 'bg-success-green',  badge: 'bg-success-green/10 text-success-green' },
  amber:   { dot: 'bg-warning-amber',  badge: 'bg-warning-amber/10 text-warning-amber' },
  red:     { dot: 'bg-danger-red',     badge: 'bg-danger-red/10 text-danger-red' },
  neutral: { dot: 'bg-muted-foreground', badge: 'bg-surface text-muted-foreground' },
  blue:    { dot: 'bg-primary-blue',   badge: 'bg-primary-blue/10 text-primary-blue' },
  purple:  { dot: 'bg-purple-500',     badge: 'bg-purple-100 text-purple-700' },
}

const COLOR_OPTIONS: ResponseColor[] = ['green', 'amber', 'red', 'neutral', 'blue', 'purple']

// ─── Props ────────────────────────────────────────────────────────────────────

interface FieldOptionsEditorProps {
  options: FieldOption[]
  fieldId: string
  onChange: (options: FieldOption[]) => void
  scoringEnabled?: boolean
  users?: ManagementUser[]
  groups?: Branch[]
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function FieldOptionsEditor({
  options,
  fieldId,
  onChange,
  scoringEnabled = false,
  users = [],
  groups = [],
}: FieldOptionsEditorProps) {

  const applyPreset = (presetId: string) => {
    const preset = BUILT_IN_RESPONSE_SETS.find((s) => s.id === presetId)
    if (!preset) return
    const newOptions: FieldOption[] = preset.options.map((opt, i) => ({
      id: `${fieldId}-${Date.now()}-${i}`,
      field_id: fieldId,
      label: opt.label,
      value: opt.label.toLowerCase().replace(/\s+/g, '_'),
      score_value: 0,
    }))
    onChange(newOptions)
  }

  const addOption = () => {
    const newOpt: FieldOption = {
      id: `${fieldId}-${Date.now()}`,
      field_id: fieldId,
      label: '',
      value: '',
      score_value: 0,
    }
    onChange([...options, newOpt])
  }

  const updateOption = (id: string, label: string) => {
    onChange(
      options.map((o) =>
        o.id === id
          ? { ...o, label, value: label.toLowerCase().replace(/\s+/g, '_') }
          : o,
      ),
    )
  }

  const removeOption = (id: string) => {
    onChange(options.filter((o) => o.id !== id))
  }

  const updateScore = (id: string, score: number) => {
    onChange(options.map(option => option.id === id ? { ...option, score_value: Math.max(0, score || 0) } : option))
  }

  const addTrigger = (optionId: string, type: TriggerType) => {
    const trigger: Trigger = type === 'notify'
      ? { id: `trigger-${Date.now()}`, type, notify_user_ids: [], notify_group_ids: [], message: '', priority: 0 }
      : { id: `trigger-${Date.now()}`, type, action_title: '', action_priority: 'medium', assignee_ids: [] }
    onChange(options.map(option => option.id === optionId
      ? { ...option, triggers: [...(option.triggers ?? []), trigger] }
      : option))
  }

  const updateTrigger = (optionId: string, triggerId: string, patch: Partial<Trigger>) => {
    onChange(options.map(option => option.id === optionId
      ? { ...option, triggers: (option.triggers ?? []).map(trigger => trigger.id === triggerId ? { ...trigger, ...patch } as Trigger : trigger) }
      : option))
  }

  const removeTrigger = (optionId: string, triggerId: string) => {
    onChange(options.map(option => option.id === optionId
      ? { ...option, triggers: (option.triggers ?? []).filter(trigger => trigger.id !== triggerId) }
      : option))
  }

  const selected = (event: React.ChangeEvent<HTMLSelectElement>) =>
    Array.from(event.target.selectedOptions).map(option => option.value)

  return (
    <div className="mt-2.5 border border-divider rounded-xl overflow-hidden bg-card">
      {/* Preset strip */}
      <div className="px-3 py-2 bg-surface border-b border-divider flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mr-1">
          Preset Pilihan:
        </span>
        {BUILT_IN_RESPONSE_SETS.map((set) => (
          <button
            key={set.id}
            type="button"
            onClick={() => applyPreset(set.id)}
            className="px-2.5 py-1 text-[11px] font-semibold rounded-full bg-card border border-divider text-muted-foreground hover:border-primary-blue/40 hover:text-primary-blue hover:bg-primary-blue/5 transition-all"
          >
            {set.name}
          </button>
        ))}
      </div>

      {/* Options list */}
      <div className="px-3 py-3 space-y-2">
        {options.length === 0 ? (
          <div className="text-center py-4 bg-surface/50 rounded-lg border border-dashed border-divider">
            <p className="text-xs text-muted-foreground">
              Belum ada opsi jawaban. Pilih preset di atas atau tambah manual.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {options.map((opt, idx) => {
              // try to infer a color based on index / common labels
              const labelLower = opt.label.toLowerCase()
              const inferredColor: ResponseColor =
                labelLower.includes('good') || labelLower.includes('safe') || labelLower.includes('pass') || labelLower.includes('yes') || labelLower.includes('compliant')
                  ? 'green'
                  : labelLower.includes('poor') || labelLower.includes('fail') || labelLower.includes('no') || labelLower.includes('non') || labelLower.includes('risk')
                  ? 'red'
                  : labelLower.includes('fair') || labelLower.includes('partial')
                  ? 'amber'
                  : labelLower.includes('n/a')
                  ? 'neutral'
                  : COLOR_OPTIONS[idx % COLOR_OPTIONS.length]

              const styles = COLOR_STYLES[inferredColor]
              return (
                <div
                  key={opt.id}
                  className="rounded-lg border border-divider bg-surface p-2.5 transition-all hover:border-muted-foreground/30"
                  style={{
                    animation: 'slideInDown 180ms ease forwards',
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div className={cn('ml-1 h-2.5 w-2.5 shrink-0 rounded-full', styles.dot)} />
                    <input
                      type="text"
                      value={opt.label}
                      onChange={(e) => updateOption(opt.id, e.target.value)}
                      placeholder={`Opsi ${idx + 1}`}
                      className="min-w-0 flex-1 border-none bg-transparent text-xs font-semibold text-foreground placeholder:text-muted-foreground/45 focus:outline-none"
                    />
                    {scoringEnabled && (
                      <label className="flex items-center gap-1 text-[10px] font-semibold text-stone">
                        Skor
                        <input type="number" min={0} value={opt.score_value} onChange={event => updateScore(opt.id, Number(event.target.value))} className="w-16 rounded-lg border border-divider bg-card px-2 py-1.5 text-xs text-foreground" />
                      </label>
                    )}
                    <button type="button" onClick={() => removeOption(opt.id)} className="rounded p-1 text-muted-foreground transition-colors hover:bg-danger-red/10 hover:text-danger-red">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {(opt.triggers ?? []).map(trigger => (
                    <div key={trigger.id} className="mt-2 rounded-lg border border-primary-blue/15 bg-card p-3">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-primary-blue">
                          {trigger.type === 'notify' ? <Bell className="h-3.5 w-3.5" /> : <ListTodo className="h-3.5 w-3.5" />}
                          {trigger.type === 'notify' ? 'Kirim notifikasi' : 'Buat tindakan'} saat “{opt.label || `Opsi ${idx + 1}`}”
                        </span>
                        <button type="button" onClick={() => removeTrigger(opt.id, trigger.id)} className="text-stone hover:text-danger-red" aria-label="Hapus logic"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                      {trigger.type === 'notify' ? (
                        <div className="grid gap-2 sm:grid-cols-2">
                          <input value={trigger.message ?? ''} onChange={event => updateTrigger(opt.id, trigger.id, { message: event.target.value })} placeholder="Pesan notifikasi" className="form-input text-xs sm:col-span-2" />
                          <label className="text-[10px] font-semibold text-stone">User penerima
                            <select multiple value={trigger.notify_user_ids ?? []} onChange={event => updateTrigger(opt.id, trigger.id, { notify_user_ids: selected(event) })} className="form-input mt-1 min-h-20 text-xs">
                              {users.map(user => <option key={user.id} value={user.id}>{user.name}</option>)}
                            </select>
                          </label>
                          <label className="text-[10px] font-semibold text-stone">Group penerima
                            <select multiple value={trigger.notify_group_ids ?? []} onChange={event => updateTrigger(opt.id, trigger.id, { notify_group_ids: selected(event) })} className="form-input mt-1 min-h-20 text-xs">
                              {groups.map(group => <option key={group.id} value={group.id}>{group.name}</option>)}
                            </select>
                          </label>
                        </div>
                      ) : (
                        <div className="grid gap-2 sm:grid-cols-2">
                          <input value={trigger.action_title ?? ''} onChange={event => updateTrigger(opt.id, trigger.id, { action_title: event.target.value })} placeholder="Judul tindakan" className="form-input text-xs sm:col-span-2" />
                          <select value={trigger.action_priority ?? 'medium'} onChange={event => updateTrigger(opt.id, trigger.id, { action_priority: event.target.value as 'low' | 'medium' | 'high' })} className="form-input text-xs">
                            <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
                          </select>
                          <select multiple value={trigger.assignee_ids ?? []} onChange={event => updateTrigger(opt.id, trigger.id, { assignee_ids: selected(event) })} className="form-input min-h-20 text-xs">
                            {users.map(user => <option key={user.id} value={user.id}>{user.name}</option>)}
                          </select>
                        </div>
                      )}
                    </div>
                  ))}

                  <div className="mt-2 flex flex-wrap gap-2 border-t border-divider pt-2">
                    <button type="button" onClick={() => addTrigger(opt.id, 'notify')} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-primary-blue hover:bg-primary-blue/5"><Bell className="h-3.5 w-3.5" /> Notifikasi</button>
                    <button type="button" onClick={() => addTrigger(opt.id, 'create_action')} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-primary-blue hover:bg-primary-blue/5"><Zap className="h-3.5 w-3.5" /> Buat tindakan</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <button
          type="button"
          onClick={addOption}
          className="flex items-center gap-1.5 text-xs font-bold text-primary-blue hover:text-primary-blue-dark transition-colors px-2 py-1 rounded hover:bg-primary-blue/5"
        >
          <Plus className="w-4 h-4" />
          Tambah Opsi Jawaban
        </button>
      </div>
    </div>
  )
}
