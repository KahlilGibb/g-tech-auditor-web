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
  FileText,
  Loader2,
  MapPin,
  Save,
} from 'lucide-react';
import InspectionQuestionCard from '../components/inspection/InspectionQuestionCard';
import { appSwal } from '../lib/appSwal';
import { getApiErrorMessage } from '../lib/apiResponse';
import { useInspectionSessionStore } from '../stores/inspectionSessionStore';
import type { InspectionResponse, InspectionSection } from '../types/inspection';
import type { TemplateField } from '../types/template';
import { cn } from '../utils/cn';
import { Can } from '../components/rbac/Can';

function isFieldAnswered(field: TemplateField, response?: InspectionResponse) {
  if (field.type === 'instruction') return true;
  if (!response) return false;
  if (field.type === 'photo' || field.type === 'media') return (response.mediaUris?.length ?? 0) > 0;
  if (field.type === 'signature') return Boolean((response.value as { signed?: boolean } | undefined)?.signed);
  if (field.type === 'checkbox') return Boolean(response.value);
  return response.value !== undefined && response.value !== null && response.value !== '';
}

function sectionProgress(section: InspectionSection, responses: Record<string, InspectionResponse>) {
  const fields = section.fields.filter(field => field.type !== 'instruction');
  const answered = fields.filter(field => isFieldAnswered(field, responses[field.id])).length;
  return { answered, total: fields.length };
}

function allProgress(sections: InspectionSection[], responses: Record<string, InspectionResponse>) {
  return sections.reduce(
    (acc, section) => {
      const progress = sectionProgress(section, responses);
      return { answered: acc.answered + progress.answered, total: acc.total + progress.total };
    },
    { answered: 0, total: 0 },
  );
}

