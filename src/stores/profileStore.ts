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
  fullName: 'John Smith',
  jobTitle: 'Senior Inspector',
  department: 'Fleet Operations',
  phone: '+62 812-3456-7890',
  workLocation: 'Dealer Sunter, Jakarta Utara',
  role: 'Inspector',
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

      removeAvatar: () =>
        set(state => ({ profile: { ...state.profile, avatarBase64: null } })),

      clearError: () => set({ error: null }),
    }),
    {
      name: 'gtech-profile-store',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)
