import apiClient from './client'
import type { ApiResponse, CalendarDot, GatheringListItem, GatheringDetail } from './types'

// 전체 게더링 목록 조회 — ['gatherings', 'all'] 단일 쿼리로 캐시하고 날짜별 목록·달력 dot은 여기서 파생한다. (KAN-327)
export const fetchGatheringsAll = async (): Promise<GatheringListItem[]> => {
  const response = await apiClient.get<ApiResponse<GatheringListItem[]>>('/api/gatherings')
  return response.data.data
}

// 게더링 상세 조회
export const fetchGatheringDetail = async (id: string): Promise<GatheringDetail> => {
  const response = await apiClient.get<ApiResponse<GatheringDetail>>(`/api/gatherings/${id}`)
  return response.data.data
}

const compareStr = (a = '', b = '') => (a < b ? -1 : a > b ? 1 : 0)

// 날짜별 목록 — BE GET /api/gatherings?date= 와 같은 의미로 파생한다. (KAN-327)
// BE: eventDate(LocalDate) 일치, 상태 필터 없음, startTime ASC → createdAt ASC 정렬
export const filterGatheringsByDate = (gatherings: GatheringListItem[], date: string): GatheringListItem[] =>
  gatherings
    .filter((g) => g.eventDate === date)
    .sort((a, b) => compareStr(a.startTime, b.startTime) || compareStr(a.createdAt, b.createdAt))

// 달력 dot 표시용 날짜+상태 (백엔드 전용 엔드포인트 없음 - 전체 목록에서 파생)
// 같은 날짜에 여러 게더링이 있으면 우선순위(모집중 > 그 외 비취소 > 취소)로 대표 상태를 정한다. (KAN-164)
export const deriveCalendarDots = (gatherings: GatheringListItem[], year: number, month: number): CalendarDot[] => {
  const prefix = `${year}-${String(month).padStart(2, '0')}`

  const statusByDate = new Map<string, GatheringListItem['status']>()
  for (const g of gatherings) {
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
