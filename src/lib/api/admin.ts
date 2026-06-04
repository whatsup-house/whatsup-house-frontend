import apiClient from './client'
import type { ApiResponse, AdminDashboardGathering } from './types'

export type AdminGatheringStatus = 'OPEN' | 'CLOSED' | 'COMPLETED' | 'CANCELLED'

export interface AdminGathering {
  id: string
  title: string
  date: string           // YYYY-MM-DD
  startTime: string      // HH:mm:ss
  endTime: string
  locationName: string | null
  price: number
  capacity: number
  applicantCount: number
  status: AdminGatheringStatus
  thumbnailUrl: string | null
  moodTags: string[] | null
  activityTags: string[] | null
}

// 관리자 게더링 목록 조회
export const fetchAdminGatherings = async (): Promise<AdminGathering[]> => {
  const response = await apiClient.get<ApiResponse<AdminGathering[]>>('/api/admin/gatherings')
  return response.data.data ?? []
}

// 대시보드용 게더링 조회 (from/to 날짜 필터 지원)
export const fetchAdminDashboardGatherings = async (
  from?: string,
  to?: string,
): Promise<AdminDashboardGathering[]> => {
  const params = new URLSearchParams()
  if (from) params.append('from', from)
  if (to) params.append('to', to)
  const query = params.toString()
  const response = await apiClient.get<ApiResponse<AdminDashboardGathering[]>>(
    `/api/admin/gatherings${query ? `?${query}` : ''}`,
  )
  return response.data.data ?? []
}
