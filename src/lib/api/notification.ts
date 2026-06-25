import apiClient from './client'
import type { ApiResponse, NotificationItem, UnreadCountResponse } from './types'

// 내 알림 목록 조회
export const fetchNotifications = async (): Promise<NotificationItem[]> => {
  const response = await apiClient.get<ApiResponse<NotificationItem[]>>('/api/notifications')
  return response.data.data
}

// 미확인 알림 개수 조회
export const fetchUnreadCount = async (): Promise<UnreadCountResponse> => {
  const response = await apiClient.get<ApiResponse<UnreadCountResponse>>('/api/notifications/unread-count')
  return response.data.data
}

// 알림 읽음 처리
export const markNotificationRead = async (id: string): Promise<void> => {
  await apiClient.patch<ApiResponse<void>>(`/api/notifications/${id}/read`)
}

// 알림 삭제
export const deleteNotification = async (id: string): Promise<void> => {
  await apiClient.delete<ApiResponse<void>>(`/api/notifications/${id}`)
}
