import { apiClient, MockInterceptError } from '../lib/apiClient'
import { API_ENDPOINTS } from '../constants/api'
import type { ProfileData } from '../stores/profileStore'

export const profileService = {
  /**
   * Fetch the authenticated user's profile from the server.
   */
  async getProfile(): Promise<ProfileData> {
    try {
      const res = await apiClient.get<ProfileData>(API_ENDPOINTS.PROFILE.ME)
      return res.data
    } catch (e) {
      if (e instanceof MockInterceptError) {
        await new Promise<void>(r => setTimeout(r, 300))
        // Return null to signal "use the locally persisted profile"
        throw new ProfileNotFoundError()
      }
      throw e
    }
  },

  /**
   * Update the authenticated user's profile.
   * Only sends changed fields (partial update).
   */
  async updateProfile(updates: Partial<ProfileData>): Promise<ProfileData> {
    try {
      const res = await apiClient.patch<ProfileData>(API_ENDPOINTS.PROFILE.UPDATE, updates)
      return res.data
    } catch (e) {
      if (e instanceof MockInterceptError) {
        await new Promise<void>(r => setTimeout(r, 400))
        // In mock mode the store holds truth — return the updates merged back
        return updates as ProfileData
      }
      throw e
    }
  },

  /**
   * Upload avatar image.
   */
  async uploadAvatar(file: File): Promise<{ avatarBase64: string }> {
    try {
      const formData = new FormData()
      formData.append('avatar', file)
      const res = await apiClient.post<{ avatarBase64: string }>(
        API_ENDPOINTS.PROFILE.UPLOAD_AVATAR,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      )
      return res.data
    } catch (e) {
      if (e instanceof MockInterceptError) {
        await new Promise<void>(r => setTimeout(r, 500))
        return { avatarBase64: 'mock_base64_string' }
      }
      throw e
    }
  },
}

/**
 * Thrown when the server has no profile for the current user yet.
 * The store falls back to the locally persisted defaults.
 */
export class ProfileNotFoundError extends Error {
  constructor() {
    super('Profile not found on server')
    this.name = 'ProfileNotFoundError'
  }
}
