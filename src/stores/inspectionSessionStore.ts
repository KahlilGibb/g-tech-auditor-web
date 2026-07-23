import { create } from 'zustand';
import { getApiErrorMessage } from '../lib/apiResponse';
import { inspectionService } from '../services/inspectionService';
import type { InspectionResponse, InspectionSession, Attachment } from '../types/inspection';

const draftKey = (id: string) => `gtech_inspection_draft_${id}`;

// ─── Per-field debouncers ─────────────────────────────────────────────────────

const fieldDebouncers = new Map<string, ReturnType<typeof setTimeout>>();
const noteDebouncers = new Map<string, ReturnType<typeof setTimeout>>();

const debounceUpsertField = (
  fieldId: string,
  delay: number,
  fn: () => Promise<void>
) => {
  if (fieldDebouncers.has(fieldId)) {
    clearTimeout(fieldDebouncers.get(fieldId));
  }
  const timer = setTimeout(async () => {
    fieldDebouncers.delete(fieldId);
    await fn();
  }, delay);
  fieldDebouncers.set(fieldId, timer);
};

const debounceUpsertNote = (
  fieldId: string,
  delay: number,
  fn: () => Promise<void>
) => {
  if (noteDebouncers.has(fieldId)) {
    clearTimeout(noteDebouncers.get(fieldId));
  }
  const timer = setTimeout(async () => {
    noteDebouncers.delete(fieldId);
    await fn();
  }, delay);
  noteDebouncers.set(fieldId, timer);
};

interface InspectionSessionStoreState {
  session: InspectionSession | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  loadSession: (inspectionId: string) => Promise<void>;
  clearSession: () => void;
  setResponse: (fieldId: string, value: unknown) => void;
  setNote: (fieldId: string, note: string) => void;
  addMedia: (fieldId: string, file: File) => Promise<void>;
  removeMedia: (fieldId: string, uri: string) => Promise<void>;
  goToSection: (index: number) => void;
  saveDraft: () => Promise<void>;
  submitInspection: () => Promise<void>;
  clearError: () => void;
}

function restoreDraft(session: InspectionSession): InspectionSession {
  const saved = localStorage.getItem(draftKey(session.inspectionId));
  if (!saved) return session;

  try {
    const draft = JSON.parse(saved) as Partial<InspectionSession>;
    return {
      ...session,
      responses: { ...session.responses, ...(draft.responses || {}) },
      currentSectionIndex: draft.currentSectionIndex ?? session.currentSectionIndex,
      lastSavedAt: draft.lastSavedAt,
    };
  } catch {
    return session;
  }
}

