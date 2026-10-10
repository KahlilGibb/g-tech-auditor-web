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
]

// The backend speaks in event types (e.g. "inspection_issues") plus a client
// kind in `data.type` shared with the mobile app ("issue", "assignment", …).
const KIND_TO_TYPE: Record<string, NotificationType> = {
  assignment: 'assignment',
  issue: 'due',
  comment: 'comment',
  completed: 'completed',
}

const EVENT_TO_TYPE: Record<string, NotificationType> = {
  action_assigned: 'assignment',
  issues_assigned: 'assignment',
  action_commented: 'comment',
  inspection_issues: 'due',
  rule_notify: 'due',
  action_resolved: 'completed',
  self_inspection_reviewed: 'completed',
  cps_submitted: 'completed',
}

/** A query value from a mobile deep link such as `/(app)/(tabs)/actions?actionId=…`. */
function queryParam(route: string, name: string): string | undefined {
  const query = route.split('?')[1]
  if (!query) return undefined
  return new URLSearchParams(query).get(name) ?? undefined
}

/**
 * Where clicking the notification should go in the web app. The backend's
 * `data.route` is the mobile app's deep link, so it is translated; rows
 * without one fall back to the screen that matches their type.
 */
export function webRouteFor(record: Record<string, unknown>): string | undefined {
  const data = toRecord(record.data)
  const route = toStringValue(data.route || record.route)
  const type = toStringValue(record.type)
  const inspectionId = toStringValue(record.inspection_id)

  if (route.includes('actions')) {
    const actionId = queryParam(route, 'actionId')
    return actionId ? `/actions?actionId=${encodeURIComponent(actionId)}` : '/actions'
  }
  if (route.includes('inspection-session')) {
    const id = queryParam(route, 'id') || inspectionId
    return id ? `/inspections/${encodeURIComponent(id)}/session` : '/inspections'
  }
  if (route.startsWith('/') && !route.startsWith('/(')) return route

  switch (type) {
    case 'password_reset_requested':
      return '/users'
    case 'template_created':
    case 'template_published':
      return '/templates'
    case 'cps_submitted':
      return '/cps'
    case 'action_assigned':
    case 'action_commented':
    case 'action_resolved':
    case 'issues_assigned':
      return '/actions'
  }
  if (inspectionId) return `/inspections/${encodeURIComponent(inspectionId)}/session`
  return undefined
}

export function relativeTime(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime()
  if (Number.isNaN(diffMs)) return ''
  const mins = Math.floor(diffMs / 60_000)
  const hours = Math.floor(diffMs / 3_600_000)
  const days = Math.floor(diffMs / 86_400_000)
  if (mins < 1) return 'Baru saja'
  if (mins < 60) return `${mins} mnt lalu`
  if (hours < 24) return `${hours} jam lalu`
  return `${days} hari lalu`
}

function normalizeNotification(raw: unknown): NotificationItem {
  const record = toRecord(raw)
  const data = toRecord(record.data)
  const createdAt = toStringValue(record.created_at || record.createdAt) || new Date().toISOString()
  const kind = toStringValue(data.type)
  const event = toStringValue(record.type)
  const type: NotificationType = KIND_TO_TYPE[kind] ?? EVENT_TO_TYPE[event] ?? 'comment'
  const isRead = Boolean(record.is_read ?? record.isRead ?? record.read_at ?? record.readAt)
  const isToday = new Date(createdAt).toDateString() === new Date().toDateString()
  const group: NotificationGroup = isToday ? 'today' : 'earlier'

  return {
    id: toStringValue(record.id || record.notification_id) || crypto.randomUUID(),
    type,
    title: toStringValue(record.title || record.subject) || 'Notification',
    message: toStringValue(record.message || record.body || record.description),
    time: relativeTime(createdAt),
    created_at: createdAt,
    is_read: isRead,
    group,
    route: webRouteFor(record),
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
}
