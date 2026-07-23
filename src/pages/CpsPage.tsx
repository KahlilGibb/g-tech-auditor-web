import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import {
  ListTodo,
  Presentation,
  CheckCircle2,
  AlertCircle,
  Trophy,
  ChevronLeft,
  ChevronRight,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import { cn } from '../utils/cn';
import { useTemplates } from '../hooks/useTemplates';
import SkeletonCard from '../components/ui/SkeletonLoader';
import { useAuth } from '../hooks/useAuth';
import { isAdminRole } from '../constants/rbac';
import { cpsService } from '../services/cpsService';
import { branchService } from '../services/managementService';
import { inspectionService } from '../services/inspectionService';
import { getApiErrorMessage } from '../lib/apiResponse';
import type { WeeklyCpsScores } from '../types/cps';
import {
  Badge,
  Card,
  EmptyState,
  IconButton,
  PageHeader,
  ProgressBar,
  SearchInput,
  Spinner,
  Tabs,
  Td,
  Th,
} from '../components/ui';

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
  const navigate = useNavigate();
  const { templates, isLoading: templatesLoading } = useTemplates();
  
  const [activeTab, setActiveTab] = useState<Tab>('templates');
  const [activeFilter, setActiveFilter] = useState<CpsStatus | 'Semua'>('Semua');
  const [query, setQuery] = useState('');

  const cpsTemplates = useMemo(() => {
    return templates.filter(t => t.form_type === 'cps');
  }, [templates]);

  const handleStartCps = async (templateId: string) => {
    const target = templates.find(t => t.id === templateId);
    if (!target) return;

    void Swal.fire({
      title: 'Memuat data cabang...',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    try {
      const branches = await branchService.list();
      Swal.close();

      if (!branches.length) {
        await Swal.fire({
          title: 'Tidak Ada Cabang',
          text: 'Silakan daftarkan cabang terlebih dahulu.',
          icon: 'error',
        });
        return;
      }

      const options: Record<string, string> = {};
      branches.forEach((b: any) => {
        options[b.id] = b.name;
      });

      const { value: branchId } = await Swal.fire({
        title: 'Mulai Pengisian CPS Baru',
        text: `Template: ${target.name}`,
        input: 'select',
        inputOptions: options,
        inputPlaceholder: 'Pilih Cabang / Target Group',
        showCancelButton: true,
        confirmButtonText: 'Mulai',
        cancelButtonText: 'Batal',
        customClass: {
          popup: 'gtech-swal-popup',
          confirmButton: 'gtech-swal-confirm',
          cancelButton: 'gtech-swal-cancel',
          input: 'form-input'
        },
        buttonsStyling: false,
        inputValidator: (value) => {
          if (!value) {
            return 'Anda harus memilih cabang!';
          }
          return null;
        }
      });

      if (!branchId) return;

      const title = `CPS / ${options[branchId]}`;

      const result = await inspectionService.createInspection({
        templateId,
        site: options[branchId],
        assignee: user?.name || 'Inspector',
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        groupId: branchId,
        title,
      });

      navigate(`/cps/session/${result.id}`);
    } catch (err) {
      console.error(err);
      Swal.fire({
        title: 'Gagal Memulai CPS',
        text: getApiErrorMessage(err),
        icon: 'error',
      });
    }
  };

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

  const scoreTone = (score: number | null) =>
    score === null ? 'text-stone' : score > 0.6 ? 'text-success-green' : score > 0 ? 'text-warning-amber' : 'text-danger-red';

  return (
    <div className="page-shell">
      <PageHeader eyebrow="Compliance scoring" title={t('cps.title')} subtitle={t('cps.subtitle')} />

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onChange={setActiveTab}
        tabs={[
          { value: 'templates', label: (<span className="flex items-center gap-2"><ListTodo className="h-4 w-4" />Templates</span>) as unknown as string },
          { value: 'progress', label: (<span className="flex items-center gap-2"><Presentation className="h-4 w-4" />Progress</span>) as unknown as string },
          ...(isAdmin
            ? [{ value: 'rankings' as Tab, label: (<span className="flex items-center gap-2"><Trophy className="h-4 w-4" />Rekap Mingguan</span>) as unknown as string }]
            : []),
        ]}
      />

      {/* Main area */}
      {activeTab === 'templates' && (
        <div>
          {templatesLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <SkeletonCard />
            </div>
          ) : cpsTemplates.length === 0 ? (
            <Card>
              <EmptyState icon={<ListTodo className="h-6 w-6" />} title={t('cps.empty')} />
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {cpsTemplates.map(tpl => (
                <Card key={tpl.id} interactive padded onClick={() => handleStartCps(tpl.id)} className="rounded-2xl">
                  <h3 className="font-semibold text-ink-deep">{tpl.name}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-stone">{tpl.description}</p>
                  <div className="mt-4 flex items-center justify-between border-t border-hairline-soft pt-4 text-xs text-stone">
                    <span>{tpl.author}</span>
                    <Badge tone="neutral">{tpl.questionCount} Questions</Badge>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'progress' && (
        <Card className="overflow-hidden">
          <div className="flex flex-col items-start justify-between gap-4 border-b border-hairline-soft bg-surface/40 p-5 sm:flex-row sm:items-center">
            <SearchInput
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search progress..."
              wrapClassName="sm:max-w-xs"
            />
            <div className="hide-scrollbar flex w-full gap-2 overflow-x-auto pb-1 sm:w-auto sm:pb-0">
              {PROGRESS_FILTERS.map(f => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className={cn(
                    'whitespace-nowrap rounded-full border px-4 py-2 text-[13px] font-semibold transition-colors',
                    activeFilter === f
                      ? 'border-ink-deep bg-ink-deep text-white'
                      : 'border-hairline-soft bg-card text-slate hover:bg-surface hover:text-ink-deep',
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
                  <Th>Assessment</Th>
                  <Th>Location</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Score</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline-soft">
                {filteredInspections.length === 0 ? (
                  <tr>
                    <td colSpan={4}>
                      <EmptyState icon={<Presentation className="h-6 w-6" />} title="No progress records found." />
                    </td>
                  </tr>
                ) : (
                  filteredInspections.map(item => (
                    <tr key={item.id} className="transition-colors hover:bg-surface/60">
                      <Td>
                        <p className="text-sm font-semibold text-ink-deep">{item.title}</p>
                        <p className="mt-0.5 text-xs text-stone">
                          {item.templateName} &middot; {item.date}
                        </p>
                      </Td>
                      <Td className="text-sm text-charcoal">{item.site}</Td>
                      <Td>
                        <Badge tone={item.status === 'Dinilai' ? 'success' : 'danger'}>
                          {item.status === 'Dinilai' ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                          {item.status}
                        </Badge>
                      </Td>
                      <Td className="text-right">
                        <div className="flex flex-col items-end">
                          <span className={cn('text-lg font-semibold tabular-nums', scoreTone(item.score))}>
                            {item.score !== null ? item.score : '—'}
                          </span>
                          {item.scoreNote && item.scoreNote !== '-' && (
                            <span className="max-w-[150px] truncate text-[10px] text-stone" title={item.scoreNote}>
                              {item.scoreNote}
                            </span>
                          )}
                        </div>
                      </Td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {activeTab === 'rankings' && (
        <Card className="overflow-hidden">
          <div className="flex flex-col items-start justify-between gap-4 border-b border-hairline-soft bg-surface/40 p-5 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-stone" />
              <span className="text-sm font-semibold text-ink-deep">Minggu Penilaian</span>
            </div>
            <div className="flex items-center gap-3">
              <IconButton onClick={handlePrevWeek} disabled={rankingsLoading} aria-label="Minggu sebelumnya">
                <ChevronLeft className="h-4 w-4" />
              </IconButton>
              <span className="rounded-full border border-hairline-soft bg-card px-3 py-1.5 font-mono text-sm text-ink-deep">
                {currentWeekStart} s/d {weeklyScores?.weekEnd || '-'}
              </span>
              <IconButton onClick={handleNextWeek} disabled={rankingsLoading} aria-label="Minggu berikutnya">
                <ChevronRight className="h-4 w-4" />
              </IconButton>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="table-header">
                <tr>
                  <Th className="w-16 text-center">Rank</Th>
                  <Th>Dealer</Th>
                  <Th>Skor Total</Th>
                  <Th>Kepatuhan</Th>
                  <Th>Sesi Selesai</Th>
                  <Th className="text-right">Keterangan</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline-soft">
                {rankingsLoading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center">
                      <Spinner className="mx-auto h-6 w-6 text-primary-blue" />
                      <p className="mt-2 text-xs text-stone">Memuat peringkat dealer...</p>
                    </td>
                  </tr>
                ) : sortedDealers.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <EmptyState icon={<Trophy className="h-6 w-6" />} title="Tidak ada data peringkat pada minggu ini." />
                    </td>
                  </tr>
                ) : (
                  sortedDealers.map((dealer, idx) => {
                    const rank = idx + 1;
                    const isTop3 = rank <= 3;
                    return (
                      <tr key={dealer.groupId} className="transition-colors hover:bg-surface/60">
                        <Td className="text-center font-semibold">
                          {isTop3 ? (
                            <span
                              className={cn(
                                'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold text-white',
                                rank === 1 ? 'bg-warning-amber' : rank === 2 ? 'bg-stone' : 'bg-[oklch(52%_0.11_60)]',
                              )}
                            >
                              {rank}
                            </span>
                          ) : (
                            <span className="text-stone tabular-nums">{rank}</span>
                          )}
                        </Td>
                        <Td className="text-sm font-semibold text-ink-deep">{dealer.dealerName}</Td>
                        <Td className="text-sm text-charcoal tabular-nums">
                          {dealer.totalScore} / {dealer.maxPossibleScore}
                        </Td>
                        <Td>
                          <div className="flex max-w-[140px] items-center gap-2">
                            <ProgressBar
                              value={dealer.percentage}
                              tone={dealer.percentage >= 85 ? 'success' : dealer.percentage >= 70 ? 'warning' : 'danger'}
                              className="flex-1"
                            />
                            <span className="text-xs font-semibold text-ink-deep tabular-nums">{dealer.percentage}%</span>
                          </div>
                        </Td>
                        <Td className="text-sm text-charcoal tabular-nums">
                          {dealer.sessionsSubmitted} / {dealer.sessionsExpected}
                        </Td>
                        <Td className="text-right">
                          {dealer.sessionsLate > 0 ? (
                            <Badge tone="warning">
                              <AlertTriangle className="h-3.5 w-3.5" />
                              {dealer.sessionsLate} Terlambat
                            </Badge>
                          ) : (
                            <Badge tone="success">Tepat Waktu</Badge>
                          )}
                        </Td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};

export default CpsPage;
