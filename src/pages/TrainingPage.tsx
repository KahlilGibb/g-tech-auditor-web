import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Archive, BookOpen, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, ExternalLink, FileText, MapPin, Pencil, Plus, RefreshCw, User, Video } from 'lucide-react';
import { Alert, Badge, Button, Card, EmptyState, Field, IconButton, PageHeader, SearchInput, Select, Spinner, Tabs } from '../components/ui';
import { MaterialEditor } from '../components/training/MaterialEditor';
import { ScheduleEditor } from '../components/training/ScheduleEditor';
import { TrainingModal } from '../components/training/TrainingModal';
import { useAuth } from '../hooks/useAuth';
import { useTrainingList } from '../hooks/useTraining';
import { trainingService } from '../services/trainingService';
import { getApiErrorMessage } from '../lib/apiResponse';
import { appSwal } from '../lib/appSwal';
import { isTrainingAdmin, safeTrainingUrl } from '../utils/training';
import type { AuthUser } from '../types/auth';
import type { TrainingCategory, TrainingListQuery, TrainingMaterial, TrainingSchedule, ScheduleStatus } from '../types/training';

type Tab = 'materials' | 'schedules';
type Item = TrainingMaterial | TrainingSchedule;
type Editor = { kind: 'materials'; item: TrainingMaterial | null } | { kind: 'schedules'; item: TrainingSchedule | null };
const PAGE_SIZE = 20;
const categories: TrainingCategory[] = ['sop', 'checklist', 'video', 'pdf'];
const categoryLabels = { sop: 'SOP', checklist: 'Checklist', video: 'Video', pdf: 'PDF' };
const statusTone = (status: ScheduleStatus) => status === 'published' ? 'success' : status === 'cancelled' ? 'danger' : 'neutral';
const isMaterial = (item: Item): item is TrainingMaterial => 'category' in item;

export default function TrainingPage() {
  const { user } = useAuth();
  const { t } = useTranslation('translation', { keyPrefix: 'training.production' });
  if (!user?.orgId) return <div className="page-shell"><PageHeader title={t('title')} /><Alert>{t('noOrganization')}</Alert></div>;
  return <TrainingWorkspace key={`${user.id}:${user.orgId}:${user.role}`} user={user} orgId={user.orgId} />;
}

