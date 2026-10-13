import { useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Button, Field, Input, Select, Textarea } from '../ui';
import { AudiencePicker } from './AudiencePicker';
import { TrainingModal } from './TrainingModal';
import { trainingService } from '../../services/trainingService';
import { getApiErrorMessage } from '../../lib/apiResponse';
import { safeTrainingUrl } from '../../utils/training';
import type { MaterialFields, MaterialStatus, TrainingAudience, TrainingCategory, TrainingDocument, TrainingMaterial } from '../../types/training';

export function MaterialEditor({ item, orgId, onClose, onSaved }: {
  item: TrainingMaterial | null; orgId: string; onClose: () => void; onSaved: () => void;
}) {
  const { t } = useTranslation('translation', { keyPrefix: 'training.production' });
  const [title, setTitle] = useState(item?.title ?? '');
  const [description, setDescription] = useState(item?.description ?? '');
  const [category, setCategory] = useState<TrainingCategory>(item?.category ?? 'sop');
  const [source, setSource] = useState(item?.external_url ? 'external' : 'document');
  const [url, setUrl] = useState(item?.external_url ?? '');
  const [file, setFile] = useState<File | null>(null);
  const [uploaded, setUploaded] = useState<TrainingDocument | null>(null);
  const [required, setRequired] = useState(item?.required ?? false);
  const [audience, setAudience] = useState<TrainingAudience>(item?.audience_type ?? 'all_dealers');
  const [selected, setSelected] = useState(item?.assignee_group_ids ?? []);
  const [status, setStatus] = useState<MaterialStatus>(item?.status ?? 'draft');
  const [phase, setPhase] = useState<'uploading' | 'saving' | null>(null);
  const [error, setError] = useState('');
  const savingRef = useRef(false);
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (savingRef.current) return;
    setError('');
    if (!title.trim()) { setError(t('titleRequired')); return; }
    if (audience === 'selected_dealers' && selected.length === 0) { setError(t('dealerRequired')); return; }
    if (source === 'external' && !safeTrainingUrl(url.trim())) { setError(t('invalidUrl')); return; }
    if (source === 'document' && !file && !uploaded && !item?.document_id) { setError(t('contentRequired')); return; }
    savingRef.current = true;
    try {
      let documentId = uploaded?.id ?? item?.document_id ?? null;
      if (source === 'document' && file && !uploaded) {
        setPhase('uploading');
        const document = await trainingService.uploadDocument(file);
        setUploaded(document);
        documentId = document.id;
      }
      setPhase('saving');
      const fields: MaterialFields = {
        title: title.trim(), description: description.trim(), category, required,
        document_id: source === 'document' ? documentId : null,
        external_url: source === 'external' ? url.trim() : '',
        audience_type: audience, assignee_group_ids: audience === 'all_dealers' ? [] : selected,
      };
      if (item) await trainingService.updateMaterial(item.id, { ...fields, status });
      else await trainingService.createMaterial({ ...fields, publish: status === 'published' });
      onSaved();
    } catch (err) { setError(getApiErrorMessage(err, t('saveError'))); }
    finally { savingRef.current = false; setPhase(null); }
  };
  return (
    <TrainingModal open onClose={() => { if (!savingRef.current) onClose(); }} size="lg" title={t(item ? 'editMaterial' : 'newMaterial')} footer={<>
      <Button variant="secondary" disabled={!!phase} onClick={onClose}>{t('cancel')}</Button>
      <Button type="submit" form="training-material-form" loading={!!phase}>{phase ? t(phase) : t(item ? 'save' : status === 'published' ? 'publish' : 'saveDraft')}</Button>
    </>}>
      <form id="training-material-form" onSubmit={save} className="space-y-5">
        {error && <div role="alert"><Alert>{error}</Alert></div>}
        <fieldset disabled={!!phase} className="space-y-5">
          <Field label={t('name')} htmlFor="material-title" required><Input id="material-title" maxLength={255} required value={title} onChange={e => setTitle(e.target.value)} /></Field>
          <Field label={t('description')} htmlFor="material-description"><Textarea id="material-description" value={description} onChange={e => setDescription(e.target.value)} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('category')} htmlFor="material-category"><Select id="material-category" value={category} onChange={e => setCategory(e.target.value as TrainingCategory)}>
              <option value="sop">SOP</option><option value="checklist">Checklist</option><option value="video">Video</option><option value="pdf">PDF</option>
            </Select></Field>
            <Field label={t('source')} htmlFor="material-source"><Select id="material-source" value={source} onChange={e => setSource(e.target.value)}>
              <option value="document">{t('document')}</option><option value="external">{t('external')}</option>
            </Select></Field>
          </div>
          {source === 'external' ? <Field label={t('externalUrl')} htmlFor="material-url" required>
            <Input id="material-url" type="url" required placeholder="https://" value={url} onChange={e => setUrl(e.target.value)} />
          </Field> : <Field label={t('chooseFile')} htmlFor="material-file" hint={t('fileHint')}>
            <Input id="material-file" type="file" accept=".pdf,.xls,.xlsx,image/*" onChange={e => { setFile(e.target.files?.[0] ?? null); setUploaded(null); }} />
            {(uploaded || item?.document_id) && <p className="break-words text-xs text-stone">{t('currentFile', { name: uploaded?.name ?? item?.document_name ?? t('document') })}</p>}
          </Field>}
          <label className="flex min-h-11 items-center gap-3 text-sm text-charcoal"><input type="checkbox" className="h-4 w-4 accent-primary-blue" checked={required} onChange={e => setRequired(e.target.checked)} />{t('required')}</label>
          <AudiencePicker orgId={orgId} audience={audience} onAudience={setAudience} selected={selected} onSelected={setSelected} disabled={!!phase} />
          <Field label={t('status')} htmlFor="material-status"><Select id="material-status" value={status} onChange={e => setStatus(e.target.value as MaterialStatus)}>
            <option value="draft">{t('draft')}</option><option value="published">{t('published')}</option>
            {item?.status === 'archived' && <option value="archived">{t('archived')}</option>}
          </Select></Field>
        </fieldset>
      </form>
    </TrainingModal>
  );
}
