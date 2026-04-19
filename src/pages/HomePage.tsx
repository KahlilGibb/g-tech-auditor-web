import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  CheckCircle2,
  RotateCcw,
  Layers,
  Clock3,
  TriangleAlert,
  FileSearch,
  CalendarDays,
  CheckSquare,
  ChevronRight,
  Plus,
  Users
} from 'lucide-react';
import { cn } from '../utils/cn';
import { useDashboard } from '../hooks/useDashboard';
type AgendaTab = 'all' | 'inspections' | 'actions' | 'training';
type CardStatus = 'In Progress' | 'Draft' | 'Overdue';

const AGENDA_TABS: AgendaTab[] = ['all', 'inspections', 'actions', 'training'];

const TOP_DEALERS = [
  { name: 'Dealer Audi VW BSD', pct: 60 },
  { name: 'Dealer Nissan Pulo Gadung', pct: 57 },
  { name: 'Dealer KIA PIK', pct: 50 },
  { name: 'Dealer Nissan Sempaja', pct: 47 },
  { name: 'Dealer Nissan Aceh', pct: 43 },
];

function statusColor(s: CardStatus) {
  if (s === 'Overdue') return 'text-danger-red';
  if (s === 'Draft') return 'text-muted-foreground';
  return 'text-primary-blue';
}

function statusBg(s: CardStatus) {
  if (s === 'Overdue') return 'bg-danger-red/10';
  if (s === 'Draft') return 'bg-surface';
  return 'bg-primary-blue/10';
}

function statusLabelKey(s: CardStatus) {
  if (s === 'Overdue') return 'overdue';
  if (s === 'Draft') return 'draft';
  return 'inProgress';
}

function progressBarColor(pct: number) {
  if (pct >= 55) return 'bg-success-green';
  if (pct >= 48) return 'bg-primary-blue';
  return 'bg-warning-amber';
}

const StatChip: React.FC<{ icon: React.ReactNode; label: string; className?: string }> = ({ icon, label, className }) => (
  <div className={cn("px-4 py-2 rounded-full flex items-center gap-2 shadow-sm", className)}>
    {icon}
    <span className="text-sm font-semibold">{label}</span>
  </div>
);

