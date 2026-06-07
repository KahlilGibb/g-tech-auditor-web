// ─── Notification types ───────────────────────────────────────────────────────

export type NotificationType = 'assignment' | 'due' | 'comment' | 'completed'
export type NotificationGroup = 'today' | 'earlier'

export interface NotificationItem {
  id: string
  type: NotificationType
  title: string
  message: string
  /** Human-readable relative time string, e.g. "2 hours ago" */
  time: string
  created_at: string
  is_read: boolean
  group: NotificationGroup
  /** Optional deep-link route within the app */
  route?: string
}
