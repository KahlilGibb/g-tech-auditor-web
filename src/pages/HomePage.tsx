import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  CheckSquare,
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

type AgendaTab = 'all' | 'inspections' | 'actions' | 'training';

const AGENDA_TABS: AgendaTab[] = ['all', 'inspections', 'actions', 'training'];

const TOP_DEALERS = [
  { name: 'Dealer Audi VW BSD', pct: 60 },
  { name: 'Dealer Nissan Pulo Gadung', pct: 57 },
  { name: 'Dealer KIA PIK', pct: 50 },
  { name: 'Dealer Nissan Sempaja', pct: 47 },
  { name: 'Dealer Nissan Aceh', pct: 43 },
];

function statusColor(status: InspectionStatus) {
  if (status === 'Overdue') return 'text-danger-red bg-danger-red/10';
  if (status === 'Draft') return 'text-muted-foreground bg-secondary';
  if (status === 'Complete') return 'text-success-green bg-success-green/10';
  return 'text-primary-blue bg-primary-blue/10';
}

function statusAccent(status: InspectionStatus) {
  if (status === 'Overdue') return 'bg-danger-red';
  if (status === 'Draft') return 'bg-slate-400';
  if (status === 'Complete') return 'bg-success-green';
  return 'bg-primary-blue';
}

function statusLabelKey(status: InspectionStatus) {
  if (status === 'Overdue') return 'overdue';
  if (status === 'Draft') return 'draft';
  if (status === 'Complete') return 'complete';
  return 'inProgress';
}

function progressBarColor(pct: number) {
  if (pct >= 55) return 'bg-success-green';
  if (pct >= 48) return 'bg-primary-blue';
  return 'bg-warning-amber';
}

function progressTextColor(pct: number) {
  if (pct >= 55) return 'text-success-green';
  if (pct >= 48) return 'text-primary-blue';
  return 'text-warning-amber';
}

const MetricCard: React.FC<{
  icon: React.ReactNode;
  value: string | number;
  label: string;
  tone: string;
}> = ({ icon, value, label, tone }) => (
  <div className="panel p-4">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{value}</p>
      </div>
      <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', tone)}>
        {icon}
      </div>
    </div>
  </div>
);

