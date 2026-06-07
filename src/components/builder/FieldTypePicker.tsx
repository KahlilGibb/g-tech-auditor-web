import { useEffect, useRef, useState } from 'react'
import { X, Database } from 'lucide-react'
import { FIELD_TYPES, type FieldType, type MasterField } from '../../types/template'
import { cn } from '../../utils/cn'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hexAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface FieldTypePickerProps {
  isOpen: boolean
  currentType: FieldType | ''
  masterFields: MasterField[]
  onClose: () => void
  onSelect: (type: FieldType) => void
  onSelectMaster?: (masterFieldId: string) => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function FieldTypePicker({
  isOpen,
  currentType,
  masterFields,
  onClose,
  onSelect,
  onSelectMaster,
}: FieldTypePickerProps) {
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)
  const sheetRef = useRef<HTMLDivElement>(null)

  // Mount → trigger open animation
  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMounted(true)
      // RAF delay so CSS transition fires after mount
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true))
      })
    } else {
      setVisible(false)
      const timer = setTimeout(() => setMounted(false), 320)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  if (!mounted) return null

  const handleSelect = (type: FieldType) => {
    onSelect(type)
    onClose()
  }

  const handleMasterSelect = (id: string) => {
    onSelectMaster?.(id)
    onClose()
  }

  // Split into rows of 3
  const rows: (typeof FIELD_TYPES)[] = []
  for (let i = 0; i < FIELD_TYPES.length; i += 3) {
    rows.push(FIELD_TYPES.slice(i, i + 3))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px] transition-opacity duration-200"
        style={{ opacity: visible ? 1 : 0 }}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className="relative w-full sm:max-w-lg bg-white rounded-t-[28px] sm:rounded-2xl shadow-2xl transition-transform duration-300 ease-out"
        style={{
          transform: visible ? 'translateY(0)' : 'translateY(100%)',
          maxHeight: '85dvh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Handle (mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-9 h-1 rounded-full bg-divider" />
        </div>

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-divider">
          <h2 className="flex-1 text-base font-bold text-foreground">
            {currentType ? 'Change response type' : 'Choose response type'}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-surface flex items-center justify-center hover:bg-secondary transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-1 p-4 space-y-2">
          {/* 3-column grid */}
          {rows.map((row, rowIdx) => (
            <div key={rowIdx} className="grid grid-cols-3 gap-2.5">
              {row.map((ft) => {
                const isSelected = currentType === ft.value
                return (
                  <button
                    key={ft.value}
                    onClick={() => handleSelect(ft.value)}
                    className={cn(
                      'min-h-[60px] rounded-xl flex flex-col items-center justify-center px-2 py-3 transition-all duration-150 active:scale-95',
                      isSelected && 'ring-2',
                    )}
                    style={{
                      backgroundColor: hexAlpha(ft.color, isSelected ? 0.18 : 0.1),
                      boxShadow: isSelected ? `0 0 0 2px ${ft.color}` : undefined,
                      borderWidth: isSelected ? '1.5px' : '0',
                      borderColor: isSelected ? ft.color : 'transparent',
                    }}
                  >
                    <span
                      className="text-[12px] font-semibold text-center leading-tight"
                      style={{ color: ft.color }}
                    >
                      {ft.label}
                    </span>
                  </button>
                )
              })}
              {/* Pad last row */}
              {row.length < 3 &&
                Array.from({ length: 3 - row.length }).map((_, i) => (
                  <div key={`pad-${i}`} />
                ))}
            </div>
          ))}

          {/* Master fields */}
          {masterFields.length > 0 && (
            <div className="pt-3">
              <div className="flex items-center gap-1.5 mb-2.5">
                <Database className="w-3 h-3 text-muted-foreground" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  From Master Fields
                </span>
              </div>
              <div className="rounded-xl border border-divider overflow-hidden">
                {masterFields.map((mf, idx) => (
                  <button
                    key={mf.id}
                    onClick={() => handleMasterSelect(mf.id)}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-3 bg-surface hover:bg-secondary transition-colors text-left',
                      idx < masterFields.length - 1 && 'border-b border-divider',
                    )}
                  >
                    <div className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-bold text-purple-700">M</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{mf.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {mf.field_type.replace(/_/g, ' ')}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="h-2" />
        </div>
      </div>
    </div>
  )
}
