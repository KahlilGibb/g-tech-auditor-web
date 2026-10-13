import { useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Button, Field, Input, Select, Textarea } from '../ui';
import { AudiencePicker } from './AudiencePicker';
import { TrainingModal } from './TrainingModal';
import { trainingService } from '../../services/trainingService';
import { getApiErrorMessage } from '../../lib/apiResponse';
import { fromWibInput, safeTrainingUrl, toWibInput } from '../../utils/training';
import type { ScheduleFields, ScheduleStatus, TrainingAudience, TrainingSchedule } from '../../types/training';

export function ScheduleEditor({ item, orgId, onClose, onSaved }: {
  item: TrainingSchedule | null; orgId: string; onClose: () => void; onSaved: () => void;
}) {
  const { t } = useTranslation('translation', { keyPrefix: 'training.production' });
  const [title, setTitle] = useState(item?.title ?? '');
  const [description, setDescription] = useState(item?.description ?? '');
  const [startsAt, setStartsAt] = useState(item ? toWibInput(item.starts_at) : '');
  const [endsAt, setEndsAt] = useState(item?.ends_at ? toWibInput(item.ends_at) : '');
  const [trainer, setTrainer] = useState(item?.trainer ?? '');
  const [location, setLocation] = useState(item?.location ?? '');
  const [url, setUrl] = useState(item?.meeting_url ?? '');
  const [audience, setAudience] = useState<TrainingAudience>(item?.audience_type ?? 'all_dealers');
  const [selected, setSelected] = useState(item?.assignee_group_ids ?? []);
  const [status, setStatus] = useState<ScheduleStatus>(item?.status ?? 'draft');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const savingRef = useRef(false);
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (savingRef.current) return;
    setError('');
    const start = fromWibInput(startsAt);
    const end = endsAt ? fromWibInput(endsAt) : null;
    if (!title.trim()) { setError(t('titleRequired')); return; }
    if (!start) { setError(t('invalidDate')); return; }
    if (endsAt && (!end || new Date(end).getTime() < new Date(start).getTime())) { setError(t('invalidEnd')); return; }
    if (url.trim() && !safeTrainingUrl(url.trim())) { setError(t('invalidUrl')); return; }
    if (audience === 'selected_dealers' && selected.length === 0) { setError(t('dealerRequired')); return; }
    savingRef.current = true;
    setSaving(true);
    try {
      const fields: ScheduleFields = {
        title: title.trim(), description: description.trim(), starts_at: start, ends_at: end,
        trainer: trainer.trim(), location: location.trim(), meeting_url: url.trim(),
        audience_type: audience, assignee_group_ids: audience === 'all_dealers' ? [] : selected,
      };
      if (item) await trainingService.updateSchedule(item.id, { ...fields, status });
      else await trainingService.createSchedule({ ...fields, publish: status === 'published' });
      onSaved();
    } catch (err) { setError(getApiErrorMessage(err, t('saveError'))); }
    finally { savingRef.current = false; setSaving(false); }
  };
  return (
    <TrainingModal open onClose={() => { if (!savingRef.current) onClose(); }} size="lg" title={t(item ? 'editSchedule' : 'newSchedule')} footer={<>
      <Button variant="secondary" disabled={saving} onClick={onClose}>{t('cancel')}</Button>
      <Button type="submit" form="training-schedule-form" loading={saving}>{t(item ? 'save' : status === 'published' ? 'publish' : 'saveDraft')}</Button>
    </>}>
      <form id="training-schedule-form" onSubmit={save} className="space-y-5">
        {error && <div role="alert"><Alert>{error}</Alert></div>}
        <fieldset disabled={saving} className="space-y-5">
          <Field label={t('name')} htmlFor="schedule-title" required><Input id="schedule-title" maxLength={255} required value={title} onChange={e => setTitle(e.target.value)} /></Field>
          <Field label={t('description')} htmlFor="schedule-description"><Textarea id="schedule-description" value={description} onChange={e => setDescription(e.target.value)} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('startsAt')} htmlFor="schedule-start" required><Input id="schedule-start" type="datetime-local" required value={startsAt} onChange={e => setStartsAt(e.target.value)} /></Field>
            <Field label={t('endsAt')} htmlFor="schedule-end"><Input id="schedule-end" type="datetime-local" min={startsAt || undefined} value={endsAt} onChange={e => setEndsAt(e.target.value)} /></Field>
            <Field label={t('trainer')} htmlFor="schedule-trainer"><Input id="schedule-trainer" maxLength={255} value={trainer} onChange={e => setTrainer(e.target.value)} /></Field>
            <Field label={t('location')} htmlFor="schedule-location"><Input id="schedule-location" maxLength={255} value={location} onChange={e => setLocation(e.target.value)} /></Field>
          </div>
          <Field label={t('meetingUrl')} htmlFor="schedule-url"><Input id="schedule-url" type="url" placeholder="https://" value={url} onChange={e => setUrl(e.target.value)} /></Field>
          <AudiencePicker orgId={orgId} audience={audience} onAudience={setAudience} selected={selected} onSelected={setSelected} disabled={saving} />
          <Field label={t('status')} htmlFor="schedule-status"><Select id="schedule-status" value={status} onChange={e => setStatus(e.target.value as ScheduleStatus)}>
            <option value="draft">{t('draft')}</option><option value="published">{t('published')}</option>
            {item && <option value="cancelled">{t('cancelled')}</option>}
            {item?.status === 'archived' && <option value="archived">{t('archived')}</option>}
          </Select></Field>
        </fieldset>
      </form>
    </TrainingModal>
  );
}
