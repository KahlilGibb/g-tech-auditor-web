import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BookOpen, CalendarDays, PlayCircle, FileText, CheckSquare, MapPin, User, Download } from 'lucide-react';
import { cn } from '../utils/cn';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Eyebrow,
  Modal,
  PageHeader,
  SearchInput,
  StatCard,
  Tabs,
} from '../components/ui';

type TrainingTab = 'guidance' | 'schedule';
type GuidanceCategory = 'SOP' | 'Checklist' | 'Video' | 'PDF';
type SessionStatus = 'Terjadwal' | 'Hari Ini' | 'Selesai';

type GuidanceItem = {
  id: string;
  title: string;
  category: GuidanceCategory;
  updatedAt: string;
  required?: boolean;
  overview: string;
};

type ScheduleItem = {
  id: string;
  title: string;
  date: string;
  location: string;
  trainer: string;
  status: SessionStatus;
};

const GUIDANCE_ITEMS: GuidanceItem[] = [
  {
    id: 'g1',
    title: 'SOP PDI Avanza 2024 - Dealer Sunter',
    category: 'SOP',
    updatedAt: 'Diperbarui 20 Feb 2026',
    required: true,
    overview: 'Panduan standar PDI untuk unit delivery, termasuk cek eksterior, interior, mesin, dan dokumen.',
  },
  {
    id: 'g2',
    title: 'Manual Audit 5R Showroom',
    category: 'PDF',
    updatedAt: 'Diperbarui 16 Feb 2026',
    overview: 'Standar audit kebersihan, kerapian, dan pengelolaan area showroom.',
  },
  {
    id: 'g3',
    title: 'Video Penanganan Temuan Kritis',
    category: 'Video',
    updatedAt: 'Diperbarui 10 Feb 2026',
    required: true,
    overview: 'Video training untuk eskalasi temuan kritis dari CRO ke HO beserta upload evidence.',
  },
  {
    id: 'g4',
    title: 'Checklist Kesiapan Bengkel & APD',
    category: 'Checklist',
    updatedAt: 'Diperbarui 18 Feb 2026',
    overview: 'Checklist kepatuhan penggunaan alat pelindung diri dan kerapian pit stop area.',
  },
];

const SCHEDULE_ITEMS: ScheduleItem[] = [
  {
    id: 's1',
    title: 'Grooming Inspektor Bulanan - Area Jakarta',
    date: 'Senin, 2 Mar 2026 • 09:00',
    location: 'Dealer Sunter (Offline)',
    trainer: 'Arif Nugraha',
    status: 'Hari Ini',
  },
  {
    id: 's2',
    title: 'Refresh SOP PDI Unit Baru',
    date: 'Rabu, 4 Mar 2026 • 14:00',
    location: 'Online (Google Meet)',
    trainer: 'Dina Wicaksana',
    status: 'Terjadwal',
  },
];

const CATEGORY_CHIPS = ['All', 'SOP', 'Checklist', 'Video', 'PDF'];

const categoryTone = (category: GuidanceCategory): 'brand' | 'warning' | 'neutral' | 'danger' => {
  if (category === 'Video') return 'warning';
  if (category === 'Checklist') return 'neutral';
  if (category === 'PDF') return 'danger';
  return 'brand';
};

const categoryIcon = (category: GuidanceCategory) => {
  if (category === 'Video') return <PlayCircle className="h-5 w-5" />;
  if (category === 'Checklist') return <CheckSquare className="h-5 w-5" />;
  return <FileText className="h-5 w-5" />;
};

const scheduleTone = (status: SessionStatus): 'brand' | 'success' | 'neutral' => {
  if (status === 'Hari Ini') return 'brand';
  if (status === 'Selesai') return 'success';
  return 'neutral';
};

