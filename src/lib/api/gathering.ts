import apiClient from './client'
import type { ApiResponse, CalendarDot, GatheringListItem, GatheringDetail } from './types'

// 날짜별 게더링 목록 조회
export const fetchGatherings = async (date: string): Promise<GatheringListItem[]> => {
  const response = await apiClient.get<ApiResponse<GatheringListItem[]>>('/api/gatherings', { params: { date } })
  return response.data.data
}

// 전체 게더링 목록 조회 (필터 드롭다운용)
export const fetchGatheringsAll = async (): Promise<GatheringListItem[]> => {
  const response = await apiClient.get<ApiResponse<GatheringListItem[]>>('/api/gatherings')
  return response.data.data
}

// 게더링 상세 조회
export const fetchGatheringDetail = async (id: string): Promise<GatheringDetail> => {
  const response = await apiClient.get<ApiResponse<GatheringDetail>>(`/api/gatherings/${id}`)
  return response.data.data
}

// 달력 dot 표시용 날짜+상태 조회 (백엔드 전용 엔드포인트 없음 - 전체 목록에서 파생)
// 같은 날짜에 여러 게더링이 있으면 우선순위(모집중 > 그 외 비취소 > 취소)로 대표 상태를 정한다. (KAN-164)
export const fetchCalendarDots = async (year: number, month: number): Promise<CalendarDot[]> => {
  const response = await apiClient.get<ApiResponse<GatheringListItem[]>>('/api/gatherings')
  const prefix = `${year}-${String(month).padStart(2, '0')}`

  const statusByDate = new Map<string, GatheringListItem['status']>()
  for (const g of response.data.data) {
    if (!g.eventDate.startsWith(prefix)) continue
    const prev = statusByDate.get(g.eventDate)
    if (prev === undefined) {
      statusByDate.set(g.eventDate, g.status)
    } else if (g.status === 'OPEN') {
      statusByDate.set(g.eventDate, 'OPEN')                  // 모집중 최우선
    } else if (prev === 'CANCELLED' && g.status !== 'CANCELLED') {
      statusByDate.set(g.eventDate, g.status)                // 비취소가 취소보다 우선
    }
  }

  return [...statusByDate.entries()].map(([date, status]) => ({ date, status }))
}
