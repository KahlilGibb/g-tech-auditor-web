import React, { useMemo, useRef, useState } from 'react';
import {
  CalendarDays,
  Camera,
  CheckCircle2,
  FileText,
  ImagePlus,
  PenLine,
  Plus,
  MapPin,
  StickyNote,
  Trash2,
} from 'lucide-react';
import type { InspectionResponse } from '../../types/inspection';
import type { FieldOption, TemplateField } from '../../types/template';
import { cn } from '../../utils/cn';
import SignaturePad from './SignaturePad';

interface InspectionQuestionCardProps {
  field: TemplateField;
  response?: InspectionResponse;
  index?: number;
  onValueChange: (fieldId: string, value: unknown) => void;
  onNoteChange: (fieldId: string, note: string) => void;
  onAddMedia: (fieldId: string, file: File) => void;
  onRemoveMedia: (fieldId: string, uri: string) => void;
  onCreateAction?: (fieldId: string) => void;
  readOnly?: boolean;
}

function valueAsString(value: unknown) {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return '';
}

function isAnswered(field: TemplateField, response?: InspectionResponse) {
  if (field.type === 'instruction') return true;
  if (!response) return false;
  if (field.type === 'photo' || field.type === 'media') return (response.mediaUris?.length ?? 0) > 0;
  if (field.type === 'signature') {
    const hasName = response.value !== undefined && response.value !== null && response.value !== '';
    const hasAttachment = (response.attachments ?? []).some(a => a.type === 'general');
    return Boolean(hasName && hasAttachment);
  }
  if (field.type === 'checkbox') return Boolean(response.value);
  return response.value !== undefined && response.value !== null && response.value !== '';
}

function optionsFor(field: TemplateField): FieldOption[] {
  if (field.options?.length) return field.options;
  if (field.type === 'pass_fail') {
    return [
      { id: `${field.id}-ok`, field_id: field.id, label: 'OK', value: 'ok', score_value: 1 },
      { id: `${field.id}-not-ok`, field_id: field.id, label: 'Not OK', value: 'not_ok', score_value: 0 },
      { id: `${field.id}-na`, field_id: field.id, label: 'N/A', value: 'na', score_value: 0 },
    ];
  }
  return [];
}

