import { create } from 'zustand'
import type { NotificationItem } from '../types/notification'
import { notificationService } from '../services/notificationService'
import { getApiErrorMessage } from '../lib/apiResponse'

interface NotificationStoreState {
  notifications: NotificationItem[]
  isLoading: boolean
  isFetched: boolean
  error: string | null
  fetchNotifications: (force?: boolean) => Promise<void>
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  clearError: () => void
}

export const useNotificationStore = create<NotificationStoreState>()((set, get) => ({
  notifications: [],
  isLoading: false,
  isFetched: false,
  error: null,

  fetchNotifications: async (force = false) => {
    const { isFetched, notifications } = get()
    if (!force && isFetched && notifications.length > 0) return
    set({ isLoading: true, error: null })
    try {
      const data = await notificationService.getNotifications()
      set({ notifications: data, isLoading: false, isFetched: true })
    } catch (e) {
      set({
        isLoading: false,
        error: getApiErrorMessage(e, 'Failed to load notifications'),
      })
    }
  },

  markAsRead: async (id: string) => {
    // Optimistic update
    set(s => ({
      notifications: s.notifications.map(n =>
        n.id === id ? { ...n, is_read: true } : n,
      ),
    }))
    try {
      await notificationService.markAsRead(id)
    } catch (e) {
      // Rollback on failure
      set(s => ({
        notifications: s.notifications.map(n =>
          n.id === id ? { ...n, is_read: false } : n,
        ),
        error: getApiErrorMessage(e, 'Failed to mark notification as read'),
      }))
    }
  },

  markAllAsRead: async () => {
    const snapshot = get().notifications
    // Optimistic update
    set(s => ({
      notifications: s.notifications.map(n => ({ ...n, is_read: true })),
    }))
    try {
      await notificationService.markAllAsRead()
    } catch (e) {
      // Rollback on failure
      set({
        notifications: snapshot,
        error: getApiErrorMessage(e, 'Failed to mark all notifications as read'),
      })
    }
  },

  clearError: () => set({ error: null }),
}))
