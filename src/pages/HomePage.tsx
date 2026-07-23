import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileSearch,
  Layers,
  Plus,
  RotateCcw,
  TrendingUp,
  Users,
} from 'lucide-react';
import { cn } from '../utils/cn';
import { useDashboard } from '../hooks/useDashboard';
import { useAuth } from '../hooks/useAuth';
import { useProfileStore } from '../stores/profileStore';
import type { InspectionStatus } from '../types/inspection';
import {
  Alert,
  Badge,
  Card,
  CardHeader,
  Eyebrow,
  EmptyState,
  ProgressBar,
  StatCard,
  Tabs,
} from '../components/ui';

type AgendaTab = 'all' | 'inspections' | 'actions' | 'training';

const AGENDA_TABS: AgendaTab[] = ['all', 'inspections', 'actions', 'training'];

type BadgeTone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger';

function statusTone(status: InspectionStatus): BadgeTone {
  if (status === 'Overdue') return 'danger';
  if (status === 'Draft') return 'neutral';
  if (status === 'Complete') return 'success';
  return 'brand';
}

function statusAccent(status: InspectionStatus) {
  if (status === 'Overdue') return 'bg-danger-red';
  if (status === 'Draft') return 'bg-stone';
  if (status === 'Complete') return 'bg-success-green';
  return 'bg-primary-blue';
}

function statusLabelKey(status: InspectionStatus) {
  if (status === 'Overdue') return 'overdue';
  if (status === 'Draft') return 'draft';
  if (status === 'Complete') return 'complete';
  return 'inProgress';
}

function progressTone(pct: number): 'success' | 'brand' | 'warning' {
  if (pct >= 55) return 'success';
  if (pct >= 48) return 'brand';
  return 'warning';
}

function progressTextColor(pct: number) {
  if (pct >= 55) return 'text-success-green';
  if (pct >= 48) return 'text-primary-blue';
  return 'text-warning-amber';
}