function TrainingWorkspace({ user, orgId }: { user: AuthUser; orgId: string }) {
  const { t, i18n } = useTranslation('translation', { keyPrefix: 'training.production' });
  const admin = isTrainingAdmin(user.role);
  const [tab, setTab] = useState<Tab>('materials');
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [category, setCategory] = useState<TrainingCategory | ''>('');
  const [status, setStatus] = useState<ScheduleStatus | ''>('');
  const [revision, setRevision] = useState(0);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [detail, setDetail] = useState<Item | null>(null);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);
  const refresh = () => setRevision(value => value + 1);
  const saved = () => { setEditor(null); setDetail(null); refresh(); void appSwal.success({ title: t('saveSuccess') }); };
  const edit = (item: Item) => {
    setDetail(null);
    setEditor(isMaterial(item) ? { kind: 'materials', item } : { kind: 'schedules', item });
  };
  const formatDate = (value: string) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat(i18n.language === 'id' ? 'id-ID' : 'en-US', {
      timeZone: 'Asia/Jakarta', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    }).format(date) + ' WIB';
  };
  const filters: TrainingListQuery = { search: debounced || undefined, category: tab === 'materials' ? category || undefined : undefined, status: admin ? status || undefined : undefined };
  return <div className="page-shell">
    <PageHeader eyebrow={t('eyebrow')} title={t('title')} subtitle={t('subtitle')} actions={<>
      <IconButton aria-label={t('refresh')} title={t('refresh')} onClick={refresh}><RefreshCw className="h-5 w-5" /></IconButton>
      {admin && <Button icon={<Plus className="h-4 w-4" />} onClick={() => setEditor(tab === 'materials' ? { kind: 'materials', item: null } : { kind: 'schedules', item: null })}>{t(tab === 'materials' ? 'newMaterial' : 'newSchedule')}</Button>}
    </>} />
    <Tabs value={tab} onChange={value => { setTab(value); setStatus(''); }} tabs={[
      { value: 'materials', label: <span className="flex items-center gap-2"><BookOpen className="h-4 w-4" />{t('materials')}</span> },
      { value: 'schedules', label: <span className="flex items-center gap-2"><CalendarDays className="h-4 w-4" />{t('schedules')}</span> },
    ]} />
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-4 border-b border-hairline-soft bg-surface/40 p-5 xl:flex-row xl:items-end">
        <SearchInput aria-label={t(tab === 'materials' ? 'searchMaterials' : 'searchSchedules')} placeholder={t(tab === 'materials' ? 'searchMaterials' : 'searchSchedules')} value={search} onChange={e => setSearch(e.target.value)} wrapClassName="sm:max-w-none xl:flex-1" />
        <div className="flex flex-wrap gap-3">
          {tab === 'materials' && <Field label={t('category')} htmlFor="training-category-filter" className="min-w-40 flex-1"><Select id="training-category-filter" value={category} onChange={e => setCategory(e.target.value as TrainingCategory | '')}>
            <option value="">{t('allCategories')}</option>{categories.map(value => <option value={value} key={value}>{categoryLabels[value]}</option>)}
          </Select></Field>}
          {admin && <Field label={t('status')} htmlFor="training-status-filter" className="min-w-48 flex-1"><Select id="training-status-filter" value={status} onChange={e => setStatus(e.target.value as ScheduleStatus | '')}>
            <option value="">{t('allStatuses')}</option><option value="draft">{t('draft')}</option><option value="published">{t('published')}</option>
            {tab === 'schedules' && <option value="cancelled">{t('cancelled')}</option>}<option value="archived">{t('archived')}</option>
          </Select></Field>}
        </div>
      </div>
      <TrainingListing key={`${tab}:${JSON.stringify(filters)}`} tab={tab} filters={filters} admin={admin} scope={`${user.id}:${orgId}`} revision={revision} formatDate={formatDate} onDetail={setDetail} onEdit={edit} onRefresh={refresh} />
    </Card>
    {editor?.kind === 'materials' && admin && <MaterialEditor item={editor.item} orgId={orgId} onClose={() => setEditor(null)} onSaved={saved} />}
    {editor?.kind === 'schedules' && admin && <ScheduleEditor item={editor.item} orgId={orgId} onClose={() => setEditor(null)} onSaved={saved} />}
    {detail && <TrainingDetail key={detail.id} item={detail} admin={admin} formatDate={formatDate} onClose={() => setDetail(null)} onEdit={() => edit(detail)} onRead={refresh} />}
  </div>;
}

