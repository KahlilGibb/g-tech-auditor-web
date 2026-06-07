import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { ResponseSet } from '../types/template'

// ─── Built-in sets ────────────────────────────────────────────────────────────

export const BUILT_IN_RESPONSE_SETS: ResponseSet[] = [
  {
    id: 'good-fair-poor',
    name: 'Good / Fair / Poor',
    isBuiltIn: true,
    options: [
      { id: 'g', label: 'Good', color: 'green' },
      { id: 'f', label: 'Fair', color: 'amber' },
      { id: 'p', label: 'Poor', color: 'red' },
      { id: 'na', label: 'N/A', color: 'neutral' },
    ],
  },
  {
    id: 'safe-at-risk',
    name: 'Safe / At Risk',
    isBuiltIn: true,
    options: [
      { id: 's', label: 'Safe', color: 'green' },
      { id: 'ar', label: 'At Risk', color: 'red' },
      { id: 'na', label: 'N/A', color: 'neutral' },
    ],
  },
  {
    id: 'pass-fail',
    name: 'Pass / Fail',
    isBuiltIn: true,
    options: [
      { id: 'p', label: 'Pass', color: 'green' },
      { id: 'f', label: 'Fail', color: 'red' },
      { id: 'na', label: 'N/A', color: 'neutral' },
    ],
  },
  {
    id: 'yes-no',
    name: 'Yes / No',
    isBuiltIn: true,
    options: [
      { id: 'y', label: 'Yes', color: 'green' },
      { id: 'n', label: 'No', color: 'red' },
      { id: 'na', label: 'N/A', color: 'neutral' },
    ],
  },
  {
    id: 'compliant',
    name: 'Compliant / Non-Compliant',
    isBuiltIn: true,
    options: [
      { id: 'c', label: 'Compliant', color: 'green' },
      { id: 'nc', label: 'Non-Compliant', color: 'red' },
      { id: 'na', label: 'N/A', color: 'neutral' },
    ],
  },
]

// ─── Store shape ──────────────────────────────────────────────────────────────

interface ResponseSetState {
  responseSets: ResponseSet[]
  saveResponseSet: (set: ResponseSet) => void
  deleteResponseSet: (id: string) => void
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useResponseSetStore = create<ResponseSetState>()(
  persist(
    (set) => ({
      responseSets: BUILT_IN_RESPONSE_SETS,

      saveResponseSet: (newSet) =>
        set((state) => {
          const exists = state.responseSets.find((s) => s.id === newSet.id)
          if (exists) {
            return {
              responseSets: state.responseSets.map((s) =>
                s.id === newSet.id ? newSet : s,
              ),
            }
          }
          return { responseSets: [...state.responseSets, newSet] }
        }),

      deleteResponseSet: (id) =>
        set((state) => ({
          // Prevent deletion of built-in sets
          responseSets: state.responseSets.filter(
            (s) => s.id !== id || s.isBuiltIn === true,
          ),
        })),
    }),
    {
      name: 'gtech-response-sets',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)
