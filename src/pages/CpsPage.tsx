import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, ListTodo, Presentation, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '../utils/cn';
import { useTemplates } from '../hooks/useTemplates';
import SkeletonCard from '../components/ui/SkeletonLoader';

type Tab = 'templates' | 'progress';
type CpsStatus = 'Dinilai' | 'Belum Dinilai';

// Minimal mock since backend isn't real yet
const CPS_MOCK = [
  {
    id: 'cps-1',
    title: 'Penilaian CPS Minggu 1',
    site: 'Dealer Sunter',
    score: 0.75,
    scoreNote: 'Nulis tanggal cap salah, kirimnya telat tanpa info',
    date: '3 Mar 2026',
    templateName: 'Laporan Mingguan CPS',
    status: 'Dinilai' as CpsStatus,
  },
  {
    id: 'cps-2',
    title: 'Penilaian CPS Minggu 2',
    site: 'Dealer Kelapa Gading',
    score: 0.5,
    scoreNote: 'Gada cap tanggal',
    date: '10 Mar 2026',
    templateName: 'Laporan Mingguan CPS',
    status: 'Dinilai' as CpsStatus,
  },
  {
    id: 'cps-3',
    title: 'Penilaian CPS Minggu 3',
    site: 'Dealer PIK',
    score: 0,
    scoreNote: 'Tidak ngumpulin diminggu itu',
    date: '17 Mar 2026',
    templateName: 'Laporan Mingguan CPS',
    status: 'Dinilai' as CpsStatus,
  },
  {
    id: 'cps-4',
    title: 'Penilaian CPS Minggu 4',
    site: 'Dealer Kemayoran',
    score: null,
    scoreNote: '-',
    date: '-',
    templateName: 'Laporan Mingguan CPS',
    status: 'Belum Dinilai' as CpsStatus,
  }
];

const PROGRESS_FILTERS: Array<CpsStatus | 'Semua'> = ['Semua', 'Dinilai', 'Belum Dinilai'];

const CpsPage: React.FC = () => {
  const { t } = useTranslation();
  const { templates, isLoading } = useTemplates();
  const [activeTab, setActiveTab] = useState<Tab>('templates');
  const [activeFilter, setActiveFilter] = useState<CpsStatus | 'Semua'>('Semua');
  const [query, setQuery] = useState('');

  const filteredInspections = useMemo(() => {
    const kw = query.toLowerCase();
    return CPS_MOCK.filter(item => {
      const matchSearch =
        item.title.toLowerCase().includes(kw) ||
        item.site.toLowerCase().includes(kw) ||
        item.templateName.toLowerCase().includes(kw);
      const matchFilter = activeFilter === 'Semua' || item.status === activeFilter;
      return matchSearch && matchFilter;
    });
  }, [query, activeFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('cps.title')}</h1>
        <p className="text-muted-foreground mt-1">{t('cps.subtitle')}</p>
      </div>

      {/* Tabs */}
      <div className="flex bg-surface p-1 rounded-xl w-full sm:w-fit">
        <button
          onClick={() => setActiveTab('templates')}
          className={cn(
            "flex-1 sm:flex-none px-6 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2",
            activeTab === 'templates' ? "bg-white text-primary-blue shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <ListTodo className="w-4 h-4" />
          Templates
        </button>
        <button
          onClick={() => setActiveTab('progress')}
          className={cn(
            "flex-1 sm:flex-none px-6 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2",
            activeTab === 'progress' ? "bg-white text-primary-blue shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Presentation className="w-4 h-4" />
          Progress
        </button>
      </div>

      {/* Main Area */}
      <div className="bg-white rounded-3xl border border-divider shadow-sm overflow-hidden min-h-[400px]">
        {activeTab === 'templates' && (
          <div className="p-6 space-y-4">
            {isLoading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"><SkeletonCard /></div>
            ) : templates.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">{t('cps.empty')}</div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {templates.map(t => (
                  <div key={t.id} className="p-5 rounded-2xl border border-divider hover:border-primary-blue/30 transition-colors cursor-pointer bg-surface/30">
                    <h3 className="font-bold text-foreground">{t.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{t.description}</p>
                    <div className="mt-4 pt-4 border-t border-divider flex justify-between items-center text-xs text-muted-foreground">
                      <span>{t.author}</span>
                      <span>{t.questionCount} Questions</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'progress' && (
          <div>
            <div className="p-6 border-b border-divider flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-surface/30">
               <div className="relative w-full sm:max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input 
                    type="text" 
                    placeholder="Search progress..." 
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-white border border-divider rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue/20"
                  />
                </div>
                <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0 hide-scrollbar">
                  {PROGRESS_FILTERS.map(f => (
                    <button
                      key={f}
                      onClick={() => setActiveFilter(f)}
                      className={cn(
                        "whitespace-nowrap px-4 py-2 rounded-xl text-sm font-semibold transition-colors border",
                        activeFilter === f 
                          ? "bg-primary-blue text-white border-primary-blue" 
                          : "bg-white text-muted-foreground border-divider hover:bg-surface"
                      )}
                    >
                      {f}
                    </button>
                  ))}
                </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-surface/50 text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Assessment</th>
                    <th className="px-6 py-4">Location</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-divider">
                  {filteredInspections.length === 0 ? (
                    <tr><td colSpan={4} className="text-center py-12 text-muted-foreground">No progress records found.</td></tr>
                  ) : (
                    filteredInspections.map(item => (
                      <tr key={item.id} className="hover:bg-surface/50 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-semibold text-foreground text-sm">{item.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{item.templateName} &middot; {item.date}</p>
                        </td>
                        <td className="px-6 py-4 text-sm text-foreground">{item.site}</td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
                            item.status === 'Dinilai' ? "bg-success-green/10 text-success-green" : "bg-danger-red/10 text-danger-red"
                          )}>
                            {item.status === 'Dinilai' ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                            {item.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex flex-col items-end">
                            <span className={cn(
                              "font-bold text-lg",
                              item.score === null ? "text-muted-foreground" :
                              item.score > 0.6 ? "text-success-green" : 
                              item.score > 0 ? "text-warning-amber" : "text-danger-red"
                            )}>
                              {item.score !== null ? item.score : '-'}
                            </span>
                            {item.scoreNote && item.scoreNote !== '-' && (
                              <span className="text-[10px] text-muted-foreground max-w-[150px] truncate" title={item.scoreNote}>
                                {item.scoreNote}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CpsPage;