function TrainingListing({ tab, filters, admin, scope, revision, formatDate, onDetail, onEdit, onRefresh }: {
  tab: Tab; filters: TrainingListQuery; admin: boolean; scope: string; revision: number;
  formatDate: (value: string) => string; onDetail: (item: Item) => void; onEdit: (item: Item) => void; onRefresh: () => void;
}) {
  const { t } = useTranslation('translation', { keyPrefix: 'training.production' });
  const [page, setPage] = useState(1);
  const [archiving, setArchiving] = useState<string | null>(null);
  const archiveRef = useRef(false);
  const load = tab === 'materials' ? trainingService.getMaterials : trainingService.getSchedules;
  const list = useTrainingList<Item>(load, { ...filters, page, limit: PAGE_SIZE }, scope, revision);
  const pages = Math.max(1, Math.ceil(list.total / PAGE_SIZE));
  const archive = async (item: Item) => {
    if (!admin || archiveRef.current) return;
    archiveRef.current = true;
    try {
      if (!await appSwal.confirm({ title: t('archiveTitle'), text: t('archiveMessage', { title: item.title }), confirmText: t('archive'), cancelText: t('cancel'), tone: 'danger' })) return;
      setArchiving(item.id);
      if (isMaterial(item)) await trainingService.archiveMaterial(item.id);
      else await trainingService.archiveSchedule(item.id);
      if (list.items.length === 1 && page > 1) setPage(value => value - 1);
      onRefresh();
      await appSwal.success({ title: t('archiveSuccess') });
    } catch (err) { await appSwal.error({ title: t('archiveError'), text: getApiErrorMessage(err) }); }
    finally { archiveRef.current = false; setArchiving(null); }
  };
  return <div aria-busy={list.loading}>
    {list.loading ? <div className="flex min-h-56 items-center justify-center gap-3 text-sm text-stone"><Spinner />{t('loading')}</div>
      : list.error ? <div className="p-5" role="alert"><Alert action={<Button variant="secondary" onClick={list.refresh}>{t('retry')}</Button>}>{t('loadError')}: {list.error}</Alert></div>
      : <>
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 pt-5 text-xs text-stone" aria-live="polite"><span>{t('results', { count: list.total })}</span>{tab === 'schedules' && <span>{t('timezone')}</span>}</div>
        {list.items.length === 0 ? <EmptyState icon={tab === 'materials' ? <BookOpen className="h-6 w-6" /> : <CalendarDays className="h-6 w-6" />} title={t(tab === 'materials' ? 'emptyMaterials' : 'emptySchedules')} description={t('emptyHint')} />
          : <div className={tab === 'materials' ? 'grid gap-4 p-5 md:grid-cols-2' : 'space-y-4 p-5'}>
            {list.items.map(item => <Card key={item.id} className="flex flex-col gap-4 p-5">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-blue/10 text-primary-blue">{isMaterial(item) ? item.category === 'video' ? <Video className="h-5 w-5" /> : <FileText className="h-5 w-5" /> : <CalendarDays className="h-5 w-5" />}</span>
                <div className="min-w-0 flex-1">
                  <button className="max-w-full text-left text-sm font-semibold text-ink-deep hover:text-primary-blue focus-visible:outline-primary-blue" onClick={() => onDetail(item)}><span className="break-words">{item.title}</span></button>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {isMaterial(item) && <><Badge tone="brand">{categoryLabels[item.category]}</Badge>{item.required && <Badge tone="warning">{t('required')}</Badge>}<Badge tone={item.read_at ? 'success' : 'neutral'}>{t(item.read_at ? 'read' : 'unread')}</Badge></>}
                    {admin && <Badge tone={statusTone(item.status)}>{t(item.status)}</Badge>}
                  </div>
                </div>
              </div>
              {item.description && <p className="line-clamp-3 break-words text-sm leading-relaxed text-stone">{item.description}</p>}
              {isMaterial(item) ? <p className="text-xs text-stone">{t('updated', { date: formatDate(item.updated_at) })}</p> : <>
                <div className="space-y-1 text-sm font-semibold text-primary-blue"><p>{formatDate(item.starts_at)}</p>{item.ends_at && <p>— {formatDate(item.ends_at)}</p>}</div>
                <div className="flex flex-wrap gap-4 text-xs text-stone">{item.trainer && <span className="inline-flex items-center gap-1.5"><User className="h-4 w-4" />{item.trainer}</span>}{item.location && <span className="inline-flex items-center gap-1.5 break-words"><MapPin className="h-4 w-4 shrink-0" />{item.location}</span>}</div>
              </>}
              {admin && <div className="flex flex-wrap gap-4 text-xs text-stone"><span>{t('assigneeCount', { count: item.assignee_group_count })} · {t(item.audience_type === 'all_dealers' ? 'allDealers' : 'selectedDealers')}</span>{isMaterial(item) && <span>{t('readCount', { count: item.read_count })}</span>}</div>}
              <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-hairline-soft pt-3">
                <Button size="sm" variant="secondary" onClick={() => onDetail(item)}>{t('details')}</Button>
                {admin && <>
                  <IconButton aria-label={`${t('edit')}: ${item.title}`} title={t('edit')} onClick={() => onEdit(item)}><Pencil className="h-4 w-4" /></IconButton>
                  {item.status !== 'archived' && <IconButton tone="danger" aria-label={`${t('archive')}: ${item.title}`} title={t('archive')} disabled={!!archiving} onClick={() => void archive(item)}>{archiving === item.id ? <Spinner /> : <Archive className="h-4 w-4" />}</IconButton>}
                </>}
              </div>
            </Card>)}
          </div>}
      </>}
    {(pages > 1 || page > 1) && <nav aria-label={t(tab)} className="flex items-center justify-between gap-3 border-t border-hairline-soft p-5">
      <IconButton aria-label={t('previous')} disabled={page <= 1 || list.loading} onClick={() => setPage(value => value - 1)}><ChevronLeft className="h-5 w-5" /></IconButton>
      <span className="text-xs text-stone">{list.loading ? t('loading') : t('page', { page, pages })}</span>
      <IconButton aria-label={t('next')} disabled={page >= pages || list.loading || !!list.error} onClick={() => setPage(value => value + 1)}><ChevronRight className="h-5 w-5" /></IconButton>
    </nav>}
  </div>;
}

