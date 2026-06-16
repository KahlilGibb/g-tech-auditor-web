import { create } from 'zustand'
import { templateService } from '../services/templateService'
import { getApiErrorMessage } from '../lib/apiResponse'
import type { FieldType, MasterField, MasterFieldOption } from '../types/template'

export interface MasterFieldInput {
  name: string
  field_type: FieldType
  configuration?: Record<string, unknown>
}

export interface MasterFieldOptionInput {
  label: string
  value: string
  score_value: number
}

interface MasterFieldStoreState {
  masterFields: MasterField[]
  isLoading: boolean
  isSaving: boolean
  isFetched: boolean
  error: string | null
  fetchMasterFields: (force?: boolean) => Promise<void>
  createMasterField: (input: MasterFieldInput) => Promise<MasterField>
  updateMasterField: (id: string, input: Partial<MasterFieldInput>) => Promise<MasterField>
  deleteMasterField: (id: string) => Promise<void>
  fetchOptions: (masterFieldId: string) => Promise<MasterFieldOption[]>
  createOption: (masterFieldId: string, input: MasterFieldOptionInput) => Promise<MasterFieldOption>
  updateOption: (
    masterFieldId: string,
    optionId: string,
    input: Partial<MasterFieldOptionInput>,
  ) => Promise<MasterFieldOption>
  deleteOption: (masterFieldId: string, optionId: string) => Promise<void>
  clearError: () => void
}

function updateFieldOptions(
  fields: MasterField[],
  masterFieldId: string,
  updater: (options: MasterFieldOption[]) => MasterFieldOption[],
) {
  return fields.map(field =>
    field.id === masterFieldId
      ? { ...field, options: updater(field.options ?? []) }
      : field,
  )
}

export const useMasterFieldStore = create<MasterFieldStoreState>()((set, get) => ({
  masterFields: [],
  isLoading: false,
  isSaving: false,
  isFetched: false,
  error: null,

  fetchMasterFields: async (force = false) => {
    if (!force && get().isFetched && get().masterFields.length > 0) return
    set({ isLoading: true, error: null })
    try {
      const masterFields = await templateService.getMasterFields()
      set({ masterFields, isLoading: false, isFetched: true })
    } catch (e) {
      set({ isLoading: false, error: getApiErrorMessage(e, 'Failed to load master fields') })
    }
  },

  createMasterField: async (input) => {
    set({ isSaving: true, error: null })
    try {
      const masterField = await templateService.createMasterField(input)
      set(state => ({
        masterFields: [masterField, ...state.masterFields],
        isSaving: false,
        isFetched: true,
      }))
      return masterField
    } catch (e) {
      set({ isSaving: false, error: getApiErrorMessage(e, 'Failed to create master field') })
      throw e
    }
  },

  updateMasterField: async (id, input) => {
    set({ isSaving: true, error: null })
    try {
      const masterField = await templateService.updateMasterField(id, input)
      set(state => ({
        masterFields: state.masterFields.map(item => item.id === id ? masterField : item),
        isSaving: false,
      }))
      return masterField
    } catch (e) {
      set({ isSaving: false, error: getApiErrorMessage(e, 'Failed to update master field') })
      throw e
    }
  },

  deleteMasterField: async (id) => {
    const snapshot = get().masterFields
    set({
      masterFields: snapshot.filter(item => item.id !== id),
      isSaving: true,
      error: null,
    })
    try {
      await templateService.deleteMasterField(id)
      set({ isSaving: false })
    } catch (e) {
      set({
        masterFields: snapshot,
        isSaving: false,
        error: getApiErrorMessage(e, 'Failed to delete master field'),
      })
      throw e
    }
  },

  fetchOptions: async (masterFieldId) => {
    set({ error: null })
    try {
      const options = await templateService.getMasterFieldOptions(masterFieldId)
      set(state => ({
        masterFields: state.masterFields.map(field =>
          field.id === masterFieldId ? { ...field, options } : field,
        ),
      }))
      return options
    } catch (e) {
      set({ error: getApiErrorMessage(e, 'Failed to load options') })
      throw e
    }
  },

  createOption: async (masterFieldId, input) => {
    set({ isSaving: true, error: null })
    try {
      const option = await templateService.createMasterFieldOption(masterFieldId, input)
      set(state => ({
        masterFields: updateFieldOptions(state.masterFields, masterFieldId, options => [option, ...options]),
        isSaving: false,
      }))
      return option
    } catch (e) {
      set({ isSaving: false, error: getApiErrorMessage(e, 'Failed to create option') })
      throw e
    }
  },

  updateOption: async (masterFieldId, optionId, input) => {
    set({ isSaving: true, error: null })
    try {
      const option = await templateService.updateMasterFieldOption(masterFieldId, optionId, input)
      set(state => ({
        masterFields: updateFieldOptions(state.masterFields, masterFieldId, options =>
          options.map(item => item.id === optionId ? option : item),
        ),
        isSaving: false,
      }))
      return option
    } catch (e) {
      set({ isSaving: false, error: getApiErrorMessage(e, 'Failed to update option') })
      throw e
    }
  },

  deleteOption: async (masterFieldId, optionId) => {
    const snapshot = get().masterFields
    set(state => ({
      masterFields: updateFieldOptions(state.masterFields, masterFieldId, options =>
        options.filter(item => item.id !== optionId),
      ),
      isSaving: true,
      error: null,
    }))
    try {
      await templateService.deleteMasterFieldOption(masterFieldId, optionId)
      set({ isSaving: false })
    } catch (e) {
      set({
        masterFields: snapshot,
        isSaving: false,
        error: getApiErrorMessage(e, 'Failed to delete option'),
      })
      throw e
    }
  },

  clearError: () => set({ error: null }),
}))
