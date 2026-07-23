import { apiClient, MockInterceptError } from '../lib/apiClient'
import { API_ENDPOINTS } from '../constants/api'
import { toRecord, toStringValue, unwrapList } from '../lib/apiResponse'
import type { NotificationGroup, NotificationItem, NotificationType } from '../types/notification'

// TODO: Remove MOCK_DATA when real API is connected.
const MOCK_DATA: NotificationItem[] = [
  {
    id: 'notif-001',
    type: 'assignment',
    title: 'Aksi baru ditugaskan',
    message: 'Perbaikan kebocoran oli pada Dealer Nissan Pulo Gadung telah ditugaskan kepada Anda.',
    time: '2 jam lalu',
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    is_read: false,
    group: 'today',
    route: '/actions',
  },
  {
    id: 'notif-002',
    type: 'due',
    title: 'Inspeksi segera jatuh tempo',
    message: 'Inspeksi PDI Avanza - Dealer Sunter akan berakhir dalam 2 jam. Segera selesaikan.',
    time: '4 jam lalu',
    created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    is_read: false,
    group: 'today',
    route: '/inspections',
  },
  {
    id: 'notif-003',
    type: 'comment',
    title: 'Komentar baru',
    message: 'Riko Pratama menambahkan komentar: "Perlu dikonfirmasi dengan kepala bengkel terlebih dahulu."',
    time: '1 hari lalu',
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    is_read: true,
    group: 'earlier',
    route: '/actions',
  },
  {
    id: 'notif-004',
    type: 'completed',
    title: 'Inspeksi disetujui',
    message: 'Inspeksi CPS Dealer KIA PIK bulan Maret telah disetujui oleh supervisor Anda.',
    time: '2 hari lalu',
    created_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    is_read: true,
    group: 'earlier',
    route: '/cps',
  },
]

function normalizeNotification(raw: unknown): NotificationItem {
  const record = toRecord(raw)
  const createdAt =
    toStringValue(record.created_at || record.createdAt || record.createdAtIso) ||
    new Date().toISOString()
  const rawType = toStringValue(record.type || record.category)
  const type: NotificationType =
    rawType === 'assignment' || rawType === 'due' || rawType === 'comment' || rawType === 'completed'
      ? rawType
      : 'comment'
  const rawGroup = toStringValue(record.group)
  const isRead = Boolean(record.is_read ?? record.isRead ?? record.read_at ?? record.readAt)
  const group: NotificationGroup = rawGroup === 'today' || rawGroup === 'earlier'
    ? rawGroup
    : isRead
      ? 'earlier'
      : 'today'

  return {
    id: toStringValue(record.id || record.notification_id || record.notificationId) || crypto.randomUUID(),
    type,
    title: toStringValue(record.title || record.subject) || 'Notification',
    message: toStringValue(record.message || record.body || record.description),
    time: toStringValue(record.time || record.relative_time || record.relativeTime) || createdAt,
    created_at: createdAt,
    is_read: isRead,
    group,
    route: toStringValue(record.route || record.url || record.path) || undefined,
  }
}

function unreadFromPayload(payload: unknown): number {
  const record = toRecord(payload)
  const data = toRecord(record.data)
  const value =
    record.count ??
    record.unread_count ??
    record.unreadCount ??
    data.count ??
    data.unread_count ??
    data.unreadCount

  return typeof value === 'number' ? value : Number(value || 0)
}

