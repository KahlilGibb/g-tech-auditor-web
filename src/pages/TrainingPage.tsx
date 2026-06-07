import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BookOpen, CalendarDays, Search, PlayCircle, FileText, CheckSquare, X } from 'lucide-react';
import { cn } from '../utils/cn';

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

const TrainingPage: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TrainingTab>('guidance');
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

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
      {/* Header */}
      <div>
        <h1 className="page-title">{t('training.title')}</h1>
        <p className="page-subtitle">{t('training.subtitle') || 'Compliance training and certifications.'}</p>
      </div>

      {/* Tabs */}
      <div className="flex w-full rounded-lg border border-divider bg-white p-1 shadow-sm sm:w-fit">
        <button
          onClick={() => setActiveTab('guidance')}
          className={cn(
            "flex-1 sm:flex-none px-6 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2",
            activeTab === 'guidance' ? "bg-primary-blue text-white shadow-sm" : "text-muted-foreground hover:bg-surface hover:text-foreground"
          )}
        >
          <BookOpen className="w-4 h-4" />
          {t('training.tabs.guidance') || 'Guidance'}
        </button>
        <button
          onClick={() => setActiveTab('schedule')}
          className={cn(
            "flex-1 sm:flex-none px-6 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2",
            activeTab === 'schedule' ? "bg-primary-blue text-white shadow-sm" : "text-muted-foreground hover:bg-surface hover:text-foreground"
          )}
        >
          <CalendarDays className="w-4 h-4" />
          {t('training.tabs.schedule') || 'Schedule'}
        </button>
      </div>

      {/* Summary Widget */}
      <div className="panel flex items-center gap-4 p-4">
        <div className="rounded-lg bg-primary-blue/10 p-3 text-primary-blue">
          <BookOpen className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-foreground">
            {GUIDANCE_ITEMS.length} available materials
          </p>
          <p className="text-sm text-muted-foreground mt-0.5">
            {totalRequired} required &middot; {upcomingCount} upcoming sessions
          </p>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="panel min-h-[400px] overflow-hidden">
        {/* Search Header */}
        <div className="p-6 border-b border-divider flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-surface/30">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder={activeTab === 'guidance' ? "Search guidance..." : "Search schedule..."} 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="form-input pl-9 pr-8"
            />
            {query.length > 0 && (
              <button 
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          
          {activeTab === 'guidance' && (
            <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0 hide-scrollbar">
              {CATEGORY_CHIPS.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    "whitespace-nowrap px-4 py-2 rounded-lg text-sm font-semibold transition-colors border",
                    selectedCategory === cat 
                      ? "bg-primary-blue text-white border-primary-blue" 
                      : "bg-white text-muted-foreground border-divider hover:bg-surface"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* View Areas */}
        <div className="p-6">
          {activeTab === 'guidance' && (
            <div className="space-y-4">
              {filteredGuidance.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No guidance materials found.</p>
              ) : (
                filteredGuidance.map(item => (
                  <div key={item.id} className="p-5 rounded-2xl border border-divider hover:border-primary-blue/30 transition-colors cursor-pointer bg-surface/30 flex gap-4">
                    <div className={cn(
                      "p-3 rounded-xl h-fit",
                      item.category === 'Video' ? "bg-amber-500/10 text-amber-500" :
                      item.category === 'Checklist' ? "bg-slate-500/10 text-slate-500" :
                      item.category === 'PDF' ? "bg-red-500/10 text-red-500" :
                      "bg-primary-blue/10 text-primary-blue"
                    )}>
                      {item.category === 'Video' ? <PlayCircle className="w-6 h-6" /> :
                       item.category === 'Checklist' ? <CheckSquare className="w-6 h-6" /> :
                       <FileText className="w-6 h-6" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {item.required && <div className="w-2 h-2 rounded-full bg-danger-red" />}
                        <h3 className="font-bold text-foreground">{item.title}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground">{item.overview}</p>
                      <div className="flex items-center gap-3 mt-3">
                        <span className="text-xs text-muted-foreground">{item.updatedAt}</span>
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                          item.category === 'Video' ? "bg-amber-500/10 text-amber-600" :
                          item.category === 'Checklist' ? "bg-slate-500/10 text-slate-600" :
                          item.category === 'PDF' ? "bg-red-500/10 text-red-600" :
                          "bg-primary-blue/10 text-primary-blue"
                        )}>{item.category}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'schedule' && (
            <div className="space-y-4">
              {filteredSchedule.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No schedule found.</p>
              ) : (
                filteredSchedule.map(item => (
                  <div key={item.id} className="p-5 rounded-2xl border border-divider flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="font-bold text-foreground">{item.title}</h3>
                      <p className="text-sm text-primary-blue font-medium mt-1">{item.date}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>Loc: {item.location}</span>
                        <span>Trainer: {item.trainer}</span>
                      </div>
                    </div>
                    <span className={cn(
                      "inline-flex items-center px-3 py-1 rounded-full text-xs font-bold shrink-0",
                      item.status === 'Hari Ini' ? "bg-primary-blue text-white" :
                      item.status === 'Selesai' ? "bg-success-green/10 text-success-green" :
                      "bg-surface text-muted-foreground"
                    )}>
                      {item.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TrainingPage;
