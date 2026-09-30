import apiClient from './client'
import type { ApiResponse, DiningDashboard, DiningVenue, SessionVenue, SessionVenueRequest } from './types'

// 우연한 식탁 운영 대시보드 — 타일 수치 + 다가오는 회차 카드 (KAN-348)
export const fetchDiningDashboard = async (): Promise<DiningDashboard> => {
  const response = await apiClient.get<ApiResponse<DiningDashboard>>('/api/admin/dining/dashboard')
  return response.data.data
}

// 식당 목록 (삭제 제외, 지역·이름 순)
export const fetchDiningVenues = async (): Promise<DiningVenue[]> => {
  const response = await apiClient.get<ApiResponse<DiningVenue[]>>('/api/admin/dining/venues')
  return response.data.data ?? []
}

// 회차 식당 풀을 목록으로 통째로 교체. 배정된 테이블보다 줄이면 409, 비활성 식당을 새로 넣으면 400
export const updateSessionVenues = async (sessionId: string, venues: SessionVenueRequest[]): Promise<SessionVenue[]> => {
  const response = await apiClient.put<ApiResponse<SessionVenue[]>>(`/api/admin/dining/sessions/${sessionId}/venues`, venues)
  return response.data.data
}
