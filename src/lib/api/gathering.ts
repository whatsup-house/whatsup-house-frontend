import apiClient from './client'
import type { ApiResponse, GatheringListItem, GatheringDetail, GuestApplicationRequest, UserApplicationRequest } from './types'

// 날짜별 게더링 목록 조회
export const fetchGatherings = async (date: string): Promise<GatheringListItem[]> => {
  const response = await apiClient.get<ApiResponse<GatheringListItem[]>>('/api/gatherings', { params: { date } })
  return response.data.data
}

// 게더링 상세 조회
export const fetchGatheringDetail = async (id: string): Promise<GatheringDetail> => {
  const response = await apiClient.get<ApiResponse<GatheringDetail>>(`/api/gatherings/${id}`)
  return response.data.data
}

// 달력 dot 표시용 날짜 목록 조회 (백엔드 전용 엔드포인트 없음 - 전체 목록에서 파생)
export const fetchCalendarDots = async (year: number, month: number): Promise<string[]> => {
  const response = await apiClient.get<ApiResponse<GatheringListItem[]>>('/api/gatherings')
  const prefix = `${year}-${String(month).padStart(2, '0')}`
  const dates = [...new Set(
    response.data.data
      .filter(g => g.eventDate.startsWith(prefix))
      .map(g => g.eventDate)
  )]
  return dates
}

// 비회원 게더링 신청
export const submitGuestApplication = async (id: string, data: GuestApplicationRequest): Promise<void> => {
  await apiClient.post<ApiResponse<unknown>>(`/api/gatherings/${id}/applications/guest`, data)
}

// 회원 게더링 신청 (JWT 필요)
export const submitUserApplication = async (id: string, data: UserApplicationRequest): Promise<void> => {
  await apiClient.post<ApiResponse<unknown>>(`/api/gatherings/${id}/applications/user`, data)
}