function missingRequired(sections: InspectionSection[], responses: Record<string, InspectionResponse>) {
  return sections.flatMap(section =>
    section.fields
      .filter(field => field.required && field.type !== 'instruction' && !isFieldAnswered(field, responses[field.id]))
      .map(field => ({ sectionTitle: section.title, fieldLabel: field.label })),
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

const InspectionFormPage: React.FC = () => {
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
    saveDraft,
    submitInspection,
  } = useInspectionSessionStore();

  useEffect(() => {
    if (id) void loadSession(id);
    return () => clearSession();
  }, [clearSession, id, loadSession]);

  const currentSection = session?.sections[session.currentSectionIndex] ?? null;
  const overall = useMemo(
    () => (session ? allProgress(session.sections, session.responses) : { answered: 0, total: 0 }),
    [session],
  );
  const missing = useMemo(
    () => (session ? missingRequired(session.sections, session.responses) : []),
    [session],
  );
  const overallPercent = overall.total === 0 ? 0 : Math.round((overall.answered / overall.total) * 100);
  const currentProgress = currentSection && session ? sectionProgress(currentSection, session.responses) : { answered: 0, total: 0 };

  const handleBack = async () => {
    if (!session || session.status !== 'active') {
      navigate('/inspections');
      return;
    }
    const confirmed = await appSwal.confirmLeave();
    if (confirmed) navigate('/inspections');
  };

  const handleSave = async () => {
    const confirmed = await appSwal.confirmSave();
    if (!confirmed) return;
    try {
      await saveDraft();
      await appSwal.successSaved('inspection');
    } catch (saveError) {
      await appSwal.errorSaveFailed('inspection', getApiErrorMessage(saveError));
    }
  };

  const handleSubmit = async () => {
    if (!session) return;
    if (missing.length > 0) {
      const first = missing[0];
      await appSwal.errorIncomplete(`${missing.length} pertanyaan wajib belum dijawab. Mulai dari: ${first.fieldLabel}`);
      const sectionIndex = session.sections.findIndex(section => section.title === first.sectionTitle);
      if (sectionIndex >= 0) goToSection(sectionIndex);
      return;
    }

    const confirmed = await appSwal.confirmSubmit();
    if (!confirmed) return;

    try {
      await saveDraft();
      await submitInspection();
      await appSwal.successSaved('inspection');
      navigate('/inspections');
    } catch (submitError) {
      await appSwal.errorSaveFailed('inspection', getApiErrorMessage(submitError));
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-9 w-9 animate-spin text-primary-blue" />
          <p className="mt-3 text-sm font-medium text-muted-foreground">Memuat form inspeksi...</p>
        </div>
      </div>
    );
  }

  if (!session || !currentSection) {
    return (
      <div className="page-shell">
        <div className="rounded-lg border border-danger-red/20 bg-danger-red/10 p-6 text-center">
          <AlertCircle className="mx-auto mb-3 h-9 w-9 text-danger-red" />
          <p className="font-semibold text-danger-red">{error || 'Inspection form tidak ditemukan.'}</p>
          <Link to="/inspections" className="btn-secondary mt-4 inline-flex">
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
      <div className="sticky top-0 z-10 -mx-4 border-b border-divider bg-card/95 px-4 py-4 backdrop-blur lg:-mx-6 lg:px-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <button className="icon-button shrink-0" onClick={handleBack}>
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-widest text-primary-blue">Form Inspeksi</p>
              <h1 className="mt-1 truncate text-xl font-semibold text-foreground">{session.templateTitle}</h1>
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {session.site}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-1">
                  <Clock className="h-3.5 w-3.5" />
                  Due {formatDate(session.dueDate)}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-1">
                  <ClipboardCheck className="h-3.5 w-3.5" />
                  {session.assignee}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="min-w-52">
              <div className="mb-1 flex items-center justify-between text-xs font-semibold text-muted-foreground">
                <span>Progress</span>
                <span>{overallPercent}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-surface">
                <div className="h-full rounded-full bg-primary-blue" style={{ width: `${overallPercent}%` }} />
              </div>
            </div>
            <Can resource="inspections" action="submit">
              <button className="btn-secondary justify-center" onClick={handleSave} disabled={isSaving}>
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Simpan Draft
              </button>
              <button
                className="btn-primary justify-center"
                onClick={handleSubmit}
                disabled={session.status === 'submitting'}
              >
                {session.status === 'submitting' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Submit
              </button>
            </Can>
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-5 rounded-lg border border-danger-red/20 bg-danger-red/10 p-4 text-sm font-semibold text-danger-red">
          {error}
        </div>
      )}

      <div className="grid gap-5 py-5 xl:grid-cols-[280px_minmax(0,1fr)_300px]">
        <aside className="hidden xl:block">
          <div className="sticky top-32 rounded-lg border border-divider bg-card shadow-sm">
            <div className="border-b border-divider px-4 py-3">
              <p className="text-sm font-semibold text-foreground">Daftar Section</p>
              <p className="mt-1 text-xs text-muted-foreground">{session.sections.length} section inspeksi</p>
            </div>
            <div className="max-h-[calc(100vh-240px)] overflow-y-auto p-2">
              {session.sections.map((section, index) => {
                const progress = sectionProgress(section, session.responses);
                const complete = progress.total > 0 && progress.answered === progress.total;
                const active = index === session.currentSectionIndex;
                return (
                  <button
                    key={section.id}
                    onClick={() => goToSection(index)}
                    className={cn(
                      'mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition',
                      active ? 'bg-primary-blue/10 text-primary-blue' : 'hover:bg-surface',
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                        complete ? 'bg-success-green text-white' : active ? 'bg-primary-blue text-[#181a20]' : 'bg-surface text-muted-foreground',
                      )}
                    >
                      {complete && !active ? <Check className="h-3.5 w-3.5" /> : index + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{section.title}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {progress.answered}/{progress.total} dijawab
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        <main className="min-w-0 space-y-4">
          <div className="rounded-lg border border-divider bg-card p-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Section {session.currentSectionIndex + 1} dari {session.sections.length}
                </p>
                <h2 className="mt-1 text-lg font-semibold text-foreground">{currentSection.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {currentProgress.answered}/{currentProgress.total} pertanyaan sudah dijawab
                </p>
              </div>
              {currentProgress.total > 0 && currentProgress.answered === currentProgress.total && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-success-green/10 px-3 py-1.5 text-xs font-semibold text-success-green">
                  <CheckCircle2 className="h-4 w-4" />
                  Section selesai
                </span>
              )}
            </div>
          </div>

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

          <div className="flex items-center justify-between gap-3 rounded-lg border border-divider bg-card p-3 shadow-sm">
            <button className="btn-secondary" onClick={() => goToSection(session.currentSectionIndex - 1)} disabled={isFirst}>
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>
            <span className="rounded-full bg-surface px-3 py-1.5 text-xs font-semibold text-muted-foreground">
              {session.currentSectionIndex + 1}/{session.sections.length}
            </span>
            {isLast ? (
              <Can resource="inspections" action="submit">
                <button className="btn-primary" onClick={handleSubmit}>
                  <Check className="h-4 w-4" />
                  Selesai
                </button>
              </Can>
            ) : (
              <button className="btn-primary" onClick={() => goToSection(session.currentSectionIndex + 1)}>
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </main>

        <aside className="xl:block">
          <div className="sticky top-32 space-y-4">
            <div className="rounded-lg border border-divider bg-card p-4 shadow-sm">
              <p className="text-sm font-semibold text-foreground">Ringkasan</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-surface p-3">
                  <p className="text-xs text-muted-foreground">Terjawab</p>
                  <p className="mt-1 text-xl font-semibold text-foreground">{overall.answered}</p>
                </div>
                <div className="rounded-lg bg-surface p-3">
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="mt-1 text-xl font-semibold text-foreground">{overall.total}</p>
                </div>
              </div>
              <div className="mt-4 rounded-lg border border-divider p-3">
                <p className="text-xs font-semibold text-muted-foreground">Status simpan</p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {isSaving ? 'Menyimpan...' : session.lastSavedAt ? `Tersimpan ${formatDate(session.lastSavedAt)}` : 'Belum ada draft'}
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-divider bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-foreground">Wajib Dijawab</p>
                <span
                  className={cn(
                    'rounded-full px-2 py-1 text-xs font-semibold',
                    missing.length === 0 ? 'bg-success-green/10 text-success-green' : 'bg-warning-amber/10 text-warning-amber',
                  )}
                >
                  {missing.length}
                </span>
              </div>
              {missing.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">Semua field wajib sudah terisi.</p>
              ) : (
                <div className="mt-3 max-h-52 space-y-2 overflow-y-auto">
                  {missing.slice(0, 8).map((item, index) => (
                    <button
                      key={`${item.sectionTitle}-${item.fieldLabel}`}
                      className="w-full rounded-lg bg-warning-amber/5 p-3 text-left text-xs text-foreground hover:bg-warning-amber/10"
                      onClick={() => {
                        const sectionIndex = session.sections.findIndex(section => section.title === item.sectionTitle);
                        if (sectionIndex >= 0) goToSection(sectionIndex);
                      }}
                    >
                      <span className="font-semibold">{index + 1}. {item.fieldLabel}</span>
                      <span className="mt-1 block text-muted-foreground">{item.sectionTitle}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-lg border border-divider bg-card p-4 shadow-sm">
              <p className="text-sm font-semibold text-foreground">Dokumen</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Catatan dan media yang diunggah pada form ini akan ikut terkirim bersama jawaban inspeksi.
              </p>
              <Link to="/documents" className="btn-secondary mt-3 w-full justify-center">
                <FileText className="h-4 w-4" />
                Buka Dokumen
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default InspectionFormPage;