function dateInputValue(value: unknown, includeTime = false) {
  const text = valueAsString(value);
  if (!text) return '';
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text.slice(0, 10);
  if (!includeTime) return date.toISOString().slice(0, 10);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

const InspectionQuestionCard: React.FC<InspectionQuestionCardProps> = ({
  field,
  response,
  index,
  onValueChange,
  onNoteChange,
  onAddMedia,
  onRemoveMedia,
  onCreateAction,
  readOnly = false,
}) => {
  const [isNoteOpen, setIsNoteOpen] = useState(Boolean(response?.note));
  const fileInputRef = useRef<HTMLInputElement>(null);
  const answered = isAnswered(field, response);
  const note = response?.note ?? '';
  const mediaUris = response?.mediaUris ?? [];
  const isInstruction = field.type === 'instruction';

  const choices = useMemo(() => optionsFor(field), [field]);

  const handleFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    files.forEach(file => {
      onAddMedia(field.id, file);
    });
    event.target.value = '';
  };

  const renderField = () => {
    const value = response?.value;

    if (isInstruction) {
      const instructionText = String(field.config?.text ?? field.label);
      const images = Array.isArray(field.config?.image_urls) ? field.config.image_urls as string[] : [];
      return (
        <div className="rounded-lg border border-primary-blue/15 bg-primary-blue/[0.04] p-4">
          <div className="flex gap-3">
            <FileText className="mt-0.5 h-5 w-5 shrink-0 text-primary-blue" />
            <div className="min-w-0 flex-1">
              <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">{instructionText}</p>
              {images.length > 0 && <div className="mt-3 grid gap-2 sm:grid-cols-2">{images.map(url => <img key={url} src={url} alt="Instruksi" className="max-h-64 w-full rounded-lg border border-divider object-cover" />)}</div>}
            </div>
          </div>
        </div>
      );
    }

    if (field.type === 'pass_fail' || field.type === 'dropdown' || field.type === 'multiple_choice') {
      return (
        <div className="grid gap-2 sm:grid-cols-3">
          {choices.map(option => {
            const active = valueAsString(value) === option.value;
            return (
              <button
                key={option.id}
                type="button"
                disabled={readOnly}
                onClick={() => onValueChange(field.id, option.value)}
                className={cn(
                  'min-h-11 rounded-lg border px-3 py-2 text-sm font-semibold transition',
                  active
                    ? 'border-primary-blue bg-primary-blue text-[#181a20] shadow-sm'
                    : 'border-divider bg-card text-foreground hover:border-primary-blue/40 hover:bg-primary-blue/[0.03]',
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      );
    }

    if (field.type === 'checkbox') {
      return (
        <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-divider bg-card p-3 text-sm font-semibold text-foreground hover:border-primary-blue/30">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-divider text-primary-blue"
            checked={Boolean(value)}
            onChange={event => onValueChange(field.id, event.target.checked)}
            disabled={readOnly}
          />
          Tandai sudah sesuai
        </label>
      );
    }

    if (field.type === 'number') {
      return (
        <input
          type="number"
          className="form-input"
          value={valueAsString(value)}
          onChange={event => onValueChange(field.id, event.target.value ? Number(event.target.value) : '')}
          min={field.config?.min}
          max={field.config?.max}
          step={field.config?.step}
          disabled={readOnly}
          placeholder="Masukkan angka"
        />
      );
    }

    if (field.type === 'inspection_date' || field.type === 'datetime' || field.type === 'title_inspection_date') {
      return (
        <div className="relative">
          <CalendarDays className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type={field.type === 'datetime' && !field.config?.date_only ? 'datetime-local' : 'date'}
            className="form-input pl-10"
            value={dateInputValue(value, field.type === 'datetime' && !field.config?.date_only)}
            onChange={event => onValueChange(field.id, event.target.value)}
            disabled={readOnly}
          />
        </div>
      );
    }

    if (field.type === 'photo' || field.type === 'media') {
      return (
        <div className="space-y-3">
          <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />
          <button
            type="button"
            disabled={readOnly || mediaUris.length >= Number(field.config?.max_files ?? 10)}
            onClick={() => fileInputRef.current?.click()}
            className="flex min-h-28 w-full flex-col items-center justify-center rounded-lg border border-dashed border-primary-blue/35 bg-primary-blue/[0.03] text-center transition hover:bg-primary-blue/[0.06]"
          >
            <ImagePlus className="mb-2 h-6 w-6 text-primary-blue" />
            <span className="text-sm font-semibold text-foreground">Upload media inspeksi</span>
            <span className="mt-1 text-xs text-muted-foreground">JPG atau PNG, bisa lebih dari satu</span>
          </button>
        </div>
      );
    }

    if (field.type === 'signature') {
      const name = valueAsString(value);
      const signatureAttachments = (response?.attachments ?? []).filter(a => a.type === 'general');
      const hasSigned = signatureAttachments.length > 0;
      const signatureUri = signatureAttachments[0]?.file_url ?? signatureAttachments[0]?.uri;

      const handleClear = () => {
        if (signatureUri) {
          onRemoveMedia(field.id, signatureUri);
        }
      };

      return (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <input
              className="form-input"
              value={name}
              onChange={event => onValueChange(field.id, event.target.value)}
              disabled={readOnly}
              placeholder="Nama penandatangan"
            />
            {hasSigned ? (
              <button
                type="button"
                onClick={handleClear}
                disabled={readOnly}
                className="btn-secondary justify-center border-success-green/25 bg-success-green/10 text-success-green"
              >
                <Trash2 className="h-4 w-4" />
                Hapus TTD
              </button>
            ) : <span className="inline-flex items-center gap-2 rounded-lg bg-surface px-3 py-2 text-xs font-semibold text-stone"><PenLine className="h-4 w-4" /> Belum ditandatangani</span>}
          </div>
          {!hasSigned && !readOnly && <SignaturePad filename={`signature-${field.id}.png`} onSave={file => onAddMedia(field.id, file)} />}
          {signatureUri && (
            <div className="mt-2 max-w-xs rounded-lg border border-divider bg-surface p-2">
              <p className="mb-1 text-[10px] font-semibold text-muted-foreground uppercase">File TTD:</p>
              <img src={signatureUri} alt="Signature Preview" className="max-h-20 object-contain" />
            </div>
          )}
        </div>
      );
    }

    if (field.type === 'slider') {
      const min = Number(field.config?.min ?? 0);
      const max = Number(field.config?.max ?? 100);
      const step = Number(field.config?.step ?? 1);
      const current = typeof value === 'number' ? value : min;
      return (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-stone"><span>{min}</span><span className="rounded-full bg-primary-blue/10 px-3 py-1 text-primary-blue">{current}</span><span>{max}</span></div>
          <input type="range" min={min} max={max} step={step} value={current} disabled={readOnly} onChange={event => onValueChange(field.id, Number(event.target.value))} className="w-full accent-primary-blue" />
        </div>
      );
    }

    if (field.type === 'location') {
      const location = typeof value === 'object' && value !== null ? value as Record<string, unknown> : null;
      return (
        <div className="flex flex-col gap-2 sm:flex-row">
          <input className="form-input flex-1" readOnly value={location ? `${location.latitude ?? '-'}, ${location.longitude ?? '-'}` : valueAsString(value)} placeholder="Belum ada lokasi" />
          <button type="button" disabled={readOnly || !navigator.geolocation} onClick={() => navigator.geolocation.getCurrentPosition(position => onValueChange(field.id, { latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy }))} className="btn-secondary justify-center"><MapPin className="h-4 w-4" /> Ambil lokasi</button>
        </div>
      );
    }

    if (field.type === 'title_site' || field.type === 'title_asset' || field.type === 'title_company' || field.type === 'title_document_number') {
      return (
        <input
          className="form-input"
          value={valueAsString(value)}
          onChange={event => onValueChange(field.id, event.target.value)}
          disabled={readOnly}
          placeholder="Masukkan data"
        />
      );
    }

    const multiline = field.config?.multiline !== false;
    return multiline ? (
      <textarea className="form-input min-h-24" value={valueAsString(value)} maxLength={field.config?.max_length} disabled={readOnly} onChange={event => onValueChange(field.id, event.target.value)} placeholder="Tulis jawaban..." />
    ) : (
      <input className="form-input" value={valueAsString(value)} maxLength={field.config?.max_length} disabled={readOnly} onChange={event => onValueChange(field.id, event.target.value)} placeholder="Tulis jawaban..." />
    );
  };

  return (
    <article
      className={cn(
        'overflow-hidden rounded-lg border bg-card shadow-sm transition',
        answered ? 'border-success-green/25' : field.required ? 'border-danger-red/20' : 'border-divider',
      )}
    >
      {!isInstruction && (
        <div className="flex items-start gap-3 border-b border-divider/70 px-4 py-4">
          {index !== undefined && (
            <span
              className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                answered ? 'bg-success-green text-white' : 'bg-surface text-muted-foreground',
              )}
            >
              {index + 1}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold leading-6 text-foreground">
              {field.required && <span className="text-danger-red">* </span>}
              {field.label}
            </h3>
            <p className="mt-1 text-[11px] font-medium uppercase text-muted-foreground">
              {field.type.replace(/_/g, ' ')}
            </p>
          </div>
          {answered && <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-success-green" />}
        </div>
      )}

      <div className={cn('space-y-4 p-4', isInstruction && 'p-0')}>{renderField()}</div>

      {!isInstruction && mediaUris.length > 0 && field.type !== 'photo' && field.type !== 'media' && (
        <div className="flex gap-2 overflow-x-auto px-4 pb-4">
          {mediaUris.map((uri, idx) => (
            <div key={`${uri}-${idx}`} className="group relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-divider">
              <img src={uri} alt={`Media ${idx + 1}`} className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => onRemoveMedia(field.id, uri)}
                disabled={readOnly}
                className="absolute right-1 top-1 rounded bg-slate-950/60 p-1 text-white opacity-0 transition group-hover:opacity-100"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {(field.type === 'photo' || field.type === 'media') && mediaUris.length > 0 && (
        <div className="grid grid-cols-2 gap-3 px-4 pb-4 sm:grid-cols-3">
          {mediaUris.map((uri, idx) => (
            <div key={`${uri}-${idx}`} className="group relative aspect-video overflow-hidden rounded-lg border border-divider">
              <img src={uri} alt={`Media ${idx + 1}`} className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => onRemoveMedia(field.id, uri)}
                disabled={readOnly}
                className="absolute right-2 top-2 rounded-lg bg-slate-950/70 p-1.5 text-white opacity-0 transition group-hover:opacity-100"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {!isInstruction && (
        <div className="flex flex-wrap items-center border-t border-divider/70 bg-surface/40 px-3 py-2">
          <button
            type="button"
            onClick={() => setIsNoteOpen(prev => !prev)}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition hover:bg-card',
              note ? 'text-primary-blue' : 'text-muted-foreground',
            )}
          >
            <StickyNote className="h-4 w-4" />
            {note ? 'Edit catatan' : 'Catatan'}
          </button>
          {field.type !== 'photo' && field.type !== 'media' && (
            <>
              <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={readOnly}
                className={cn(
                  'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition hover:bg-card',
                  mediaUris.length > 0 ? 'text-primary-blue' : 'text-muted-foreground',
                )}
              >
                <Camera className="h-4 w-4" />
                Media {mediaUris.length > 0 ? `(${mediaUris.length})` : ''}
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => onCreateAction?.(field.id)}
            disabled={readOnly || !onCreateAction}
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-muted-foreground transition hover:bg-card"
          >
            <Plus className="h-4 w-4" />
            Tindakan
          </button>
        </div>
      )}

      {isNoteOpen && !isInstruction && (
        <div className="border-t border-divider/70 p-4">
          <textarea
            className="form-input min-h-20"
            value={note}
            onChange={event => onNoteChange(field.id, event.target.value)}
            disabled={readOnly}
            placeholder="Tulis catatan untuk pertanyaan ini..."
          />
        </div>
      )}
    </article>
  );
};

export default InspectionQuestionCard;
