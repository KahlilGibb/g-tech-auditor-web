import { create } from 'zustand'
import type { NotificationItem } from '../types/notification'
import { notificationService } from '../services/notificationService'
import { getApiErrorMessage } from '../lib/apiResponse'

interface NotificationStoreState {
  notifications: NotificationItem[]
  unreadCount: number
  isLoading: boolean
  isFetched: boolean
  error: string | null
  _pollTimer: ReturnType<typeof setInterval> | null

  fetchNotifications: (force?: boolean) => Promise<void>
  fetchUnreadCount: () => Promise<void>
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  disconnect: () => void
  clearError: () => void
}

// The web has no push channel (Gotify is gone and FCM serves the phones), so
// the bell stays current by polling the unread count.
const POLL_INTERVAL_MS = 60_000

export const useNotificationStore = create<NotificationStoreState>()((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  isFetched: false,
  error: null,
  _pollTimer: null,

  fetchNotifications: async (force = false) => {
    const { isFetched, notifications } = get()
    if (!get()._pollTimer) {
      set({ _pollTimer: setInterval(() => void get().fetchUnreadCount(), POLL_INTERVAL_MS) })
    }
    if (!force && isFetched && notifications.length > 0) return
    set({ isLoading: true, error: null })
    try {
      const data = await notificationService.getNotifications()
      set({
        notifications: data,
        isLoading: false,
        isFetched: true,
      })
      // The list is capped at 50; the badge takes the true total.
      void get().fetchUnreadCount()
    } catch (e) {
      set({
        isLoading: false,
        error: getApiErrorMessage(e, 'Failed to load notifications'),
      })
    }
  },

  disconnect: () => {
    const { _pollTimer } = get()
    if (_pollTimer) clearInterval(_pollTimer)
    set({ _pollTimer: null, notifications: [], unreadCount: 0, isFetched: false })
  },

  fetchUnreadCount: async () => {
    try {
      const unreadCount = await notificationService.getUnreadCount()
      set({ unreadCount })
    } catch (e) {
      set({
        error: getApiErrorMessage(e, 'Failed to load notification count'),
      })
    }
  },

  markAsRead: async (id: string) => {
    const wasUnread = get().notifications.some(n => n.id === id && !n.is_read)
    // Optimistic update
    set(s => ({
      notifications: s.notifications.map(n =>
        n.id === id ? { ...n, is_read: true } : n,
      ),
      unreadCount: Math.max(0, s.unreadCount - (wasUnread ? 1 : 0)),
    }))
    try {
      await notificationService.markAsRead(id)
    } catch (e) {
      // Rollback on failure
      set(s => ({
        notifications: s.notifications.map(n =>
          n.id === id ? { ...n, is_read: false } : n,
        ),
        unreadCount: s.unreadCount + (wasUnread ? 1 : 0),
        error: getApiErrorMessage(e, 'Failed to mark notification as read'),
      }))
    }
  },

  markAllAsRead: async () => {
    const snapshot = get().notifications
    const unreadSnapshot = get().unreadCount
    // Optimistic update
    set(s => ({
      notifications: s.notifications.map(n => ({ ...n, is_read: true })),
      unreadCount: 0,
    }))
    try {
      await notificationService.markAllAsRead()
    } catch (e) {
      // Rollback on failure
      set({
        notifications: snapshot,
        unreadCount: unreadSnapshot,
        error: getApiErrorMessage(e, 'Failed to mark all notifications as read'),
      })
    }
  },

  clearError: () => set({ error: null }),
}))
