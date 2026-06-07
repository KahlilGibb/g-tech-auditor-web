import { apiClient, MockInterceptError } from '../lib/apiClient'
import { API_ENDPOINTS } from '../constants/api'
import type { NotificationItem } from '../types/notification'

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

export const notificationService = {
  async getNotifications(): Promise<NotificationItem[]> {
    try {
      const res = await apiClient.get<NotificationItem[]>(API_ENDPOINTS.NOTIFICATIONS.LIST)
      return res.data
    } catch (e) {
      if (e instanceof MockInterceptError) {
        await new Promise<void>(r => setTimeout(r, 400))
        return [...MOCK_DATA]
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
