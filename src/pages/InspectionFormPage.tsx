import React, { useEffect, useMemo, useState } from 'react';
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
import { Alert, Badge, Button, Card, Eyebrow, Field, IconButton, Input, Modal, ProgressBar, Select, Textarea } from '../components/ui';
import { useRbac } from '../hooks/useRbac';
import { useActionStore } from '../stores/actionStore';
import { useUserStore } from '../stores/userStore';
import type { ActionPriority } from '../types/action';

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
  const { can } = useRbac();
  const { workflowStatuses, fetchActions, createAction, isSaving: isSavingAction } = useActionStore();
  const { users, fetchUsers } = useUserStore();
  const [actionFieldId, setActionFieldId] = useState<string | null>(null);
  const [actionTitle, setActionTitle] = useState('');
  const [actionDescription, setActionDescription] = useState('');
  const [actionPriority, setActionPriority] = useState<ActionPriority>('Medium');
  const [actionStatusId, setActionStatusId] = useState('');
  const [actionAssigneeIds, setActionAssigneeIds] = useState<string[]>([]);
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

  useEffect(() => {
    if (can('actions', 'create')) {
      void fetchActions(true);
      void fetchUsers({ limit: 100 });
    }
  }, [can, fetchActions, fetchUsers]);

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

  const openCreateAction = (fieldId: string) => {
    if (!session) return;
    const field = session.sections.flatMap(section => section.fields).find(item => item.id === fieldId);
    const response = session.responses[fieldId];
    setActionFieldId(fieldId);
    setActionTitle(field?.label ? `Tindak lanjut: ${field.label}` : 'Tindak lanjut inspeksi');
    setActionDescription(response?.note ?? String(response?.value ?? ''));
    setActionPriority('Medium');
    setActionStatusId(workflowStatuses.find(status => status.isDefault)?.id ?? workflowStatuses[0]?.id ?? '');
    setActionAssigneeIds([]);
  };

  const handleCreateAction = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!session || !actionFieldId || !actionTitle.trim() || !actionStatusId) {
      await appSwal.errorIncomplete('Judul dan status tindakan wajib diisi.');
      return;
    }
    try {
      await createAction({
        title: actionTitle.trim(),
        description: actionDescription.trim(),
        priority: actionPriority,
        workflowStatusId: actionStatusId,
        assigneeIds: actionAssigneeIds,
        inspectionId: session.inspectionId,
        fieldValueId: session.responses[actionFieldId]?.fieldValueId,
        source: session.templateTitle,
        site: session.site,
      });
      setActionFieldId(null);
      await appSwal.successCreated('action', actionTitle.trim());
    } catch (actionError) {
      await appSwal.errorCreateFailed('action', getApiErrorMessage(actionError));
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-9 w-9 animate-spin text-primary-blue" />
          <p className="mt-3 text-sm font-medium text-stone">Memuat form inspeksi...</p>
        </div>
      </div>
    );
  }

  if (!session || !currentSection) {
    return (
      <div className="page-shell">
        <div className="rounded-3xl border border-danger-red/25 bg-danger-red/8 p-8 text-center">
          <AlertCircle className="mx-auto mb-3 h-9 w-9 text-danger-red" />
          <p className="font-semibold text-danger-red">{error || 'Inspection form tidak ditemukan.'}</p>
          <Link to="/inspections" className="btn-secondary mt-5 inline-flex">
            <ArrowLeft className="h-4 w-4" />
            Kembali
          </Link>
        </div>
      </div>
    );
  }

  const isFirst = session.currentSectionIndex === 0;
  const isLast = session.currentSectionIndex === session.sections.length - 1;
  const readOnly = session.status === 'submitted';

  return (
    <div className="min-h-full">
      <div className="sticky top-0 z-10 -mx-4 border-b border-hairline-soft bg-card/70 px-4 py-4 backdrop-blur-xl lg:-mx-6 lg:px-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <IconButton className="shrink-0" onClick={handleBack} aria-label="Kembali">
              <ArrowLeft className="h-5 w-5" />
            </IconButton>
            <div className="min-w-0">
              <Eyebrow className="text-primary-blue">
                <ClipboardCheck className="h-3.5 w-3.5" /> {session.isReviewMode ? 'Review Admin HO' : 'Form Inspeksi'}
              </Eyebrow>
              <h1 className="mt-1.5 truncate text-xl font-semibold tracking-tight text-ink-deep">
                {session.templateTitle}
              </h1>
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-stone">
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
              <div className="mb-1.5 flex items-center justify-between">
                <Eyebrow>Progress</Eyebrow>
                <span className="text-xs font-semibold text-ink-deep tabular-nums">{overallPercent}%</span>
              </div>
              <ProgressBar value={overallPercent} tone="gradient" className="h-2" />
            </div>
            {!readOnly && <Can resource="inspections" action="submit">
              <Button variant="secondary" onClick={handleSave} loading={isSaving} icon={!isSaving ? <Save className="h-4 w-4" /> : undefined}>
                {session.isReviewMode ? 'Simpan Koreksi' : 'Simpan Draft'}
              </Button>
              <Button
                onClick={handleSubmit}
                loading={session.status === 'submitting'}
                icon={session.status !== 'submitting' ? <Check className="h-4 w-4" /> : undefined}
              >
                {session.isReviewMode ? 'Selesaikan Review' : 'Submit'}
              </Button>
            </Can>}
          </div>
        </div>
      </div>

      {error && <Alert tone="danger" className="mt-5">{error}</Alert>}
      {session.isReviewMode && (
        <Alert tone="info" className="mt-5">
          Mode review aktif. Nilai dealer saat submit: <strong>{session.dealerSubmittedScore ?? 0}</strong>. Perubahan jawaban disimpan sebagai koreksi Admin HO dengan version check.
        </Alert>
      )}

      <div className="grid gap-5 py-5 xl:grid-cols-[280px_minmax(0,1fr)_300px]">
        <aside className="hidden xl:block">
          <Card className="sticky top-32 overflow-hidden">
            <div className="border-b border-hairline-soft px-4 py-3.5">
              <p className="text-sm font-semibold text-ink-deep">Daftar Section</p>
              <p className="mt-0.5 text-xs text-stone">{session.sections.length} section inspeksi</p>
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
              onCreateAction={can('actions', 'create') ? openCreateAction : undefined}
              readOnly={readOnly}
            />
          ))}

          <Card className="flex items-center justify-between gap-3 p-3">
            <Button variant="secondary" onClick={() => goToSection(session.currentSectionIndex - 1)} disabled={isFirst} icon={<ChevronLeft className="h-4 w-4" />}>
              Previous
            </Button>
            <span className="rounded-full bg-surface px-3 py-1.5 text-xs font-semibold text-stone tabular-nums">
              {session.currentSectionIndex + 1}/{session.sections.length}
            </span>
            {isLast && !readOnly ? (
              <Can resource="inspections" action="submit">
                <Button onClick={handleSubmit} icon={<Check className="h-4 w-4" />}>
                  {session.isReviewMode ? 'Selesaikan Review' : 'Selesai'}
                </Button>
              </Can>
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
              <div className="mt-4 rounded-2xl border border-hairline-soft p-3">
                <Eyebrow>Status simpan</Eyebrow>
                <p className="mt-1 text-sm font-semibold text-ink-deep">
                  {isSaving ? 'Menyimpan...' : session.lastSavedAt ? `Tersimpan ${formatDate(session.lastSavedAt)}` : 'Belum ada draft'}
                </p>
              </div>
            </Card>

            <Card padded>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-ink-deep">Wajib Dijawab</p>
                <Badge tone={missing.length === 0 ? 'success' : 'warning'}>{missing.length}</Badge>
              </div>
              {missing.length === 0 ? (
                <p className="mt-3 text-sm text-stone">Semua field wajib sudah terisi.</p>
              ) : (
                <div className="mt-3 max-h-52 space-y-2 overflow-y-auto sidebar-scroll">
                  {missing.slice(0, 8).map((item, index) => (
                    <button
                      key={`${item.sectionTitle}-${item.fieldLabel}`}
                      className="w-full rounded-2xl bg-warning-amber/8 p-3 text-left text-xs text-ink-deep transition hover:bg-warning-amber/15"
                      onClick={() => {
                        const sectionIndex = session.sections.findIndex(section => section.title === item.sectionTitle);
                        if (sectionIndex >= 0) goToSection(sectionIndex);
                      }}
                    >
                      <span className="font-semibold">{index + 1}. {item.fieldLabel}</span>
                      <span className="mt-1 block text-stone">{item.sectionTitle}</span>
                    </button>
                  ))}
                </div>
              )}
            </Card>

            <Card padded>
              <p className="text-sm font-semibold text-ink-deep">Dokumen</p>
              <p className="mt-2 text-sm leading-6 text-stone">
                Catatan dan media yang diunggah pada form ini akan ikut terkirim bersama jawaban inspeksi.
              </p>
              <Link to="/documents" className="btn-secondary mt-3 w-full justify-center">
                <FileText className="h-4 w-4" />
                Buka Dokumen
              </Link>
            </Card>
          </div>
        </aside>
      </div>

      <Modal
        open={Boolean(actionFieldId)}
        onClose={() => !isSavingAction && setActionFieldId(null)}
        size="lg"
        eyebrow="Temuan inspeksi"
        title="Buat Tindakan"
        subtitle="Tindakan akan terhubung langsung ke pertanyaan dan inspeksi ini."
        footer={<><Button variant="secondary" onClick={() => setActionFieldId(null)} disabled={isSavingAction}>Batal</Button><Button type="submit" form="inspection-action-form" loading={isSavingAction}>Simpan Tindakan</Button></>}
      >
        <form id="inspection-action-form" onSubmit={handleCreateAction} className="grid gap-4 sm:grid-cols-2">
          <Field label="Judul" required className="sm:col-span-2"><Input value={actionTitle} onChange={event => setActionTitle(event.target.value)} /></Field>
          <Field label="Deskripsi" className="sm:col-span-2"><Textarea value={actionDescription} onChange={event => setActionDescription(event.target.value)} className="min-h-24" /></Field>
          <Field label="Prioritas"><Select value={actionPriority} onChange={event => setActionPriority(event.target.value as ActionPriority)}><option>Low</option><option>Medium</option><option>High</option></Select></Field>
          <Field label="Status" required><Select value={actionStatusId} onChange={event => setActionStatusId(event.target.value)}><option value="">Pilih status</option>{workflowStatuses.map(status => <option key={status.id} value={status.id}>{status.label}</option>)}</Select></Field>
          <Field label="Assignee" hint="Gunakan Ctrl/Cmd untuk memilih lebih dari satu" className="sm:col-span-2">
            <Select multiple value={actionAssigneeIds} onChange={event => setActionAssigneeIds(Array.from(event.target.selectedOptions).map(option => option.value))} className="min-h-28">
              {users.map(user => <option key={user.id} value={user.id}>{user.name} — {user.roleName}</option>)}
            </Select>
          </Field>
        </form>
      </Modal>
    </div>
  );
};

export default InspectionFormPage;
