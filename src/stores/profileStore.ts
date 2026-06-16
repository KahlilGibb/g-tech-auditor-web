import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { profileService, ProfileNotFoundError } from '../services/profileService'
import { getApiErrorMessage } from '../lib/apiResponse'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ProfileData = {
  fullName: string
  jobTitle: string
  department: string
  phone: string
  workLocation: string
  role: string
  avatarBase64: string | null
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_PROFILE: ProfileData = {
  fullName: '',
  jobTitle: '',
  department: '',
  phone: '',
  workLocation: '',
  role: '',
  avatarBase64: null,
}

// ─── Store shape ──────────────────────────────────────────────────────────────

interface ProfileStoreState {
  profile: ProfileData
  isLoading: boolean
  error: string | null

  // Async (API-backed)
  fetchProfile: () => Promise<void>
  updateProfile: (updates: Partial<ProfileData>) => Promise<void>
  uploadAvatar: (file: File) => Promise<void>

  // Local-only
  removeAvatar: () => void
  clearError: () => void
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useProfileStore = create<ProfileStoreState>()(
  persist(
    (set, get) => ({
      profile: DEFAULT_PROFILE,
      isLoading: false,
      error: null,

      fetchProfile: async () => {
        set({ isLoading: true, error: null })
        try {
          const serverProfile = await profileService.getProfile()
          set({ profile: serverProfile, isLoading: false })
        } catch (e) {
          if (e instanceof ProfileNotFoundError) {
            // No server profile yet — keep local defaults, not an error
            set({ isLoading: false })
          } else {
            const message = getApiErrorMessage(e, 'Failed to load profile')
            set({ isLoading: false, error: message })
          }
        }
      },

      updateProfile: async (updates) => {
        const snapshot = get().profile
        // Optimistic update: apply immediately so UI feels instant
        set(state => ({ profile: { ...state.profile, ...updates } }))
        try {
          await profileService.updateProfile(updates)
        } catch (e) {
          // Rollback on server error
          set({ profile: snapshot })
          const message = getApiErrorMessage(e, 'Failed to update profile')
          set({ error: message })
          throw e
        }
      },

      uploadAvatar: async (file) => {
        set({ isLoading: true, error: null })
        try {
          const { avatarBase64 } = await profileService.uploadAvatar(file)
          set(state => ({
            profile: { ...state.profile, avatarBase64 },
            isLoading: false,
          }))
        } catch (e) {
          const message = getApiErrorMessage(e, 'Failed to upload avatar')
          set({ isLoading: false, error: message })
          throw e
        }
      },

      removeAvatar: () =>
        set(state => ({ profile: { ...state.profile, avatarBase64: null } })),

      clearError: () => set({ error: null }),
    }),
    {
      name: 'gtech-profile-store',
      storage: createJSONStorage(() => localStorage),
      version: 1, // bump version to invalidate old mock cache
    },
  ),
)
