import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Search,
  ListTodo,
  Presentation,
  CheckCircle2,
  AlertCircle,
  Trophy,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import { cn } from '../utils/cn';
import { useTemplates } from '../hooks/useTemplates';
import SkeletonCard from '../components/ui/SkeletonLoader';
import { useAuth } from '../hooks/useAuth';
import { isAdminRole } from '../constants/rbac';
import { cpsService } from '../services/cpsService';
import type { WeeklyCpsScores } from '../types/cps';

type Tab = 'templates' | 'progress' | 'rankings';
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
  const { user } = useAuth();
  const { templates, isLoading: templatesLoading } = useTemplates();
  
  const [activeTab, setActiveTab] = useState<Tab>('templates');
  const [activeFilter, setActiveFilter] = useState<CpsStatus | 'Semua'>('Semua');
  const [query, setQuery] = useState('');

  // Weekly Rankings States
  const [weeklyScores, setWeeklyScores] = useState<WeeklyCpsScores | null>(null);
  const [rankingsLoading, setRankingsLoading] = useState(false);
  const [currentWeekStart, setCurrentWeekStart] = useState('2026-06-29');

  const isAdmin = isAdminRole(user?.role);

  // Fetch rankings
  useEffect(() => {
    if (activeTab === 'rankings') {
      const fetchRankings = async () => {
        setRankingsLoading(true);
        try {
          const res = await cpsService.getWeeklyScores(currentWeekStart);
          setWeeklyScores(res);
        } catch (err) {
          console.error('Failed to fetch weekly scores:', err);
        } finally {
          setRankingsLoading(false);
        }
      };
      fetchRankings();
    }
  }, [activeTab, currentWeekStart]);

  const handlePrevWeek = () => {
    // Basic week navigation (subtract 7 days)
    const date = new Date(currentWeekStart);
    date.setDate(date.getDate() - 7);
    setCurrentWeekStart(date.toISOString().split('T')[0]);
  };

  const handleNextWeek = () => {
    // Basic week navigation (add 7 days)
    const date = new Date(currentWeekStart);
    date.setDate(date.getDate() + 7);
    setCurrentWeekStart(date.toISOString().split('T')[0]);
  };

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

  // Sort rankings by percentage desc
  const sortedDealers = useMemo(() => {
    if (!weeklyScores?.dealers) return [];
    return [...weeklyScores.dealers].sort((a, b) => b.percentage - a.percentage);
  }, [weeklyScores]);

  return (
    <div className="page-shell">
      {/* Header */}
      <div>
        <h1 className="page-title">{t('cps.title')}</h1>
        <p className="page-subtitle">{t('cps.subtitle')}</p>
      </div>

      {/* Tabs */}
      <div className="flex w-full rounded-lg border border-divider bg-card p-1 shadow-sm sm:w-fit">
        <button
          onClick={() => setActiveTab('templates')}
          className={cn(
            "flex-1 sm:flex-none px-6 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2",
            activeTab === 'templates' ? "bg-primary-blue text-[#181a20] shadow-sm" : "text-muted-foreground hover:bg-surface hover:text-foreground"
          )}
        >
          <ListTodo className="w-4 h-4" />
          Templates
        </button>
        <button
          onClick={() => setActiveTab('progress')}
          className={cn(
            "flex-1 sm:flex-none px-6 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2",
            activeTab === 'progress' ? "bg-primary-blue text-[#181a20] shadow-sm" : "text-muted-foreground hover:bg-surface hover:text-foreground"
          )}
        >
          <Presentation className="w-4 h-4" />
          Progress
        </button>
        {isAdmin && (
          <button
            onClick={() => setActiveTab('rankings')}
            className={cn(
              "flex-1 sm:flex-none px-6 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2",
              activeTab === 'rankings' ? "bg-primary-blue text-[#181a20] shadow-sm" : "text-muted-foreground hover:bg-surface hover:text-foreground"
            )}
          >
            <Trophy className="w-4 h-4" />
            Rekap Mingguan
          </button>
        )}
      </div>

      {/* Main Area */}
      <div className="panel min-h-[400px] overflow-hidden">
        {activeTab === 'templates' && (
          <div className="p-6 space-y-4">
            {templatesLoading ? (
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
                    className="form-input pl-9"
                  />
                </div>
                <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0 hide-scrollbar">
                  {PROGRESS_FILTERS.map(f => (
                    <button
                      key={f}
                      onClick={() => setActiveFilter(f)}
                      className={cn(
                        "whitespace-nowrap px-4 py-2 rounded-lg text-sm font-semibold transition-colors border",
                        activeFilter === f 
                          ? "bg-primary-blue text-[#181a20] border-primary-blue" 
                          : "bg-card text-muted-foreground border-divider hover:bg-surface"
                      )}
                    >
                      {f}
                    </button>
                  ))}
                </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="table-header">
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

        {activeTab === 'rankings' && (
          <div>
            <div className="p-6 border-b border-divider flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-surface/30">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm font-semibold text-foreground">Minggu Penilaian</span>
              </div>
              <div className="flex items-center gap-3">
                <button className="icon-button" onClick={handlePrevWeek} disabled={rankingsLoading}>
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm font-mono bg-card border border-divider px-3 py-1.5 rounded-lg text-foreground shadow-sm">
                  {currentWeekStart} s/d {weeklyScores?.weekEnd || '-'}
                </span>
                <button className="icon-button" onClick={handleNextWeek} disabled={rankingsLoading}>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="table-header">
                  <tr>
                    <th className="px-6 py-4 w-16 text-center">Rank</th>
                    <th className="px-6 py-4">Dealer</th>
                    <th className="px-6 py-4">Skor Total</th>
                    <th className="px-6 py-4">Kepatuhan</th>
                    <th className="px-6 py-4">Sesi Selesai</th>
                    <th className="px-6 py-4 text-right">Keterangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-divider">
                  {rankingsLoading ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary-blue" />
                        <p className="text-xs text-muted-foreground mt-2">Memuat peringkat dealer...</p>
                      </td>
                    </tr>
                  ) : sortedDealers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-muted-foreground">
                        Tidak ada data peringkat pada minggu ini.
                      </td>
                    </tr>
                  ) : (
                    sortedDealers.map((dealer, idx) => {
                      const rank = idx + 1;
                      const isTop3 = rank <= 3;
                      
                      return (
                        <tr key={dealer.groupId} className="hover:bg-surface/50 transition-colors">
                          <td className="px-6 py-4 text-center font-bold">
                            {isTop3 ? (
                              <span className={cn(
                                "inline-flex items-center justify-center w-6 h-6 rounded-full text-xs text-[#181a20]",
                                rank === 1 ? "bg-amber-400" :
                                rank === 2 ? "bg-slate-300" : "bg-amber-600"
                              )}>
                                {rank}
                              </span>
                            ) : rank}
                          </td>
                          <td className="px-6 py-4 font-semibold text-foreground text-sm">
                            {dealer.dealerName}
                          </td>
                          <td className="px-6 py-4 text-sm text-foreground">
                            {dealer.totalScore} / {dealer.maxPossibleScore}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 max-w-[120px]">
                              <div className="flex-1 bg-divider rounded-full h-2 overflow-hidden">
                                <div 
                                  className={cn(
                                    "h-full rounded-full",
                                    dealer.percentage >= 85 ? "bg-success-green" :
                                    dealer.percentage >= 70 ? "bg-warning-amber" : "bg-danger-red"
                                  )}
                                  style={{ width: `${dealer.percentage}%` }}
                                />
                              </div>
                              <span className="text-xs font-bold text-foreground">{dealer.percentage}%</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-foreground">
                            {dealer.sessionsSubmitted} / {dealer.sessionsExpected}
                          </td>
                          <td className="px-6 py-4 text-right">
                            {dealer.sessionsLate > 0 ? (
                              <span className="inline-flex items-center gap-1 text-xs text-warning-amber bg-warning-amber/10 px-2 py-0.5 rounded-full font-medium">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                {dealer.sessionsLate} Terlambat
                              </span>
                            ) : (
                              <span className="text-xs text-success-green bg-success-green/10 px-2 py-0.5 rounded-full font-medium">
                                Tepat Waktu
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
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
