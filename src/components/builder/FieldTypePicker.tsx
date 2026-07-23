import { useEffect, useRef, useState } from 'react'
import {
  X,
  Database,
  Type,
  List,
  CheckCircle2,
  Calendar,
  User,
  Hash,
  CheckSquare,
  Camera,
  PenTool,
  Info,
  Sliders,
  Table as TableIcon
} from 'lucide-react'
import type { FieldType, MasterField } from '../../types/template'
import { cn } from '../../utils/cn'

// ─── Props ────────────────────────────────────────────────────────────────────

interface FieldTypePickerProps {
  isOpen: boolean
  currentType: FieldType | ''
  masterFields: MasterField[]
  onClose: () => void
  onSelect: (type: FieldType) => void
  onSelectMaster?: (masterFieldId: string) => void
}

// ─── Groups Definition ────────────────────────────────────────────────────────

const GROUPS = [
  {
    name: 'Input Dasar',
    types: [
      { value: 'text_answer', label: 'Teks Bebas', desc: 'Jawaban tulisan singkat atau deskripsi', icon: Type, color: '#F59E0B' },
      { value: 'number', label: 'Angka / Nilai', desc: 'Input numerik (suhu, kuantitas, meteran)', icon: Hash, color: '#3B82F6' },
      { value: 'inspection_date', label: 'Tanggal', desc: 'Pilihan kalender & waktu otomatis', icon: Calendar, color: '#10B981' },
      { value: 'person', label: 'Nama Personil', desc: 'Nama staff, auditor, atau saksi', icon: User, color: '#8B5CF6' },
    ]
  },
  {
    name: 'Pilihan Jawaban',
    types: [
      { value: 'pass_fail', label: 'Pass / Fail / NA', desc: 'Pilihan OK, Not OK, atau N/A', icon: CheckSquare, color: '#10B981' },
      { value: 'multiple_choice', label: 'Pilihan Ganda', desc: 'Pilih satu dari beberapa opsi jawaban', icon: CheckCircle2, color: '#3B82F6' },
      { value: 'checkbox', label: 'Kotak Centang', desc: 'Pilihan multi-select atau persetujuan', icon: CheckSquare, color: '#EC4899' },
      { value: 'dropdown', label: 'Menu Dropdown', desc: 'Pilihan satu opsi dalam daftar tertutup', icon: List, color: '#F97316' },
    ]
  },
  {
    name: 'Dokumentasi & Lanjutan',
    types: [
      { value: 'photo', label: 'Ambil Foto', desc: 'Kamera langsung atau galeri file gambar', icon: Camera, color: '#14B8A6' },
      { value: 'signature', label: 'Tanda Tangan', desc: 'Tanda tangan digital di atas layar sentuh', icon: PenTool, color: '#6366F1' },
      { value: 'instruction', label: 'Instruksi / Info', desc: 'Teks penjelasan (non-pertanyaan)', icon: Info, color: '#94A3B8' },
      { value: 'slider', label: 'Slider Skala', desc: 'Pilih nilai dengan menggeser baris skala', icon: Sliders, color: '#F43F5E' },
      { value: 'table', label: 'Tabel Dinamis', desc: 'Input data tabular (baris & kolom)', icon: TableIcon, color: '#0EA5E9' },
    ]
  }
]

// Helper for bg alpha
function hexAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

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

  useEffect(() => {
    if (isOpen) {
      setMounted(true)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true))
      })
    } else {
      setVisible(false)
      const timer = setTimeout(() => setMounted(false), 300)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

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

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-[4px] transition-opacity duration-200"
        style={{ opacity: visible ? 1 : 0 }}
        onClick={onClose}
      />

      {/* Sheet / Modal */}
      <div
        ref={sheetRef}
        className="relative w-full sm:max-w-2xl bg-card rounded-t-[28px] sm:rounded-3xl shadow-2xl transition-transform duration-300 ease-out flex flex-col border border-divider"
        style={{
          transform: visible ? 'translateY(0)' : 'translateY(100%)',
          maxHeight: '90dvh',
        }}
      >
        {/* Mobile handle indicator */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1.5 rounded-full bg-divider" />
        </div>

        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4.5 border-b border-divider">
          <div>
            <h2 className="text-base font-bold text-foreground">
              {currentType ? 'Ubah Tipe Jawaban' : 'Pilih Tipe Jawaban'}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Pilih format respons yang akan diisi oleh auditor saat melakukan inspeksi.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-surface flex items-center justify-center hover:bg-secondary transition-colors ml-auto shrink-0"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Scrollable List */}
        <div className="overflow-y-auto flex-1 p-6 space-y-6">
          {GROUPS.map((group) => (
            <div key={group.name} className="space-y-2.5">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                {group.name}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {group.types.map((type) => {
                  const Icon = type.icon
                  const isSelected = currentType === type.value
                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => handleSelect(type.value as FieldType)}
                      className={cn(
                        'flex items-start gap-3.5 p-3.5 rounded-2xl border text-left transition-all duration-200 active:scale-97 hover:shadow-sm',
                        isSelected
                          ? 'border-primary-blue bg-primary-blue/[0.04]'
                          : 'border-divider bg-card hover:bg-surface/50'
                      )}
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{
                          backgroundColor: hexAlpha(type.color, 0.12),
                          color: type.color,
                        }}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold text-foreground">
                          {type.label}
                        </p>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          {type.desc}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}

          {/* Master Fields Section */}
          {masterFields.length > 0 && (
            <div className="pt-4 border-t border-divider space-y-2.5">
              <div className="flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-muted-foreground" />
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Gunakan Master Field
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {masterFields.map((mf) => (
                  <button
                    key={mf.id}
                    type="button"
                    onClick={() => handleMasterSelect(mf.id)}
                    className="flex items-center gap-3 px-4 py-3 bg-surface hover:bg-secondary/40 border border-divider rounded-2xl text-left transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
                      <span className="text-[11px] font-bold text-purple-700">M</span>
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-xs font-bold text-foreground truncate">{mf.name}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wider">
                        {mf.field_type.replace(/_/g, ' ')}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
