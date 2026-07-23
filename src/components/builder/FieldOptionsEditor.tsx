import { Plus, X } from 'lucide-react'
import { BUILT_IN_RESPONSE_SETS } from '../../stores/responseSetStore'
import type { FieldOption, ResponseColor } from '../../types/template'
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
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function FieldOptionsEditor({
  options,
  fieldId,
  onChange,
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
                  className="flex items-center gap-2 bg-surface p-1.5 rounded-lg border border-divider group hover:border-muted-foreground/30 transition-all"
                  style={{
                    animation: 'slideInDown 180ms ease forwards',
                  }}
                >
                  <div className={cn('w-2.5 h-2.5 rounded-full shrink-0 ml-1', styles.dot)} />
                  <input
                    type="text"
                    value={opt.label}
                    onChange={(e) => updateOption(opt.id, e.target.value)}
                    placeholder={`Opsi ${idx + 1}`}
                    className="flex-1 text-xs font-semibold text-foreground bg-transparent border-none focus:outline-none placeholder:text-muted-foreground/45"
                  />
                  <button
                    type="button"
                    onClick={() => removeOption(opt.id)}
                    className="p-1 rounded hover:bg-danger-red/10 text-muted-foreground hover:text-danger-red transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
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