export const useInspectionSessionStore = create<InspectionSessionStoreState>()((set, get) => ({
  session: null,
  isLoading: false,
  isSaving: false,
  error: null,

  loadSession: async inspectionId => {
    set({ isLoading: true, error: null });
    try {
      const session = restoreDraft(await inspectionService.getInspectionWithTemplate(inspectionId));
      set({ session, isLoading: false });
    } catch (error) {
      set({ isLoading: false, error: getApiErrorMessage(error, 'Failed to load inspection form') });
    }
  },

  clearSession: () => {
    fieldDebouncers.forEach(timer => clearTimeout(timer));
    fieldDebouncers.clear();
    noteDebouncers.forEach(timer => clearTimeout(timer));
    noteDebouncers.clear();
    set({ session: null, isLoading: false, isSaving: false, error: null });
  },

  setResponse: (fieldId, value) => {
    set(state => {
      if (!state.session) return state;
      const existing = state.session.responses[fieldId];
      const updated: InspectionResponse = {
        fieldId,
        fieldValueId: existing?.fieldValueId,
        value,
        note: existing?.note,
        noteType: existing?.noteType,
        flagged: existing?.flagged,
        attachments: existing?.attachments,
        mediaUris: existing?.mediaUris,
        answeredAt: new Date().toISOString(),
      };
      return {
        session: {
          ...state.session,
          responses: { ...state.session.responses, [fieldId]: updated },
        },
      };
    });

    const { session } = get();
    if (session) {
      debounceUpsertField(fieldId, 500, async () => {
        try {
          const result = await inspectionService.upsertFieldValue(session.inspectionId, {
            field_id: fieldId,
            value,
          });
          set(state => {
            if (!state.session) return state;
            const existing = state.session.responses[fieldId];
            if (!existing) return state;
            return {
              session: {
                ...state.session,
                responses: {
                  ...state.session.responses,
                  [fieldId]: { ...existing, fieldValueId: result.id },
                },
              },
            };
          });
        } catch (err) {
          console.error('[upsert value error]', err);
        }
      });
    }
  },

  setNote: (fieldId, note) => {
    set(state => {
      if (!state.session) return state;
      const existing = state.session.responses[fieldId];
      const updated: InspectionResponse = existing
        ? { ...existing, note, noteType: existing.noteType || 'general', answeredAt: existing.answeredAt ?? new Date().toISOString() }
        : { fieldId, value: undefined, note, noteType: 'general', answeredAt: new Date().toISOString() };
      return {
        session: {
          ...state.session,
          responses: { ...state.session.responses, [fieldId]: updated },
        },
      };
    });

    const { session } = get();
    if (session) {
      const existing = session.responses[fieldId];
      const isIssue = String(existing?.value ?? '').toLowerCase() === 'no' || String(existing?.value ?? '').toLowerCase() === 'not_ok';
      const noteType = isIssue ? 'issue' : 'general';
      debounceUpsertNote(fieldId, 500, async () => {
        try {
          const result = await inspectionService.upsertFieldValue(session.inspectionId, {
            field_id: fieldId,
            value: existing?.value ?? '',
            note,
            note_type: noteType,
          });
          set(state => {
            if (!state.session) return state;
            const existingField = state.session.responses[fieldId];
            if (!existingField) return state;
            return {
              session: {
                ...state.session,
                responses: {
                  ...state.session.responses,
                  [fieldId]: { ...existingField, fieldValueId: result.id, noteType },
                },
              },
            };
          });
        } catch (err) {
          console.error('[upsert note error]', err);
        }
      });
    }
  },

  addMedia: async (fieldId, file) => {
    const { session } = get();
    if (!session) return;

    const tempUri = URL.createObjectURL(file);
    const filename = file.name || 'photo.jpg';
    const file_type = file.type || 'image/jpeg';
    const type = 'general';

    const tempAttachment: Attachment = {
      uri: tempUri,
      filename,
      file_type,
      type,
      uploading: true,
    };

    set(state => {
      if (!state.session) return state;
      const existing = state.session.responses[fieldId];
      const attachments = [...(existing?.attachments ?? []), tempAttachment];
      const mediaUris = attachments.map(a => a.uri);
      return {
        session: {
          ...state.session,
          responses: {
            ...state.session.responses,
            [fieldId]: {
              ...(existing ?? { fieldId, value: undefined }),
              attachments,
              mediaUris,
            },
          },
        },
      };
    });

    try {
      const formData = new FormData();
      formData.append('files', file);

      const uploaded = await inspectionService.uploadAttachment(session.inspectionId, formData);

      let fieldValueId = get().session?.responses[fieldId]?.fieldValueId;
      if (!fieldValueId) {
        const currentValue = get().session?.responses[fieldId]?.value ?? '';
        const result = await inspectionService.upsertFieldValue(session.inspectionId, {
          field_id: fieldId,
          value: currentValue,
        });
        fieldValueId = result.id;
        set(state => {
          if (!state.session) return state;
          const existing = state.session.responses[fieldId];
          return {
            session: {
              ...state.session,
              responses: {
                ...state.session.responses,
                [fieldId]: {
                  ...(existing ?? { fieldId, value: currentValue }),
                  fieldValueId,
                },
              },
            },
          };
        });
      }

      const confirmed = await inspectionService.createAttachment(session.inspectionId, {
        field_value_id: fieldValueId,
        file_url: uploaded.file_url,
        file_type: uploaded.file_type,
        filename: uploaded.filename,
        type,
      });

      set(state => {
        if (!state.session) return state;
        const existing = state.session.responses[fieldId];
        if (!existing) return state;
        const attachments = (existing.attachments ?? []).map(a =>
          a.uri === tempUri
            ? {
                ...a,
                attachment_id: confirmed.id,
                file_url: uploaded.file_url,
                uploading: false,
              }
            : a,
        );
        const mediaUris = attachments.map(a => a.file_url || a.uri);
        return {
          session: {
            ...state.session,
            responses: {
              ...state.session.responses,
              [fieldId]: {
                ...existing,
                attachments,
                mediaUris,
                value: mediaUris,
              },
            },
          },
        };
      });
    } catch (err) {
      console.error('[addMedia error]', err);
      set(state => {
        if (!state.session) return state;
        const existing = state.session.responses[fieldId];
        if (!existing) return state;
        const attachments = (existing.attachments ?? []).filter(a => a.uri !== tempUri);
        return {
          session: {
            ...state.session,
            responses: {
              ...state.session.responses,
              [fieldId]: {
                ...existing,
                attachments,
                mediaUris: attachments.map(a => a.file_url || a.uri),
              },
            },
          },
        };
      });
    }
  },

  removeMedia: async (fieldId, uri) => {
    const { session } = get();
    if (!session) return;

    const attachment = session.responses[fieldId]?.attachments?.find(a => a.uri === uri || a.file_url === uri);

    set(state => {
      if (!state.session) return state;
      const existing = state.session.responses[fieldId];
      if (!existing) return state;
      const attachments = (existing.attachments ?? []).filter(a => a.uri !== uri && a.file_url !== uri);
      const mediaUris = attachments.map(a => a.file_url || a.uri);
      return {
        session: {
          ...state.session,
          responses: {
            ...state.session.responses,
            [fieldId]: {
              ...existing,
              attachments,
              mediaUris,
              value: mediaUris,
            },
          },
        },
      };
    });

    if (attachment?.attachment_id) {
      try {
        await inspectionService.deleteAttachment(session.inspectionId, attachment.attachment_id);
      } catch (err) {
        console.error('[removeMedia error]', err);
        set(state => {
          if (!state.session) return state;
          const existing = state.session.responses[fieldId];
          return {
            session: {
              ...state.session,
              responses: {
                ...state.session.responses,
                [fieldId]: {
                  ...(existing ?? { fieldId, value: undefined }),
                  attachments: [...(existing?.attachments ?? []), attachment],
                  mediaUris: [...(existing?.mediaUris ?? []), attachment.file_url || attachment.uri],
                },
              },
            },
          };
        });
      }
    }
  },

  goToSection: index => {
    set(state => {
      if (!state.session) return state;
      const currentSectionIndex = Math.max(0, Math.min(index, state.session.sections.length - 1));
      return { session: { ...state.session, currentSectionIndex } };
    });
  },

  saveDraft: async () => {
    const session = get().session;
    if (!session || session.status !== 'active') return;
    set({ isSaving: true, error: null });
    try {
      const lastSavedAt = new Date().toISOString();
      const draft = { responses: session.responses, currentSectionIndex: session.currentSectionIndex, lastSavedAt };
      localStorage.setItem(draftKey(session.inspectionId), JSON.stringify(draft));
      await inspectionService.saveInspectionDraft();
      set(state => ({
        isSaving: false,
        session: state.session ? { ...state.session, lastSavedAt } : state.session,
      }));
    } catch (error) {
      set({ isSaving: false, error: getApiErrorMessage(error, 'Failed to save inspection draft') });
      throw error;
    }
  },

  submitInspection: async () => {
    const session = get().session;
    if (!session) return;

    fieldDebouncers.forEach(timer => clearTimeout(timer));
    fieldDebouncers.clear();
    noteDebouncers.forEach(timer => clearTimeout(timer));
    noteDebouncers.clear();

    set(state => ({
      error: null,
      session: state.session ? { ...state.session, status: 'submitting' } : state.session,
    }));
    try {
      await inspectionService.submitInspection(session.inspectionId);
      localStorage.removeItem(draftKey(session.inspectionId));
      set(state => ({
        session: state.session ? { ...state.session, status: 'submitted' } : state.session,
      }));
    } catch (error) {
      set(state => ({
        error: getApiErrorMessage(error, 'Failed to submit inspection'),
        session: state.session ? { ...state.session, status: 'active' } : state.session,
      }));
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));