const TrainingPage: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TrainingTab>('guidance');
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedItem, setSelectedItem] = useState<GuidanceItem | null>(null);

  // Interactive checklist state
  const [checkedList, setCheckedList] = useState<Record<string, boolean>>({
    'c1': false,
    'c2': false,
    'c3': false,
  });

  const toggleCheck = (id: string) => {
    setCheckedList(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredGuidance = useMemo(() => {
    const kw = query.toLowerCase();
    return GUIDANCE_ITEMS.filter(item => {
      const matchQuery = item.title.toLowerCase().includes(kw) || item.overview.toLowerCase().includes(kw);
      const matchCat = selectedCategory === 'All' || item.category === selectedCategory;
      return matchQuery && matchCat;
    });
  }, [query, selectedCategory]);

  const filteredSchedule = useMemo(() => {
    const kw = query.toLowerCase();
    return SCHEDULE_ITEMS.filter(item =>
      item.title.toLowerCase().includes(kw) ||
      item.trainer.toLowerCase().includes(kw) ||
      item.location.toLowerCase().includes(kw)
    );
  }, [query]);

  const totalRequired = GUIDANCE_ITEMS.filter(i => i.required).length;
  const upcomingCount = SCHEDULE_ITEMS.filter(s => s.status !== 'Selesai').length;

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Kompetensi"
        title={t('training.title')}
        subtitle={t('training.subtitle') || 'Compliance training and certifications.'}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={<BookOpen className="h-5 w-5" />}
          value={GUIDANCE_ITEMS.length}
          label="Materi Tersedia"
          tone="brand"
        />
        <StatCard
          icon={<CheckSquare className="h-5 w-5" />}
          value={totalRequired}
          label="Wajib Diselesaikan"
          tone="danger"
        />
        <StatCard
          icon={<CalendarDays className="h-5 w-5" />}
          value={upcomingCount}
          label="Sesi Mendatang"
          tone="success"
        />
      </div>

      <Tabs
        value={activeTab}
        onChange={setActiveTab}
        tabs={[
          { value: 'guidance', label: (<span className="flex items-center gap-2"><BookOpen className="h-4 w-4" />{t('training.tabs.guidance') || 'Guidance'}</span>) as React.ReactNode },
          { value: 'schedule', label: (<span className="flex items-center gap-2"><CalendarDays className="h-4 w-4" />{t('training.tabs.schedule') || 'Schedule'}</span>) as React.ReactNode },
        ]}
      />

      <Card className="overflow-hidden">
        <div className="flex flex-col items-start justify-between gap-4 border-b border-hairline-soft bg-surface/40 p-5 sm:flex-row sm:items-center">
          <SearchInput
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={activeTab === 'guidance' ? 'Search guidance...' : 'Search schedule...'}
          />

          {activeTab === 'guidance' && (
            <div className="flex w-full gap-1.5 overflow-x-auto pb-1 hide-scrollbar sm:w-auto sm:pb-0">
              {CATEGORY_CHIPS.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    'inline-flex shrink-0 items-center rounded-full px-4 py-2 text-[13px] font-semibold transition-all duration-150',
                    selectedCategory === cat
                      ? 'bg-ink-deep text-white shadow-soft-sm'
                      : 'border border-hairline-soft bg-card text-slate hover:bg-surface hover:text-ink-deep',
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="p-5">
          {activeTab === 'guidance' && (
            filteredGuidance.length === 0 ? (
              <EmptyState
                icon={<BookOpen className="h-6 w-6" />}
                title="No guidance materials found."
                description="Coba ubah kata kunci atau kategori pencarian."
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {filteredGuidance.map(item => (
                  <Card
                    key={item.id}
                    interactive
                    onClick={() => setSelectedItem(item)}
                    className="flex gap-4 p-5"
                  >
                    <span
                      className={cn(
                        'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl',
                        item.category === 'Video' ? 'bg-warning-amber/15 text-[oklch(48%_0.13_60)]' :
                        item.category === 'Checklist' ? 'bg-surface text-slate' :
                        item.category === 'PDF' ? 'bg-danger-red/10 text-danger-red' :
                        'bg-primary-blue/10 text-primary-blue',
                      )}
                    >
                      {categoryIcon(item.category)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        {item.required && <span className="h-2 w-2 shrink-0 rounded-full bg-danger-red" />}
                        <h3 className="truncate text-sm font-semibold text-ink-deep">{item.title}</h3>
                      </div>
                      <p className="text-xs leading-relaxed text-stone">{item.overview}</p>
                      <div className="mt-3 flex items-center gap-3">
                        <span className="text-[11px] text-stone">{item.updatedAt}</span>
                        <Badge tone={categoryTone(item.category)}>{item.category}</Badge>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )
          )}

          {activeTab === 'schedule' && (
            filteredSchedule.length === 0 ? (
              <EmptyState
                icon={<CalendarDays className="h-6 w-6" />}
                title="No schedule found."
                description="Sesi training yang terjadwal akan tampil di sini."
              />
            ) : (
              <div className="space-y-4">
                {filteredSchedule.map(item => (
                  <div
                    key={item.id}
                    className="flex flex-col justify-between gap-4 rounded-2xl border border-hairline-soft p-5 sm:flex-row sm:items-center"
                  >
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-ink-deep">{item.title}</h3>
                      <p className="mt-1 text-[13px] font-semibold text-primary-blue">{item.date}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-stone">
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5" />
                          {item.location}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5" />
                          {item.trainer}
                        </span>
                      </div>
                    </div>
                    <Badge tone={scheduleTone(item.status)} className="shrink-0 self-start px-3 py-1.5 sm:self-auto">
                      {item.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </Card>

      <Modal
        open={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        size="lg"
        eyebrow={selectedItem?.category}
        title={selectedItem?.title}
        subtitle={selectedItem?.updatedAt}
        footer={
          <Button variant="secondary" onClick={() => setSelectedItem(null)}>
            Tutup
          </Button>
        }
      >
        {selectedItem && (
          <div className="space-y-4">
            <p className="text-sm leading-relaxed text-slate">{selectedItem.overview}</p>

            {(selectedItem.category === 'SOP' || selectedItem.category === 'PDF') && (
              <div className="space-y-3 rounded-2xl border border-hairline-soft bg-surface/50 p-4">
                <h4 className="flex items-center gap-2 text-sm font-semibold text-ink-deep">
                  <FileText className="h-4 w-4 text-primary-blue" />
                  Materi Dokumen Panduan
                </h4>
                <div className="space-y-2 text-xs leading-relaxed text-stone">
                  <p className="font-semibold text-charcoal">1. Pemeriksaan Pra-Inspeksi (Pre-Check)</p>
                  <p>Bersihkan unit, siapkan form checklist, dan pastikan alat audit (spt. multimeter, torque gauge) sudah terkalibrasi.</p>
                  <p className="font-semibold text-charcoal">2. Prosedur Inti Kepatuhan</p>
                  <p>Lakukan pengecekan menyeluruh sesuai visual checklist. Laporkan temuan defek dalam waktu maksimal 30 menit ke HO.</p>
                </div>
                <Button
                  block
                  size="sm"
                  icon={<Download className="h-4 w-4" />}
                  onClick={() => {
                    alert('Mengunduh dokumen panduan format PDF...');
                    setSelectedItem(null);
                  }}
                >
                  Download PDF Dokumen
                </Button>
              </div>
            )}

            {selectedItem.category === 'Checklist' && (
              <div className="space-y-3 rounded-2xl border border-hairline-soft bg-surface/50 p-4">
                <h4 className="flex items-center gap-2 text-sm font-semibold text-ink-deep">
                  <CheckSquare className="h-4 w-4 text-primary-blue" />
                  Penilaian Mandiri (Self-Assessment)
                </h4>
                <p className="text-xs text-stone">Silakan centang item di bawah untuk memverifikasi kesiapan:</p>
                <div className="space-y-3 pt-2">
                  <label className="flex cursor-pointer items-start gap-3 text-xs font-medium text-charcoal">
                    <input
                      type="checkbox"
                      checked={checkedList.c1}
                      onChange={() => toggleCheck('c1')}
                      className="mt-0.5 h-4 w-4 shrink-0 rounded border-hairline bg-card text-primary-blue focus:ring-primary-blue"
                    />
                    <span>Lantai pit-stop dibersihkan dari ceceran oli (Resik)</span>
                  </label>
                  <label className="flex cursor-pointer items-start gap-3 text-xs font-medium text-charcoal">
                    <input
                      type="checkbox"
                      checked={checkedList.c2}
                      onChange={() => toggleCheck('c2')}
                      className="mt-0.5 h-4 w-4 shrink-0 rounded border-hairline bg-card text-primary-blue focus:ring-primary-blue"
                    />
                    <span>Semua mekanik memakai helm pengaman dan sepatu safety (APD)</span>
                  </label>
                  <label className="flex cursor-pointer items-start gap-3 text-xs font-medium text-charcoal">
                    <input
                      type="checkbox"
                      checked={checkedList.c3}
                      onChange={() => toggleCheck('c3')}
                      className="mt-0.5 h-4 w-4 shrink-0 rounded border-hairline bg-card text-primary-blue focus:ring-primary-blue"
                    />
                    <span>Alat ukur disimpan kembali ke papan shadowboard (Rapi)</span>
                  </label>
                </div>
              </div>
            )}

            {selectedItem.category === 'Video' && (
              <div className="space-y-3 rounded-2xl border border-hairline-soft bg-surface/50 p-4">
                <h4 className="flex items-center gap-2 text-sm font-semibold text-ink-deep">
                  <PlayCircle className="h-4 w-4 text-primary-blue" />
                  Video Tutorial Training
                </h4>
                <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-xl border border-hairline-soft bg-ink-deep">
                  <PlayCircle className="h-12 w-12 cursor-pointer text-white/80 transition-colors hover:text-white" />
                  <Eyebrow className="absolute bottom-3 right-3 rounded-full bg-black/60 px-2 py-0.5 text-white/90">03:45</Eyebrow>
                </div>
                <p className="text-xs leading-relaxed text-stone">Video ini menjelaskan alur eskalasi temuan kritis di pit stop yang berpotensi menghambat delivery unit ke customer.</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default TrainingPage;