const HomePage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { inspections, isLoading, error, refresh } = useDashboard();
  const { user } = useAuth();
  const { profile } = useProfileStore();
  const [agendaTab, setAgendaTab] = useState<AgendaTab>('all');

  const displayName = profile.fullName || user?.name || 'Inspector';
  const firstName = displayName.split(' ')[0];
  const todayLabel = new Date().toLocaleDateString(
    i18n.language === 'en' ? 'en-US' : 'id-ID',
    { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' },
  );

  const summary = useMemo(() => {
    const completed = inspections.filter(item => item.status === 'Complete').length;
    const active = inspections.filter(item => item.status === 'In Progress').length;
    const draft = inspections.filter(item => item.status === 'Draft').length;
    const overdue = inspections.filter(item => item.status === 'Overdue').length;
    return { completed, active, draft, overdue };
  }, [inspections]);

  const inProgressCards = useMemo(
    () =>
      inspections
        .filter(item => item.status !== 'Complete')
        .map(item => ({
          id: item.id,
          label: t('home.inProgress.label') || 'INSPEKSI',
          title: item.title,
          subtitle: `${item.site} - ${item.templateName || 'Template'}`,
          time: item.startedAt ?? item.dueDate,
          status: item.status,
          progress: item.progress,
        })),
    [inspections, t],
  );

  return (
    <div className="page-shell">
      <section className="panel overflow-hidden">
        <div className="flex flex-col gap-5 border-b border-divider px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {todayLabel}
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
              {t('home.greeting')}, {firstName}
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Pantau inspeksi aktif, temuan penting, dan progres dealer dari satu ruang kerja.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              onClick={() => refresh()}
              disabled={isLoading}
              className="btn-secondary"
            >
              <RotateCcw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
              Refresh
            </button>
            <Link to="/inspections" className="btn-primary">
              <FileSearch className="h-4 w-4" />
              {t('home.cta.start')}
            </Link>
          </div>
        </div>

        <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            icon={<CheckCircle2 className="h-5 w-5 text-success-green" />}
            value={summary.completed}
            label="Selesai"
            tone="bg-success-green/10"
          />
          <MetricCard
            icon={<Layers className="h-5 w-5 text-primary-blue" />}
            value={summary.active}
            label="Aktif"
            tone="bg-primary-blue/10"
          />
          <MetricCard
            icon={<Clock3 className="h-5 w-5 text-muted-foreground" />}
            value={summary.draft}
            label="Draft"
            tone="bg-secondary"
          />
          <MetricCard
            icon={<AlertTriangle className="h-5 w-5 text-danger-red" />}
            value={summary.overdue}
            label="Terlambat"
            tone="bg-danger-red/10"
          />
        </div>
      </section>

      {error && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-danger-red/20 bg-danger-red/10 p-4 text-danger-red">
          <p className="text-sm font-medium">{error}</p>
          <button onClick={() => refresh()} className="text-sm font-semibold underline underline-offset-4">
            Coba lagi
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          <div className="grid gap-3 sm:grid-cols-2">
            <Link
              to="/inspections"
              className="panel flex min-h-[72px] items-center justify-between gap-4 p-4 transition hover:border-primary-blue/40 hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-blue/10 text-primary-blue">
                  <FileSearch className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{t('home.cta.start')}</p>
                  <p className="text-xs text-muted-foreground">Lanjutkan penilaian lapangan</p>
                </div>
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
            </Link>

            <Link
              to="/training"
              className="panel flex min-h-[72px] items-center justify-between gap-4 p-4 transition hover:border-primary-blue/40 hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{t('home.cta.training')}</p>
                  <p className="text-xs text-muted-foreground">Materi dan jadwal grooming</p>
                </div>
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          </div>

          <section className="panel overflow-hidden">
            <div className="panel-header">
              <div className="flex items-center gap-2.5">
                <h2 className="text-sm font-semibold text-foreground">{t('home.inProgress.title')}</h2>
                <span className="rounded-full bg-primary-blue/10 px-2 py-0.5 text-[11px] font-semibold text-primary-blue">
                  {inProgressCards.length}
                </span>
              </div>
              <Link
                to="/inspections"
                className="flex items-center gap-1 text-xs font-semibold text-primary-blue hover:text-primary-blue-dark"
              >
                {t('home.inProgress.viewAll')}
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="p-4">
              <div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar">
                {inProgressCards.map(card => (
                  <Link
                    to="/inspections"
                    key={card.id}
                    className="relative flex min-w-[270px] max-w-[290px] flex-col overflow-hidden rounded-lg border border-divider bg-white p-4 transition hover:border-primary-blue/30 hover:shadow-md"
                  >
                    <span className={cn('absolute inset-x-0 top-0 h-1', statusAccent(card.status))} />
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-primary-blue">
                        <CheckSquare className="h-3.5 w-3.5" />
                        {card.label}
                      </span>
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
                          statusColor(card.status),
                        )}
                      >
                        {t(`home.status.${statusLabelKey(card.status)}`)}
                      </span>
                    </div>
                    <h3 className="mt-3 line-clamp-1 text-sm font-semibold text-foreground">{card.title}</h3>
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                      {card.subtitle}
                    </p>
                    <div className="mt-4 flex items-center justify-between gap-3 border-t border-divider pt-3">
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                        <Clock3 className="h-3.5 w-3.5" />
                        {card.time}
                      </span>
                      <span className="text-[11px] font-semibold text-foreground">
                        {card.progress.completed}/{card.progress.total}
                      </span>
                    </div>
                  </Link>
                ))}

                <Link
                  to="/inspections"
                  className="flex min-w-[132px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-primary-blue/30 bg-primary-blue/[0.03] p-4 text-center transition hover:bg-primary-blue/[0.06]"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-blue/10">
                    <Plus className="h-4.5 w-4.5 text-primary-blue" />
                  </span>
                  <span className="text-xs font-semibold leading-tight text-primary-blue">
                    {t('home.inProgress.new')}
                  </span>
                </Link>
              </div>
            </div>
          </section>

          <section className="panel overflow-hidden">
            <div className="panel-header">
              <h2 className="text-sm font-semibold text-foreground">{t('home.agenda')}</h2>
            </div>
            <div className="px-5 pt-4">
              <div className="flex gap-1.5 overflow-x-auto pb-3 hide-scrollbar">
                {AGENDA_TABS.map(tab => (
                  <button
                    key={tab}
                    onClick={() => setAgendaTab(tab)}
                    className={cn(
                      'shrink-0 rounded-lg px-4 py-2 text-xs font-semibold transition',
                      agendaTab === tab
                        ? 'bg-primary-blue text-white'
                        : 'border border-divider bg-white text-muted-foreground hover:bg-surface hover:text-foreground',
                    )}
                  >
                    {t(`home.tabs.${tab}`)}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col items-center justify-center px-8 py-12 text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary-blue/10">
                <CalendarDays className="h-6 w-6 text-primary-blue" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">Semua agenda terkendali</h3>
              <p className="mt-2 max-w-[260px] text-xs leading-relaxed text-muted-foreground">
                Item terjadwal dan yang sudah jatuh tempo akan muncul di sini.
              </p>
            </div>
          </section>
        </div>

        <div className="space-y-5">
          <section className="panel overflow-hidden">
            <div className="panel-header">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary-blue" />
                <h2 className="text-xs font-semibold uppercase tracking-widest text-foreground">
                  {t('home.dealers.title')}
                </h2>
              </div>
              <span className="rounded-md bg-primary-blue/10 px-2 py-0.5 text-[10px] font-semibold text-primary-blue">
                {t('home.dealers.thisWeek')}
              </span>
            </div>

            <div className="px-5 py-3">
              {TOP_DEALERS.map((dealer, index) => (
                <div
                  key={dealer.name}
                  className="flex items-center gap-3 border-b border-divider py-3 last:border-0"
                >
                  <div
                    className={cn(
                      'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-semibold',
                      index < 3 ? 'bg-primary-blue/10 text-primary-blue' : 'bg-secondary text-muted-foreground',
                    )}
                  >
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold leading-snug text-foreground">
                      {dealer.name}
                    </p>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-secondary">
                      <div
                        className={cn('h-full rounded-full transition-all duration-500', progressBarColor(dealer.pct))}
                        style={{ width: `${dealer.pct}%` }}
                      />
                    </div>
                  </div>
                  <span className={cn('w-10 shrink-0 text-right text-[13px] font-semibold', progressTextColor(dealer.pct))}>
                    {dealer.pct}%
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="panel overflow-hidden">
            <div className="panel-header">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-foreground">
                Ringkasan Bulan Ini
              </h2>
            </div>
            <div className="space-y-4 p-5">
              {[
                { label: 'Tingkat penyelesaian', value: '73%', color: 'bg-success-green', pct: 73 },
                { label: 'Rata-rata skor', value: '84', color: 'bg-primary-blue', pct: 84 },
                { label: 'Tepat waktu', value: '60%', color: 'bg-warning-amber', pct: 60 },
              ].map(item => (
                <div key={item.label}>
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">{item.label}</span>
                    <span className="text-xs font-semibold text-foreground">{item.value}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                    <div
                      className={cn('h-full rounded-full transition-all duration-700', item.color)}
                      style={{ width: `${item.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