const HomePage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { inspections, isLoading, error, refresh } = useDashboard();
  const [agendaTab, setAgendaTab] = useState<AgendaTab>('all');

  const stats = useMemo(() => ({ selesai: 8, aktif: 1, draft: 1, terlambat: 1 }), []);

  const IN_PROGRESS_CARDS = useMemo(() => {
    return inspections
      .filter((item: any) => item.status !== 'Complete')
      .map((item: any) => ({
        id: item.id,
        label: t('home.inProgress.label') || 'INSPECTION',
        title: item.title,
        subtitle: `${item.site} · ${item.templateName || 'Template'}`,
        time: item.date,
        status: item.status as CardStatus,
      }));
  }, [inspections, t]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('home.greeting')}</h1>
          <p className="text-muted-foreground mt-1">
            {t('home.today', { 
              date: new Date().toLocaleDateString(i18n.language === 'en' ? 'en-US' : 'id-ID', {
                weekday: 'long', day: 'numeric', month: 'short', year: 'numeric'
              }) 
            })}
          </p>
        </div>
        <button 
          onClick={() => refresh()}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-divider rounded-xl text-sm font-semibold text-foreground hover:bg-surface transition-all disabled:opacity-50 w-fit"
        >
          <RotateCcw className={cn("w-4 h-4", isLoading && "animate-spin")} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="p-4 bg-danger-red/10 border border-danger-red/20 text-danger-red rounded-2xl flex justify-between items-center">
          <p className="text-sm font-medium">{error}</p>
          <button onClick={() => refresh()} className="text-sm font-bold underline underline-offset-4">Try again</button>
        </div>
      )}

      {/* 4 Primary Metrics Row */}
      <div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar">
        <StatChip 
          icon={<CheckCircle2 className="w-4 h-4 text-white" />} 
          label={t('home.stats.completed', { count: stats.selesai })} 
          className="bg-gradient-to-r from-success-green to-emerald-400 text-white min-w-max"
        />
        <StatChip 
          icon={<Layers className="w-4 h-4 text-white" />} 
          label={t('home.stats.active', { count: stats.aktif })} 
          className="bg-gradient-to-r from-primary-blue to-blue-400 text-white min-w-max"
        />
        <StatChip 
          icon={<Clock3 className="w-4 h-4 text-white" />} 
          label={t('home.stats.draft', { count: stats.draft })} 
          className="bg-gradient-to-r from-slate-500 to-slate-400 text-white min-w-max"
        />
        <StatChip 
          icon={<TriangleAlert className="w-4 h-4 text-white" />} 
          label={t('home.stats.overdue', { count: stats.terlambat })} 
          className="bg-gradient-to-r from-danger-red to-red-400 text-white min-w-max"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Primary CTA Row */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button className="flex-1 h-14 rounded-2xl bg-primary-blue text-white shadow-md shadow-primary-blue/30 flex items-center justify-center gap-3 hover:bg-primary-blue-dark transition-colors">
              <FileSearch className="w-5 h-5" />
              <span className="font-semibold">{t('home.cta.start')}</span>
            </button>
            <button className="flex-1 h-14 rounded-2xl bg-white border border-divider text-foreground flex items-center justify-center gap-3 hover:bg-surface transition-colors">
              <Users className="w-5 h-5 text-muted-foreground" />
              <span className="font-semibold">{t('home.cta.training')}</span>
            </button>
          </div>

          {/* In Progress Sliding Cards */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold text-foreground">{t('home.inProgress.title')}</h2>
                <span className="px-2.5 py-0.5 rounded-full bg-primary-blue text-white text-xs font-bold">
                  {IN_PROGRESS_CARDS.length}
                </span>
              </div>
              <button className="flex items-center gap-1 text-sm font-semibold text-primary-blue hover:text-primary-blue-dark">
                {t('home.inProgress.viewAll')}
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar snap-x">
              {IN_PROGRESS_CARDS.map(card => (
                <div key={card.id} className="min-w-[280px] sm:min-w-[320px] max-w-[320px] bg-white rounded-2xl border border-divider shadow-sm overflow-hidden flex flex-col snap-start relative">
                   <div className={cn("h-1 w-full absolute top-0 left-0", card.status === 'Overdue' ? 'bg-danger-red' : card.status === 'Draft' ? 'bg-slate-400' : 'bg-primary-blue')} />
                   <div className="p-5 flex-1">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-1.5 text-primary-blue">
                          <CheckSquare className="w-4 h-4" />
                          <span className="text-[10px] font-bold tracking-widest uppercase">
                            {card.label}
                          </span>
                        </div>
                        <span className={cn("px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider", statusBg(card.status), statusColor(card.status))}>
                          {t(`home.status.${statusLabelKey(card.status)}`)}
                        </span>
                      </div>
                      <h3 className="font-bold text-foreground leading-snug line-clamp-1">{card.title}</h3>
                      <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">{card.subtitle}</p>
                      <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-divider bg-surface">
                        <Clock3 className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-[11px] font-medium text-muted-foreground">
                          {t('home.inProgress.updated', { time: card.time })}
                        </span>
                      </div>
                   </div>
                </div>
              ))}
              
              <button className="min-w-[140px] rounded-2xl border-2 border-dashed border-primary-blue/30 bg-primary-blue/5 flex flex-col items-center justify-center gap-3 hover:bg-primary-blue/10 transition-colors snap-start p-4">
                <div className="w-10 h-10 rounded-full bg-primary-blue/10 flex items-center justify-center">
                  <Plus className="w-5 h-5 text-primary-blue" />
                </div>
                <span className="text-sm font-semibold text-primary-blue text-center leading-tight whitespace-pre-wrap">
                  {t('home.inProgress.new')}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Top 5 Dealer Progress */}
          <div className="bg-white rounded-3xl border border-divider shadow-sm overflow-hidden">
            <div className="p-5">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                  {t('home.dealers.title')}
                </h2>
                <span className="px-2 py-0.5 rounded-md bg-primary-blue/10 text-primary-blue text-[10px] font-semibold">
                  {t('home.dealers.thisWeek')}
                </span>
              </div>
              
              <div className="space-y-4">
                {TOP_DEALERS.map((dealer, i) => (
                  <div key={dealer.name} className="flex items-center gap-3 pb-4 border-b border-divider last:border-0 last:pb-0">
                    <div className={cn("w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0", i < 3 ? "bg-primary-blue/10 text-primary-blue" : "bg-surface text-muted-foreground")}>
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{dealer.name}</p>
                      <div className="mt-2 h-1.5 rounded-full bg-surface overflow-hidden">
                        <div 
                          className={cn("h-full rounded-full transition-all", progressBarColor(dealer.pct))} 
                          style={{ width: `${dealer.pct}%` }} 
                        />
                      </div>
                    </div>
                    <span className={cn("text-sm font-bold w-12 text-right", progressBarColor(dealer.pct).replace('bg-', 'text-'))}>
                      {dealer.pct}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Agenda section */}
          <div>
            <h2 className="text-lg font-bold text-foreground mb-4">{t('home.agenda')}</h2>
            
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2 hide-scrollbar">
              {AGENDA_TABS.map(tab => (
                 <button
                   key={tab}
                   onClick={() => setAgendaTab(tab)}
                   className={cn(
                     "px-5 py-2 rounded-full text-sm font-semibold transition-all shadow-sm shrink-0",
                     agendaTab === tab ? "bg-primary-blue text-white" : "bg-white border border-divider text-muted-foreground hover:bg-surface"
                   )}
                 >
                   {t(`home.tabs.${tab}`)}
                 </button>
              ))}
            </div>

            <div className="bg-white rounded-3xl border border-divider shadow-sm p-8 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary-blue/10 flex items-center justify-center mb-5">
                <CalendarDays className="w-8 h-8 text-primary-blue" />
              </div>
              <h3 className="font-bold text-foreground">{t('home.emptyState.title')}</h3>
              <p className="text-sm text-muted-foreground mt-2 max-w-[260px] leading-relaxed">
                {t('home.emptyState.subtitle')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