function formatDateStr(dateStr: string) {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

const HomePage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { inspections, dashboardData, isLoading, error, refresh } = useDashboard();
  const { user } = useAuth();
  const { profile } = useProfileStore();
  const [agendaTab, setAgendaTab] = useState<AgendaTab>('all');

  const displayName = profile.fullName || user?.name || 'Inspector';
  const firstName = displayName.split(' ')[0];
  const todayLabel = new Date().toLocaleDateString(i18n.language === 'en' ? 'en-US' : 'id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const summary = useMemo(() => {
    if (dashboardData?.counts) {
      return {
        completed: dashboardData.counts.completed,
        active: dashboardData.counts.active,
        draft: dashboardData.counts.draft,
        overdue: dashboardData.counts.overdue,
      };
    }
    const completed = inspections.filter(item => item.status === 'Complete').length;
    const active = inspections.filter(item => item.status === 'In Progress').length;
    const draft = inspections.filter(item => item.status === 'Draft').length;
    const overdue = inspections.filter(item => item.status === 'Overdue').length;
    return { completed, active, draft, overdue };
  }, [inspections, dashboardData]);

  const inProgressCards = useMemo(() => {
    if (dashboardData?.inProgress) {
      return dashboardData.inProgress.map(item => ({
        id: item.id,
        label: t('home.inProgress.label') || 'INSPEKSI',
        dealer: item.groupName || '—',
        title: item.title,
        subtitle: item.templateTitle || '',
        time: item.updatedAt,
        status: (item.status as InspectionStatus) || 'In Progress',
        progress:
          typeof item.progress === 'object' && item.progress !== null
            ? item.progress
            : { completed: 0, total: 10 },
      }));
    }
    return inspections
      .filter(item => item.status !== 'Complete')
      .map(item => ({
        id: item.id,
        label: t('home.inProgress.label') || 'INSPEKSI',
        dealer: item.site || '—',
        title: item.title,
        subtitle: item.templateName || 'Template',
        time: item.startedAt ?? item.dueDate,
        status: item.status,
        progress: item.progress,
      }));
  }, [inspections, dashboardData, t]);

  const topDealers = useMemo(() => {
    if (dashboardData?.topDealers) {
      return dashboardData.topDealers.map(d => ({ name: d.groupName, pct: d.percent }));
    }
    return [
      { name: 'Dealer Audi VW BSD', pct: 60 },
      { name: 'Dealer Nissan Pulo Gadung', pct: 57 },
      { name: 'Dealer KIA PIK', pct: 50 },
      { name: 'Dealer Nissan Sempaja', pct: 47 },
      { name: 'Dealer Nissan Aceh', pct: 43 },
    ];
  }, [dashboardData]);

  return (
    <div className="page-shell">
      {/* ── Welcome banner — dark Tally hero with grid + wash ──────────────── */}
      <section className="relative overflow-hidden rounded-3xl bg-ink-deep p-8 text-white md:p-10">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              'radial-gradient(700px 340px at 88% -20%, color-mix(in oklch, var(--color-primary-blue) 50%, transparent), transparent 62%), radial-gradient(520px 300px at 4% 120%, color-mix(in oklch, var(--color-companion) 20%, transparent), transparent 60%)',
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.5) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
            maskImage: 'radial-gradient(ellipse 70% 80% at 70% 20%, black 20%, transparent 70%)',
            WebkitMaskImage: 'radial-gradient(ellipse 70% 80% at 70% 20%, black 20%, transparent 70%)',
          }}
        />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Eyebrow className="text-white/55">
              <span className="tally-dot h-1.5 w-1.5" /> {todayLabel}
            </Eyebrow>
            <h1 className="mt-3 text-[2rem] font-semibold tracking-tight text-white md:text-4xl">
              {t('home.greeting')}, {firstName}.
            </h1>
            <p className="mt-2.5 max-w-2xl text-[15px] leading-relaxed text-white/60">
              Pantau inspeksi aktif, temuan penting, dan progres dealer dari satu ruang kerja yang
              dipersonalisasi.
            </p>
          </div>

          <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
            <button
              onClick={() => refresh()}
              disabled={isLoading}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/25 bg-transparent px-5 py-2.5 text-sm font-semibold text-white transition-all duration-150 hover:bg-white/10 disabled:opacity-50"
            >
              <RotateCcw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
              Refresh
            </button>
            <Link
              to="/inspections"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-primary-blue px-5 py-2.5 text-sm font-semibold text-white shadow-soft-sm transition-all duration-150 hover:-translate-y-px hover:bg-primary-blue-dark"
            >
              <FileSearch className="h-[18px] w-[18px]" />
              {t('home.cta.start')}
            </Link>
          </div>
        </div>
      </section>

      {/* ── Metric tiles ──────────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<CheckCircle2 className="h-5 w-5" />} value={summary.completed} label="Selesai" tone="success" />
        <StatCard icon={<Layers className="h-5 w-5" />} value={summary.active} label="Aktif" tone="brand" />
        <StatCard icon={<Clock3 className="h-5 w-5" />} value={summary.draft} label="Draft" tone="neutral" />
        <StatCard icon={<AlertTriangle className="h-5 w-5" />} value={summary.overdue} label="Terlambat" tone="danger" />
      </div>

      {error && (
        <Alert
          tone="danger"
          action={
            <button
              onClick={() => refresh()}
              className="shrink-0 text-sm font-bold underline underline-offset-4 hover:opacity-80"
            >
              Coba lagi
            </button>
          }
        >
          {error}
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* ── Left / center ──────────────────────────────────────────────── */}
        <div className="space-y-6 xl:col-span-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <Card interactive className="flex min-h-[76px] items-center justify-between gap-4 p-5" onClick={() => {}}>
              <Link to="/inspections" className="flex flex-1 items-center gap-3.5">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-surface text-primary-blue">
                  <FileSearch className="h-[22px] w-[22px]" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-ink-deep">{t('home.cta.start')}</span>
                  <span className="mt-0.5 block text-xs text-stone">Lanjutkan penilaian lapangan</span>
                </span>
                <ArrowUpRight className="ml-auto h-[18px] w-[18px] text-stone" />
              </Link>
            </Card>

            <Card interactive className="flex min-h-[76px] items-center justify-between gap-4 p-5" onClick={() => {}}>
              <Link to="/training" className="flex flex-1 items-center gap-3.5">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-surface text-charcoal">
                  <Users className="h-[22px] w-[22px]" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-ink-deep">{t('home.cta.training')}</span>
                  <span className="mt-0.5 block text-xs text-stone">Materi dan jadwal grooming</span>
                </span>
                <ArrowUpRight className="ml-auto h-[18px] w-[18px] text-stone" />
              </Link>
            </Card>
          </div>

          {/* In-progress list */}
          <Card className="overflow-hidden">
            <CardHeader
              title={
                <span className="flex items-center gap-2.5">
                  {t('home.inProgress.title')}
                  <Badge tone="brand">{inProgressCards.length}</Badge>
                </span>
              }
              action={
                <Link
                  to="/inspections"
                  className="flex items-center gap-1 text-xs font-semibold text-primary-blue transition-colors hover:text-primary-blue-dark"
                >
                  {t('home.inProgress.viewAll')}
                  <ChevronRight className="h-4 w-4" />
                </Link>
              }
            />

            <div className="hidden grid-cols-[1fr_160px_88px_80px] items-center gap-4 border-b border-hairline-soft bg-surface px-6 py-2 sm:grid">
              {['Inspeksi', 'Progres', 'Diperbarui', 'Status'].map((h, i) => (
                <span
                  key={h}
                  className={cn(
                    'font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-stone',
                    i === 2 && 'text-center',
                    i === 3 && 'text-right',
                  )}
                >
                  {h}
                </span>
              ))}
            </div>

            {inProgressCards.length === 0 ? (
              <EmptyState
                icon={<Layers className="h-6 w-6" />}
                title="Belum ada inspeksi berjalan"
                description="Inspeksi yang sedang dikerjakan akan tampil di sini."
              />
            ) : (
              <div className="divide-y divide-hairline-soft">
                {inProgressCards.slice(0, 5).map(card => {
                  const pct =
                    card.progress.total > 0
                      ? Math.round((card.progress.completed / card.progress.total) * 100)
                      : 0;
                  return (
                    <Link
                      to="/inspections"
                      key={card.id}
                      className="group grid grid-cols-1 items-center gap-3 px-6 py-4 transition-colors duration-100 hover:bg-surface/60 sm:grid-cols-[1fr_160px_88px_80px] sm:gap-4"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', statusAccent(card.status))} />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-ink-deep transition-colors group-hover:text-primary-blue">
                            {card.dealer}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-stone">{card.title}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5">
                        <ProgressBar value={pct} tone={progressTone(pct)} className="flex-1" />
                        <span className={cn('w-14 text-right text-[11px] font-semibold tabular-nums', progressTextColor(pct))}>
                          {card.progress.completed}/{card.progress.total}
                        </span>
                      </div>

                      <span className="hidden items-center justify-center gap-1 text-[11px] font-medium text-stone sm:flex">
                        <Clock3 className="h-3 w-3 shrink-0" />
                        {formatDateStr(card.time)}
                      </span>

                      <div className="hidden justify-end sm:flex">
                        <Badge tone={statusTone(card.status)}>{t(`home.status.${statusLabelKey(card.status)}`)}</Badge>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}

            <div className="flex items-center justify-between gap-4 border-t border-hairline-soft bg-surface/40 px-6 py-3">
              <p className="text-xs text-stone">
                {inProgressCards.length > 5
                  ? `+${inProgressCards.length - 5} inspeksi lainnya sedang berjalan`
                  : `${inProgressCards.length} inspeksi aktif`}
              </p>
              <div className="flex items-center gap-2">
                <Link
                  to="/inspections"
                  className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-card px-3.5 py-1.5 text-xs font-semibold text-ink-deep transition-colors hover:bg-surface"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {t('home.inProgress.new')}
                </Link>
                <Link
                  to="/inspections"
                  className="inline-flex items-center gap-1 rounded-full bg-ink-deep px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primary-blue"
                >
                  {t('home.inProgress.viewAll')}
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </Card>

          {/* Agenda */}
          <Card className="overflow-hidden">
            <CardHeader title={t('home.agenda')} />
            <div className="px-5 pt-4">
              <Tabs
                value={agendaTab}
                onChange={setAgendaTab}
                tabs={AGENDA_TABS.map(tab => ({ value: tab, label: t(`home.tabs.${tab}`) }))}
              />
            </div>
            <EmptyState
              icon={<CalendarDays className="h-6 w-6" />}
              title="Semua agenda terkendali"
              description="Item terjadwal dan yang sudah jatuh tempo akan otomatis muncul di sini."
            />
          </Card>
        </div>

        {/* ── Right rail ─────────────────────────────────────────────────── */}
        <div className="space-y-6">
          <Card className="overflow-hidden">
            <CardHeader
              icon={<TrendingUp className="h-4 w-4" />}
              title={t('home.dealers.title')}
              action={<Badge tone="brand">{t('home.dealers.thisWeek')}</Badge>}
            />
            <div className="px-5 py-3">
              {topDealers.map((dealer, index) => (
                <div key={dealer.name} className="flex items-center gap-3.5 border-b border-hairline-soft py-3.5 last:border-0">
                  <div
                    className={cn(
                      'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums',
                      index < 3 ? 'bg-ink-deep text-white' : 'bg-surface text-slate',
                    )}
                  >
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold leading-snug text-ink-deep">{dealer.name}</p>
                    <ProgressBar value={dealer.pct} tone={progressTone(dealer.pct)} className="mt-2" />
                  </div>
                  <span className={cn('w-11 shrink-0 text-right text-xs font-semibold', progressTextColor(dealer.pct))}>
                    {dealer.pct}%
                  </span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader title="Ringkasan Bulan Ini" />
            <div className="space-y-4 p-5">
              {[
                { label: 'Tingkat penyelesaian', value: '73%', pct: 73, tone: 'success' as const },
                { label: 'Rata-rata skor', value: '84', pct: 84, tone: 'brand' as const },
                { label: 'Tepat waktu', value: '60%', pct: 60, tone: 'warning' as const },
              ].map(item => (
                <div key={item.label}>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-semibold text-stone">{item.label}</span>
                    <span className="text-xs font-semibold text-ink-deep tabular-nums">{item.value}</span>
                  </div>
                  <ProgressBar value={item.pct} tone={item.tone} />
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