export const notificationService = {
  async getNotifications(): Promise<NotificationItem[]> {
    try {
      const res = await apiClient.get(API_ENDPOINTS.NOTIFICATIONS.LIST, {
        params: { page: 1, limit: 50 },
      })
      return unwrapList<unknown>(res.data).map(normalizeNotification)
    } catch (e) {
      if (e instanceof MockInterceptError) {
        await new Promise<void>(r => setTimeout(r, 400))
        return [...MOCK_DATA]
      }
      throw e
    }
  },

  async getUnreadCount(): Promise<number> {
    try {
      const res = await apiClient.get(API_ENDPOINTS.NOTIFICATIONS.UNREAD_COUNT)
      return unreadFromPayload(res.data)
    } catch (e) {
      if (e instanceof MockInterceptError) {
        await new Promise<void>(r => setTimeout(r, 150))
        return MOCK_DATA.filter(item => !item.is_read).length
      }
      throw e
    }
  },

  async markAsRead(id: string): Promise<void> {
    try {
      await apiClient.post(API_ENDPOINTS.NOTIFICATIONS.MARK_READ(id))
    } catch (e) {
      if (e instanceof MockInterceptError) {
        await new Promise<void>(r => setTimeout(r, 150))
        return
      }
      throw e
    }
  },

  async markAllAsRead(): Promise<void> {
    try {
      await apiClient.post(API_ENDPOINTS.NOTIFICATIONS.MARK_ALL_READ)
    } catch (e) {
      if (e instanceof MockInterceptError) {
        await new Promise<void>(r => setTimeout(r, 150))
        return
      }
      throw e
    }
  },

  async getGotifyConfig(): Promise<import('../types/notification').GotifyConfig> {
    try {
      const res = await apiClient.get<import('../types/notification').GotifyConfig>(API_ENDPOINTS.USERS.GOTIFY_CONFIG)
      return res.data
    } catch (e) {
      if (e instanceof MockInterceptError) {
        return {
          url: 'http://localhost:8080',
          client_token: 'mock-gotify-token'
        }
      }
      throw e;
    }
  },

  async getGotifyMessages(config: import('../types/notification').GotifyConfig): Promise<NotificationItem[]> {
    try {
      const res = await fetch(`${config.url}/message?limit=50`, {
        headers: { 'X-Gotify-Key': config.client_token },
      })
      if (!res.ok) throw new Error('Failed to fetch Gotify messages')
      const data = await res.json()
      return (data.messages as import('../types/notification').GotifyMessage[]).map(gotifyToNotification)
    } catch {
      return []
    }
  },

  async deleteGotifyMessage(config: import('../types/notification').GotifyConfig, id: string): Promise<void> {
    await fetch(`${config.url}/message/${id}`, {
      method: 'DELETE',
      headers: { 'X-Gotify-Key': config.client_token },
    })
  },

  async deleteAllGotifyMessages(config: import('../types/notification').GotifyConfig): Promise<void> {
    await fetch(`${config.url}/message`, {
      method: 'DELETE',
      headers: { 'X-Gotify-Key': config.client_token },
    })
  },

  connectWebSocket(
    config: import('../types/notification').GotifyConfig,
    onMessage: (item: NotificationItem) => void,
    onClose: () => void,
  ): WebSocket {
    const ws = new WebSocket(`${toWsUrl(config.url)}/stream?token=${config.client_token}`)
    ws.onmessage = (event) => {
      try {
        const msg: import('../types/notification').GotifyMessage = JSON.parse(event.data)
        onMessage(gotifyToNotification(msg))
      } catch {}
    }
    ws.onclose = onClose
    ws.onerror = onClose
    return ws
  },
}

function toWsUrl(httpsUrl: string): string {
  return httpsUrl.replace(/^https?/, (s) => (s === 'https' ? 'wss' : 'ws'))
}

function gotifyToNotification(msg: import('../types/notification').GotifyMessage): NotificationItem {
  const created = new Date(msg.date)
  const isToday = created.toDateString() === new Date().toDateString()
  const type: import('../types/notification').NotificationType = msg.extras?.app?.type ?? 'assignment'
  return {
    id: String(msg.id),
    type,
    title: msg.title,
    message: msg.message,
    time: relativeTime(msg.date),
    created_at: msg.date,
    is_read: false,
    group: isToday ? 'today' : 'earlier',
    route: msg.extras?.app?.route,
  }
}

function relativeTime(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime()
  const mins = Math.floor(diffMs / 60_000)
  const hours = Math.floor(diffMs / 3_600_000)
  const days = Math.floor(diffMs / 86_400_000)
  if (mins < 1) return 'Baru saja'
  if (mins < 60) return `${mins} mnt lalu`
  if (hours < 24) return `${hours} jam lalu`
  return `${days} hari lalu`
}
