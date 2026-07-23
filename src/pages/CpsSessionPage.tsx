import React, { useEffect, useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Loader2,
  MapPin,
  Save,
  AlertTriangle,
  User,
} from 'lucide-react';
import { useCpsSessionStore } from '../stores/cpsSessionStore';
import InspectionQuestionCard from '../components/inspection/InspectionQuestionCard';
import { appSwal } from '../lib/appSwal';
import { getApiErrorMessage } from '../lib/apiResponse';
import type { InspectionResponse, InspectionSection } from '../types/inspection';
import type { TemplateField } from '../types/template';
import { cn } from '../utils/cn';
import { Alert, Badge, Button, Card, Eyebrow, IconButton, ProgressBar } from '../components/ui';

function isFieldAnswered(field: TemplateField, response?: InspectionResponse) {
  if (field.type === 'instruction') return true;
  if (!response) return false;
  if (field.type === 'photo' || field.type === 'media') return (response.mediaUris?.length ?? 0) > 0;
  if (field.type === 'signature') {
    const hasName = response.value !== undefined && response.value !== null && response.value !== '';
    const hasAttachment = (response.attachments ?? []).some(a => a.type === 'general');
    return Boolean(hasName && hasAttachment);
  }
  if (field.type === 'checkbox') return Boolean(response.value);
  return response.value !== undefined && response.value !== null && response.value !== '';
}

function sectionProgress(section: InspectionSection, responses: Record<string, InspectionResponse>) {
  const fields = section.fields.filter(field => field.type !== 'instruction');
  const answered = fields.filter(field => isFieldAnswered(field, responses[field.id])).length;
  return { answered, total: fields.length };
}

function allProgress(sections: InspectionSection[], responses: Record<string, InspectionResponse>) {
  let answered = 0;
  let total = 0;
  sections.forEach(sec => {
    const p = sectionProgress(sec, responses);
    answered += p.answered;
    total += p.total;
  });
  return { answered, total };
}

const CpsSessionPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const {
    session,
    isLoading,
    isSaving,
    error,
    loadSession,
    clearSession,
    setResponse,
    setNote,
    addMedia,
    removeMedia,
    goToSection,
    submitCps,
  } = useCpsSessionStore();

  useEffect(() => {
    if (id) {
      loadSession(id);
    }
    return () => {
      clearSession();
    };
  }, [id, loadSession, clearSession]);

  // Determine Session (1 vs 2) and deadlines based on start/creation date
  const sessionInfo = useMemo(() => {
    if (!session) return { sessionNum: 1, name: 'Sesi Pagi (Session 1)', deadline: '10:00 WIB', isLate: false };
    
    // Parse time in WIB (Western Indonesian Time)
    const startDate = new Date(session.startedAt);
    
    // Get hours in local time
    const startHour = startDate.getHours();
    
    // Session 1: before 12:00
    // Session 2: after 12:00
    const sessionNum = startHour < 12 ? 1 : 2;
    const name = sessionNum === 1 ? 'Sesi Pagi (Session 1)' : 'Sesi Siang (Session 2)';
    const deadlineStr = sessionNum === 1 ? '10:00 WIB' : '16:30 WIB';
    
    // Current time vs deadline comparison
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    let isLate = false;
    if (sessionNum === 1) {
      // Late if after 10:00
      if (currentHour > 10 || (currentHour === 10 && currentMinute > 0)) {
        isLate = true;
      }
    } else {
      // Late if after 16:30
      if (currentHour > 16 || (currentHour === 16 && currentMinute > 30)) {
        isLate = true;
      }
    }
    
    return {
      sessionNum,
      name,
      deadline: deadlineStr,
      isLate,
    };
  }, [session]);

  const currentSection = session?.sections[session.currentSectionIndex];
  
  const currentProgress = useMemo(() => {
    if (!currentSection || !session) return { answered: 0, total: 0 };
    return sectionProgress(currentSection, session.responses);
  }, [currentSection, session]);

  const overall = useMemo(() => {
    if (!session) return { answered: 0, total: 0 };
    return allProgress(session.sections, session.responses);
  }, [session]);

  const overallPercent = useMemo(() => {
    if (overall.total === 0) return 0;
    return Math.round((overall.answered / overall.total) * 100);
  }, [overall]);

  const handleBack = async () => {
    if (session && Object.keys(session.responses).length > 0) {
      const confirm = await appSwal.confirm({
        title: 'Kembali ke halaman CPS?',
        text: 'Draf Anda telah tersimpan secara otomatis.',
        confirmText: 'Ya, Kembali',
      });
      if (!confirm) return;
    }
    navigate('/cps');
  };

  const handleSave = async () => {
    await useCpsSessionStore.getState().saveDraft();
    await appSwal.success({
      title: 'Draf Disimpan',
      text: 'Progress Anda telah disimpan di penyimpanan lokal.',
    });
  };

  const handleSubmit = async () => {
    if (overall.answered < overall.total) {
      await appSwal.error({
        title: 'Belum Selesai',
        text: `Anda baru mengisi ${overall.answered} dari ${overall.total} pertanyaan. Harap selesaikan terlebih dahulu.`,
      });
      return;
    }

    const lateText = sessionInfo.isLate 
      ? '\n\n⚠️ Peringatan: Pengisian terlambat akan dikenakan pinalti pemotongan 5 poin.'
      : '';

    const confirm = await appSwal.confirm({
      title: 'Submit CPS sekarang?',
      text: `Anda akan mengirimkan penilaian CPS untuk ${sessionInfo.name}.${lateText}`,
      confirmText: 'Ya, Kirim',
    });

    if (!confirm) return;

    try {
      await submitCps();
      await appSwal.success({
        title: 'Submit Berhasil',
        text: 'Laporan CPS harian telah berhasil dikirimkan.',
      });
      navigate('/cps');
    } catch (err) {
      await appSwal.error({
        title: 'Gagal Mengirim',
        text: getApiErrorMessage(err),
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-9 w-9 animate-spin text-primary-blue" />
          <p className="mt-3 text-sm font-medium text-stone">Memuat draf CPS...</p>
        </div>
      </div>
    );
  }

  if (!session || !currentSection) {
    return (
      <div className="page-shell">
        <div className="rounded-3xl border border-danger-red/25 bg-danger-red/8 p-8 text-center">
          <AlertCircle className="mx-auto mb-3 h-9 w-9 text-danger-red" />
          <p className="font-semibold text-danger-red">{error || 'Draf sesi CPS tidak ditemukan.'}</p>
          <Link to="/cps" className="btn-secondary mt-5 inline-flex">
            <ArrowLeft className="h-4 w-4" />
            Kembali
          </Link>
        </div>
      </div>
    );
  }

  const isFirst = session.currentSectionIndex === 0;
  const isLast = session.currentSectionIndex === session.sections.length - 1;

  return (
    <div className="min-h-full">
      <div className="sticky top-0 z-10 -mx-4 border-b border-hairline-soft bg-card/70 px-4 py-4 backdrop-blur-xl lg:-mx-6 lg:px-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <IconButton className="shrink-0" onClick={handleBack} aria-label="Kembali">
              <ArrowLeft className="h-5 w-5" />
            </IconButton>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Eyebrow className="text-primary-blue">
                  <ClipboardCheck className="h-3.5 w-3.5" /> Checkpoint Sheet (CPS)
                </Eyebrow>
                <Badge tone={sessionInfo.sessionNum === 1 ? 'brand' : 'warning'}>
                  {sessionInfo.name}
                </Badge>
              </div>
              <h1 className="mt-1.5 truncate text-xl font-semibold tracking-tight text-ink-deep">{session.templateTitle}</h1>
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-stone">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {session.site}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-1">
                  <User className="h-3.5 w-3.5" />
                  {session.assignee}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-1">
                  <Clock className="h-3.5 w-3.5" />
                  Batas: {sessionInfo.deadline}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="min-w-52">
              <div className="mb-1.5 flex items-center justify-between">
                <Eyebrow>Progress</Eyebrow>
                <span className="text-xs font-semibold text-ink-deep tabular-nums">{overallPercent}%</span>
              </div>
              <ProgressBar value={overallPercent} tone="gradient" className="h-2" />
            </div>
            <Button variant="secondary" onClick={handleSave} loading={isSaving} icon={!isSaving ? <Save className="h-4 w-4" /> : undefined}>
              Simpan Draft
            </Button>
            <Button onClick={handleSubmit} loading={isSaving} icon={!isSaving ? <Check className="h-4 w-4" /> : undefined}>
              Submit
            </Button>
          </div>
        </div>

        {sessionInfo.isLate && (
          <Alert tone="warning" className="mt-4 text-xs">
            <span className="inline-flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>
                Anda telah melewati batas waktu pengisian ({sessionInfo.deadline}). Anda tetap dapat mengirimkan draf, tetapi akan dikenakan pemotongan nilai sebesar 5 poin.
              </span>
            </span>
          </Alert>
        )}
      </div>

      {error && <Alert tone="danger" className="mt-5">{error}</Alert>}

      <div className="grid gap-5 py-5 xl:grid-cols-[280px_minmax(0,1fr)_300px]">
        <aside className="hidden xl:block">
          <Card className="sticky top-32 overflow-hidden">
            <div className="border-b border-hairline-soft px-4 py-3.5">
              <p className="text-sm font-semibold text-ink-deep">Daftar Section</p>
              <p className="mt-0.5 text-xs text-stone">{session.sections.length} section CPS</p>
            </div>
            <div className="max-h-[calc(100vh-240px)] overflow-y-auto p-2 sidebar-scroll">
              {session.sections.map((section, index) => {
                const progress = sectionProgress(section, session.responses);
                const complete = progress.total > 0 && progress.answered === progress.total;
                const active = index === session.currentSectionIndex;
                return (
                  <button
                    key={section.id}
                    onClick={() => goToSection(index)}
                    className={cn(
                      'mb-1 flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition',
                      active ? 'bg-primary-blue/10 text-primary-blue' : 'hover:bg-surface',
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums',
                        complete
                          ? 'bg-success-green text-white'
                          : active
                            ? 'bg-primary-blue text-white'
                            : 'bg-surface text-stone',
                      )}
                    >
                      {complete && !active ? <Check className="h-3.5 w-3.5" /> : index + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{section.title}</span>
                      <span className="mt-0.5 block text-xs text-stone">
                        {progress.answered}/{progress.total} dijawab
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </Card>
        </aside>

        <main className="min-w-0 space-y-4">
          <Card padded>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <Eyebrow>
                  Section {session.currentSectionIndex + 1} dari {session.sections.length}
                </Eyebrow>
                <h2 className="mt-1.5 text-lg font-semibold tracking-tight text-ink-deep">{currentSection.title}</h2>
                <p className="mt-1 text-sm text-stone">
                  {currentProgress.answered}/{currentProgress.total} pertanyaan sudah dijawab
                </p>
              </div>
              {currentProgress.total > 0 && currentProgress.answered === currentProgress.total && (
                <Badge tone="success">
                  <CheckCircle2 className="h-4 w-4" />
                  Section selesai
                </Badge>
              )}
            </div>
          </Card>

          {currentSection.fields.map((field, index) => (
            <InspectionQuestionCard
              key={field.id}
              field={field}
              index={field.type === 'instruction' ? undefined : index}
              response={session.responses[field.id]}
              onValueChange={setResponse}
              onNoteChange={setNote}
              onAddMedia={addMedia}
              onRemoveMedia={removeMedia}
            />
          ))}

          <Card className="flex items-center justify-between gap-3 p-3">
            <Button variant="secondary" onClick={() => goToSection(session.currentSectionIndex - 1)} disabled={isFirst} icon={<ChevronLeft className="h-4 w-4" />}>
              Previous
            </Button>
            <span className="rounded-full bg-surface px-3 py-1.5 text-xs font-semibold text-stone tabular-nums">
              {session.currentSectionIndex + 1}/{session.sections.length}
            </span>
            {isLast ? (
              <Button onClick={handleSubmit} icon={<Check className="h-4 w-4" />}>
                Selesai
              </Button>
            ) : (
              <Button onClick={() => goToSection(session.currentSectionIndex + 1)}>
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </Card>
        </main>

        <aside className="xl:block">
          <div className="sticky top-32 space-y-4">
            <Card padded>
              <p className="text-sm font-semibold text-ink-deep">Ringkasan</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-surface p-3">
                  <Eyebrow>Terjawab</Eyebrow>
                  <p className="mt-1 text-xl font-semibold text-ink-deep tabular-nums">{overall.answered}</p>
                </div>
                <div className="rounded-2xl bg-surface p-3">
                  <Eyebrow>Total</Eyebrow>
                  <p className="mt-1 text-xl font-semibold text-ink-deep tabular-nums">{overall.total}</p>
                </div>
              </div>
            </Card>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default CpsSessionPage;
