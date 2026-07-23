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
  // internal WS states
  _config: import('../types/notification').GotifyConfig | null
  _ws: WebSocket | null
  _reconnectTimer: any | null

  fetchNotifications: (force?: boolean) => Promise<void>
  fetchUnreadCount: () => Promise<void>
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  disconnect: () => void
  _openWebSocket: (config: import('../types/notification').GotifyConfig) => void
  clearError: () => void
}

const RECONNECT_DELAY_MS = 5000;

export const useNotificationStore = create<NotificationStoreState>()((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  isFetched: false,
  error: null,
  _config: null,
  _ws: null,
  _reconnectTimer: null,

  fetchNotifications: async (force = false) => {
    const { isFetched, notifications, _config } = get()
    if (!force && isFetched && notifications.length > 0) return
    set({ isLoading: true, error: null })
    try {
      const data = await notificationService.getNotifications()
      set({
        notifications: data,
        unreadCount: data.filter(item => !item.is_read).length,
        isLoading: false,
        isFetched: true,
      })
      
      // Initialize Gotify WS
      try {
        const config = _config ?? await notificationService.getGotifyConfig()
        set({ _config: config })
        get()._openWebSocket(config)
      } catch (wsErr) {
        console.warn('Failed to start Gotify WebSocket:', wsErr)
      }
    } catch (e) {
      set({
        isLoading: false,
        error: getApiErrorMessage(e, 'Failed to load notifications'),
      })
    }
  },

  _openWebSocket: (config) => {
    const { _ws, _reconnectTimer } = get()
    if (_reconnectTimer) clearTimeout(_reconnectTimer)
    if (_ws) _ws.close()

    const ws = notificationService.connectWebSocket(
      config,
      (item) => {
        set(s => ({
          notifications: [item, ...s.notifications],
          unreadCount: s.unreadCount + 1
        }))
      },
      () => {
        // Reconnect after delay
        const timer = setTimeout(() => {
          const { _config } = get()
          if (_config) get()._openWebSocket(_config)
        }, RECONNECT_DELAY_MS)
        set({ _ws: null, _reconnectTimer: timer })
      }
    )
    set({ _ws: ws, _reconnectTimer: null })
  },

  disconnect: () => {
    const { _ws, _reconnectTimer } = get()
    if (_reconnectTimer) clearTimeout(_reconnectTimer)
    if (_ws) _ws.close()
    set({ _ws: null, _reconnectTimer: null, _config: null, isFetched: false })
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
