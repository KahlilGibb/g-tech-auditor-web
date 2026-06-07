import { create } from 'zustand';
import { getApiErrorMessage } from '../lib/apiResponse';
import { inspectionService } from '../services/inspectionService';
import type { InspectionResponse, InspectionSession } from '../types/inspection';

const draftKey = (id: string) => `gtech_inspection_draft_${id}`;

let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleAutoSave(get: () => InspectionSessionStoreState) {
  if (autoSaveTimer) clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => {
    void get().saveDraft();
  }, 1000);
}

interface InspectionSessionStoreState {
  session: InspectionSession | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  loadSession: (inspectionId: string) => Promise<void>;
  clearSession: () => void;
  setResponse: (fieldId: string, value: unknown) => void;
  setNote: (fieldId: string, note: string) => void;
  addMedia: (fieldId: string, uri: string) => void;
  removeMedia: (fieldId: string, uri: string) => void;
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
      responses: draft.responses ?? session.responses,
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
    if (autoSaveTimer) clearTimeout(autoSaveTimer);
    set({ session: null, isLoading: false, isSaving: false, error: null });
  },

  setResponse: (fieldId, value) => {
    set(state => {
      if (!state.session) return state;
      const existing = state.session.responses[fieldId];
      const updated: InspectionResponse = {
        fieldId,
        value,
        note: existing?.note,
        mediaUris: existing?.mediaUris,
        actionIds: existing?.actionIds,
        answeredAt: new Date().toISOString(),
      };
      return {
        session: {
          ...state.session,
          responses: { ...state.session.responses, [fieldId]: updated },
        },
      };
    });
    scheduleAutoSave(get);
  },

  setNote: (fieldId, note) => {
    set(state => {
      if (!state.session) return state;
      const existing = state.session.responses[fieldId];
      const updated: InspectionResponse = existing
        ? { ...existing, note, answeredAt: existing.answeredAt ?? new Date().toISOString() }
        : { fieldId, value: undefined, note, answeredAt: new Date().toISOString() };
      return {
        session: {
          ...state.session,
          responses: { ...state.session.responses, [fieldId]: updated },
        },
      };
    });
    scheduleAutoSave(get);
  },

  addMedia: (fieldId, uri) => {
    set(state => {
      if (!state.session) return state;
      const existing = state.session.responses[fieldId];
      const mediaUris = [...(existing?.mediaUris ?? []), uri];
      const updated: InspectionResponse = existing
        ? { ...existing, mediaUris, value: existing.value ?? mediaUris, answeredAt: new Date().toISOString() }
        : { fieldId, value: mediaUris, mediaUris, answeredAt: new Date().toISOString() };
      return {
        session: {
          ...state.session,
          responses: { ...state.session.responses, [fieldId]: updated },
        },
      };
    });
    scheduleAutoSave(get);
  },

  removeMedia: (fieldId, uri) => {
    set(state => {
      if (!state.session) return state;
      const existing = state.session.responses[fieldId];
      if (!existing) return state;
      const mediaUris = (existing.mediaUris ?? []).filter(item => item !== uri);
      return {
        session: {
          ...state.session,
          responses: {
            ...state.session.responses,
            [fieldId]: { ...existing, mediaUris, value: mediaUris, answeredAt: new Date().toISOString() },
          },
        },
      };
    });
    scheduleAutoSave(get);
  },

  goToSection: index => {
    set(state => {
      if (!state.session) return state;
      const currentSectionIndex = Math.max(0, Math.min(index, state.session.sections.length - 1));
      return { session: { ...state.session, currentSectionIndex } };
    });
    scheduleAutoSave(get);
  },

  saveDraft: async () => {
    const session = get().session;
    if (!session || session.status !== 'active') return;
    set({ isSaving: true, error: null });
    try {
      const lastSavedAt = new Date().toISOString();
      const draft = { responses: session.responses, currentSectionIndex: session.currentSectionIndex, lastSavedAt };
      localStorage.setItem(draftKey(session.inspectionId), JSON.stringify(draft));
      await inspectionService.saveInspectionDraft({ ...session, lastSavedAt });
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
    set(state => ({
      error: null,
      session: state.session ? { ...state.session, status: 'submitting' } : state.session,
    }));
    try {
      await inspectionService.submitInspection(session);
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
