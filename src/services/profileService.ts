import { apiClient, MockInterceptError } from '../lib/apiClient'
import { API_ENDPOINTS } from '../constants/api'
import { toRecord, toStringValue, unwrapData } from '../lib/apiResponse'
import { authStorage } from '../lib/authStorage'
import type { ProfileData } from '../stores/profileStore'

export const profileService = {
  /**
   * Fetch the authenticated user's profile from the server (uses /users/me).
   */
  async getProfile(): Promise<ProfileData> {
    try {
      const res = await apiClient.get<unknown>(API_ENDPOINTS.USERS.ME)
      const data = toRecord(unwrapData(res.data))
      return {
        fullName: toStringValue(data.name || data.fullName || data.full_name || ''),
        role: toStringValue(data.role_name || data.roleName || data.role || 'user'),
        avatarBase64: toStringValue(data.avatar_url || data.avatarUrl || data.avatar || null),
        jobTitle: '',
        department: '',
        phone: '',
        workLocation: '',
      }
    } catch (e) {
      if (e instanceof MockInterceptError) {
        await new Promise<void>(r => setTimeout(r, 300))
        throw new ProfileNotFoundError()
      }
      throw e
    }
  },

  /**
   * Update the authenticated user's profile on the server.
   * Gracefully handles 403 Forbidden for non-admin roles (e.g. inspector).
   */
  async updateProfile(updates: Partial<ProfileData>): Promise<ProfileData> {
    try {
      const user = authStorage.getUser()
      if (user?.id) {
        const apiPayload: any = {}
        if (updates.fullName !== undefined) apiPayload.name = updates.fullName
        if (updates.avatarBase64 !== undefined) apiPayload.avatar_url = updates.avatarBase64

        if (Object.keys(apiPayload).length > 0) {
          try {
            await apiClient.put(`/users/${user.id}`, apiPayload)
          } catch (e: any) {
            if (e.status === 403) {
              console.warn('[profileService] 403 Forbidden: User not authorized to update backend user record. Keeping changes local.')
            } else {
              throw e
            }
          }
        }
      }
      return updates as ProfileData
    } catch (e) {
      if (e instanceof MockInterceptError) {
        await new Promise<void>(r => setTimeout(r, 400))
        return updates as ProfileData
      }
      throw e
    }
  },

  /**
   * Convert avatar image to base64 and upload to server.
   */
  async uploadAvatar(file: File): Promise<{ avatarBase64: string }> {
    // Convert file to base64 locally
    const reader = new FileReader()
    const base64Promise = new Promise<string>((resolve, reject) => {
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = (err) => reject(err)
    })
    reader.readAsDataURL(file)
    const base64 = await base64Promise

    try {
      const user = authStorage.getUser()
      if (user?.id) {
        try {
          await apiClient.put(`/users/${user.id}`, { avatar_url: base64 })
        } catch (e: any) {
          if (e.status === 403) {
            console.warn('[profileService] 403 Forbidden: User not authorized to update backend user record. Keeping avatar local.')
          } else {
            throw e
          }
        }
      }
      return { avatarBase64: base64 }
    } catch (e) {
      if (e instanceof MockInterceptError) {
        await new Promise<void>(r => setTimeout(r, 500))
        return { avatarBase64: base64 }
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
