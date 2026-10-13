import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { Alert, Button, SearchInput, Select, Spinner } from '../ui';
import { trainingService } from '../../services/trainingService';
import { getApiErrorMessage } from '../../lib/apiResponse';
import type { TrainingAudience, TrainingGroup } from '../../types/training';

interface Props {
  orgId: string;
  audience: TrainingAudience;
  selected: string[];
  onAudience: (value: TrainingAudience) => void;
  onSelected: (value: string[]) => void;
  disabled?: boolean;
}

export function AudiencePicker({ orgId, audience, selected, onAudience, onSelected, disabled }: Props) {
  const { t } = useTranslation('translation', { keyPrefix: 'training.production' });
  return (
    <fieldset className="space-y-3">
      <legend className="mb-2 text-xs font-semibold text-charcoal">{t('audience')}</legend>
      <Select aria-label={t('audience')} value={audience} disabled={disabled} onChange={e => onAudience(e.target.value as TrainingAudience)}>
        <option value="all_dealers">{t('allDealers')}</option>
        <option value="selected_dealers">{t('selectedDealers')}</option>
      </Select>
      {audience === 'selected_dealers' && <DealerPicker orgId={orgId} selected={selected} onSelected={onSelected} disabled={disabled} />}
    </fieldset>
  );
}

function DealerPicker({ orgId, selected, onSelected, disabled }: Pick<Props, 'orgId' | 'selected' | 'onSelected' | 'disabled'>) {
  const { t } = useTranslation('translation', { keyPrefix: 'training.production' });
  const [query, setQuery] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{ attempt: number; groups?: TrainingGroup[]; error?: string }>({ attempt: -1 });
  useEffect(() => {
    const controller = new AbortController();
    void trainingService.getAllGroups(orgId, controller.signal).then(
      groups => { if (!controller.signal.aborted) setState({ attempt, groups }); },
      error => { if (!controller.signal.aborted) setState({ attempt, error: getApiErrorMessage(error) }); },
    );
    return () => controller.abort();
  }, [orgId, attempt]);
  const groups = useMemo(() => state.groups ?? [], [state.groups]);
  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return groups.filter(group => `${group.name} ${group.code}`.toLowerCase().includes(keyword));
  }, [groups, query]);
  const loading = state.attempt !== attempt;
  const missing = loading || state.error ? [] : selected.filter(id => !groups.some(g => g.id === id));
  const toggle = (id: string) => onSelected(selected.includes(id) ? selected.filter(value => value !== id) : [...selected, id]);
  return (
    <div className="space-y-3 rounded-2xl border border-hairline-soft p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold text-charcoal" aria-live="polite">{t('selectedCount', { count: selected.length })}</p>
        <Button type="button" size="sm" variant="ghost" disabled={disabled || selected.length === 0} onClick={() => onSelected([])}>{t('clearSelection')}</Button>
      </div>
      <SearchInput aria-label={t('dealerSearch')} placeholder={t('dealerSearch')} value={query} onChange={e => setQuery(e.target.value)} disabled={disabled} />
      {loading ? <p className="flex items-center gap-2 py-4 text-sm text-stone"><Spinner />{t('groupsLoading')}</p> : state.error ? (
        <Alert action={<Button type="button" variant="secondary" size="sm" onClick={() => setAttempt(value => value + 1)}>{t('retry')}</Button>}>
          {t('groupsError')}: {state.error}
        </Alert>
      ) : <>
        <Button type="button" size="sm" variant="subtle" disabled={disabled || filtered.length === 0} onClick={() => onSelected([...new Set([...selected, ...filtered.map(g => g.id)])])}>{t('selectFiltered')}</Button>
        <div className="max-h-56 overflow-y-auto rounded-xl border border-hairline-soft">
          {filtered.length === 0 && <p className="p-4 text-sm text-stone">{t('noGroups')}</p>}
          {filtered.map(group => (
            <label key={group.id} className="flex min-h-11 cursor-pointer items-center gap-3 border-b border-hairline-soft p-3 text-sm last:border-b-0 hover:bg-surface">
              <input type="checkbox" className="h-4 w-4 shrink-0 accent-primary-blue" checked={selected.includes(group.id)} onChange={() => toggle(group.id)} disabled={disabled} />
              <span className="min-w-0 break-words text-charcoal">{group.name}{group.code && <span className="ml-2 text-xs text-stone">{group.code}</span>}</span>
            </label>
          ))}
        </div>
        {missing.map(id => <div key={id} className="flex items-center justify-between gap-2 text-xs text-danger-red">
          <span>{t('unavailableGroup')} ({id})</span>
          <Button type="button" size="sm" variant="ghost" aria-label={t('removeGroup')} disabled={disabled} onClick={() => toggle(id)}><X className="h-4 w-4" /></Button>
        </div>)}
      </>}
    </div>
  );
}
