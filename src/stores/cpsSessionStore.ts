import { create } from 'zustand';
import { cpsService } from '../services/cpsService';
import { inspectionService } from '../services/inspectionService';
import type { InspectionSession, InspectionResponse } from '../types/inspection';

const draftKey = (id: string) => `gtech_cps_draft_${id}`;

interface CpsSessionState {
  session: InspectionSession | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;

  loadSession: (cpsId: string, site?: string, assignee?: string) => Promise<void>;
  clearSession: () => void;

  setResponse: (fieldId: string, value: unknown) => void;
  setNote: (fieldId: string, note: string) => void;
  addMedia: (fieldId: string, file: File) => Promise<void>;
  removeMedia: (fieldId: string, uri: string) => Promise<void>;

  goToSection: (index: number) => void;

  saveDraft: () => Promise<void>;
  submitCps: () => Promise<void>;
}

let _autoSaveTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleAutoSave(get: () => CpsSessionState) {
  if (_autoSaveTimer) clearTimeout(_autoSaveTimer);
  _autoSaveTimer = setTimeout(() => {
    get().saveDraft();
  }, 1500);
}

export const useCpsSessionStore = create<CpsSessionState>()((set, get) => ({
  session: null,
  isLoading: false,
  isSaving: false,
  error: null,

  loadSession: async (cpsId, site, assignee) => {
    set({ isLoading: true, error: null });
    try {
      const session = await cpsService.getCpsSession(cpsId);
      if (site) session.site = site;
      if (assignee) session.assignee = assignee;

      const saved = localStorage.getItem(draftKey(cpsId));
      if (saved) {
        try {
          const { responses, currentSectionIndex, lastSavedAt } = JSON.parse(saved);
          session.responses = { ...session.responses, ...responses };
          session.currentSectionIndex = currentSectionIndex ?? session.currentSectionIndex;
          session.lastSavedAt = lastSavedAt;
        } catch {}
      }
      set({ session, isLoading: false });
    } catch (err) {
      set({ isLoading: false, error: err instanceof Error ? err.message : 'Failed to load CPS session' });
    }
  },

  clearSession: () => {
    if (_autoSaveTimer) clearTimeout(_autoSaveTimer);
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
        attachments: existing?.attachments,
        mediaUris: existing?.mediaUris,
        answeredAt: new Date().toISOString(),
      };
      
      // Immediately call API to sync answer (matching regular inspection form)
      inspectionService.upsertFieldValue(state.session.inspectionId, {
        field_id: fieldId,
        value: String(value),
      }).then(res => {
        set(s => {
          if (!s.session) return s;
          const resp = s.session.responses[fieldId];
          if (!resp) return s;
          return {
            session: {
              ...s.session,
              responses: {
                ...s.session.responses,
                [fieldId]: { ...resp, fieldValueId: res.id }
              }
            }
          };
        });
      }).catch(err => console.error('Failed to autosave CPS answer:', err));

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
        ? { ...existing, note }
        : { fieldId, value: undefined, note };

      inspectionService.upsertFieldValue(state.session.inspectionId, {
        field_id: fieldId,
        value: String(existing?.value || ''),
        note,
      }).catch(err => console.error('Failed to autosave CPS note:', err));

      return {
        session: {
          ...state.session,
          responses: { ...state.session.responses, [fieldId]: updated },
        },
      };
    });
    scheduleAutoSave(get);
  },

  addMedia: async (fieldId, file) => {
    const { session } = get();
    if (!session) return;
    
    // Add temp item with uploading state
    const tempUri = URL.createObjectURL(file);
    const tempAttachment = {
      uri: tempUri,
      filename: file.name,
      file_type: file.type,
      uploading: true,
    };

    set(state => {
      if (!state.session) return state;
      const existing = state.session.responses[fieldId];
      const updated: InspectionResponse = existing
        ? {
            ...existing,
            attachments: [...(existing.attachments || []), tempAttachment],
            mediaUris: [...(existing.mediaUris || []), tempUri],
          }
        : {
            fieldId,
            value: undefined,
            attachments: [tempAttachment],
            mediaUris: [tempUri],
          };
      return {
        session: {
          ...state.session,
          responses: { ...state.session.responses, [fieldId]: updated },
        },
      };
    });

    try {
      const formData = new FormData();
      formData.append('files', file);
      const uploaded = await inspectionService.uploadAttachment(session.inspectionId, formData);
      
      const existingResp = get().session?.responses[fieldId];
      if (!existingResp) return;

      const confirmed = await inspectionService.createAttachment(session.inspectionId, {
        field_value_id: existingResp.fieldValueId || '',
        file_url: uploaded.file_url,
        file_type: uploaded.file_type,
        filename: uploaded.filename,
        type: 'general',
      });

      set(state => {
        if (!state.session) return state;
        const existing = state.session.responses[fieldId];
        if (!existing) return state;

        const filteredAttachments = (existing.attachments || []).filter(a => a.uri !== tempUri);
        const filteredMedia = (existing.mediaUris || []).filter(u => u !== tempUri);

        const newAttachment = {
          uri: uploaded.file_url,
          attachment_id: confirmed.id,
          file_url: uploaded.file_url,
          file_type: uploaded.file_type,
          filename: uploaded.filename,
          type: 'general' as const,
          uploading: false,
        };

        return {
          session: {
            ...state.session,
            responses: {
              ...state.session.responses,
              [fieldId]: {
                ...existing,
                attachments: [...filteredAttachments, newAttachment],
                mediaUris: [...filteredMedia, uploaded.file_url],
              },
            },
          },
        };
      });
      get().saveDraft();
    } catch (err) {
      console.error('[addMedia error]', err);
    }
  },

  removeMedia: async (fieldId, uri) => {
    const { session } = get();
    if (!session) return;
    const existing = session.responses[fieldId];
    if (!existing) return;

    const attachment = existing.attachments?.find(a => a.uri === uri || a.file_url === uri);
    
    // Remove locally
    set(state => {
      if (!state.session) return state;
      const resp = state.session.responses[fieldId];
      if (!resp) return state;
      return {
        session: {
          ...state.session,
          responses: {
            ...state.session.responses,
            [fieldId]: {
              ...resp,
              attachments: (resp.attachments || []).filter(a => a.uri !== uri && a.file_url !== uri),
              mediaUris: (resp.mediaUris || []).filter(u => u !== uri),
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
      }
    }
    get().saveDraft();
  },

  goToSection: (index) => {
    set(state => {
      if (!state.session) return state;
      return {
        session: { ...state.session, currentSectionIndex: index },
      };
    });
    get().saveDraft();
  },

  saveDraft: async () => {
    const { session } = get();
    if (!session) return;
    set({ isSaving: true });
    try {
      localStorage.setItem(
        draftKey(session.inspectionId),
        JSON.stringify({
          responses: session.responses,
          currentSectionIndex: session.currentSectionIndex,
          lastSavedAt: new Date().toISOString(),
        })
      );
      set({ isSaving: false });
    } catch (err) {
      set({ isSaving: false, error: 'Failed to save local draft' });
    }
  },

  submitCps: async () => {
    const { session } = get();
    if (!session) return;
    set({ isSaving: true, error: null });
    try {
      await cpsService.submitCps(session.inspectionId);
      localStorage.removeItem(draftKey(session.inspectionId));
      set({ isSaving: false });
    } catch (err) {
      set({ isSaving: false, error: err instanceof Error ? err.message : 'Failed to submit CPS checklist' });
      throw err;
    }
  },
}));