function TrainingDetail({ item, admin, formatDate, onClose, onEdit, onRead }: {
  item: Item; admin: boolean; formatDate: (value: string) => string; onClose: () => void; onEdit: () => void; onRead: () => void;
}) {
  const { t } = useTranslation('translation', { keyPrefix: 'training.production' });
  const [readAt, setReadAt] = useState(isMaterial(item) ? item.read_at : undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const busyRef = useRef(false);
  const markRead = async () => {
    const result = await trainingService.markRead(item.id);
    setReadAt(result);
    onRead();
  };
  const open = async () => {
    if (busyRef.current) return;
    const popup = window.open('about:blank', '_blank');
    if (!popup) { setError(t('popupBlocked')); return; }
    popup.opener = null;
    busyRef.current = true; setBusy(true); setError('');
    try {
      const content = await trainingService.getContent(item.id);
      const url = safeTrainingUrl(content.url);
      if (!url) throw new Error(t('invalidUrl'));
      if (popup.closed) return;
      popup.location.replace(url);
      if (!readAt) {
        try { await markRead(); } catch { setError(t('readError')); }
      }
    } catch (err) { popup.close(); setError(getApiErrorMessage(err, t('openError'))); }
    finally { busyRef.current = false; setBusy(false); }
  };
  const acknowledge = async () => {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true); setError('');
    try { await markRead(); } catch (err) { setError(getApiErrorMessage(err, t('readError'))); }
    finally { busyRef.current = false; setBusy(false); }
  };
  const meeting = !isMaterial(item) && item.meeting_url ? safeTrainingUrl(item.meeting_url) : null;
  return <TrainingModal open size="lg" title={item.title} onClose={onClose} footer={<>
    {admin && <Button variant="secondary" onClick={onEdit}>{t('edit')}</Button>}<Button variant="secondary" onClick={onClose}>{t('close')}</Button>
  </>}>
    <div className="space-y-5">
      {error && <div role="alert"><Alert>{error}</Alert></div>}
      <div className="flex flex-wrap gap-2">{admin && <Badge tone={statusTone(item.status)}>{t(item.status)}</Badge>}{isMaterial(item) && <><Badge tone="brand">{categoryLabels[item.category]}</Badge><Badge tone={item.required ? 'warning' : 'neutral'}>{t(item.required ? 'required' : 'optional')}</Badge></>}</div>
      {item.description && <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate">{item.description}</p>}
      {isMaterial(item) ? <>
        {item.document_name && <p className="flex items-center gap-2 break-words text-sm text-stone"><FileText className="h-4 w-4 shrink-0" />{item.document_name}</p>}
        <p className="text-xs text-stone">{t('updated', { date: formatDate(item.updated_at) })}</p>
        <div className="flex flex-wrap items-center gap-3">
          <Button icon={<ExternalLink className="h-4 w-4" />} loading={busy} onClick={() => void open()}>{t('openMaterial')}</Button>
          {!readAt && <Button variant="secondary" disabled={busy} onClick={() => void acknowledge()}>{t('markRead')}</Button>}
          {readAt && <span className="inline-flex items-center gap-2 text-xs text-success-green" role="status"><CheckCircle2 className="h-4 w-4" />{t('read')} · {formatDate(readAt)}</span>}
        </div>
      </> : <>
        <div className="rounded-2xl bg-surface p-4 text-sm text-charcoal"><p className="font-semibold">{formatDate(item.starts_at)}</p>{item.ends_at && <p className="mt-1">— {formatDate(item.ends_at)}</p>}</div>
        {item.trainer && <p className="flex items-center gap-2 text-sm text-slate"><User className="h-4 w-4" />{item.trainer}</p>}
        {item.location && <p className="flex items-start gap-2 break-words text-sm text-slate"><MapPin className="mt-0.5 h-4 w-4 shrink-0" />{item.location}</p>}
        {meeting && <a href={meeting} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-ink-deep px-5 py-2.5 text-sm font-semibold text-white focus-visible:outline-primary-blue"><ExternalLink className="h-4 w-4" />{t('joinMeeting')}</a>}
      </>}
      {admin && <div className="flex flex-wrap gap-4 text-xs text-stone"><span>{t('assigneeCount', { count: item.assignee_group_count })} · {t(item.audience_type === 'all_dealers' ? 'allDealers' : 'selectedDealers')}</span>{isMaterial(item) && <span>{t('readCount', { count: item.read_count })}</span>}</div>}
    </div>
  </TrainingModal>;
}
