import { useQuery, type QueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import {
  fetchGatheringsAll, fetchGatheringDetail, fetchGatheringSession,
  filterGatheringsByDate, deriveCalendarDots, buildGatheringTypeCards,
} from '@/lib/api/gathering'
import type { GatheringTypeFilter, GatheringTypeSort } from '@/lib/api/types'

export function useGatheringsAll() {
  return useQuery({
    queryKey: ['gatherings', 'all'],
    queryFn: fetchGatheringsAll,
    staleTime: 1000 * 60 * 5,
  })
}

// 날짜별 목록·달력 dot은 전체 목록 캐시에서 파생 — 날짜 선택·월 이동 시 네트워크 요청 없음 (KAN-327)
export function useGatherings(date: string) {
  return useQuery({
    queryKey: ['gatherings', 'all'],
    queryFn: fetchGatheringsAll,
    staleTime: 1000 * 60 * 5,
    select: (data) => filterGatheringsByDate(data, date),
  })
}

export function useCalendarDots(year: number, month: number) {
  return useQuery({
    queryKey: ['gatherings', 'all'],
    queryFn: fetchGatheringsAll,
    staleTime: 1000 * 60 * 5,
    select: (data) => deriveCalendarDots(data, year, month),
  })
}

// 모아보기 카드 — 전체 목록 캐시에서 종류별 대표 회차를 파생한다. curatedIds: 홈 큐레이션 항목 ID 순서(인기순)
export function useGatheringTypeCards(filter: GatheringTypeFilter, sort: GatheringTypeSort, curatedIds: string[]) {
  return useQuery({
    queryKey: ['gatherings', 'all'],
    queryFn: fetchGatheringsAll,
    staleTime: 1000 * 60 * 5,
    select: (data) => buildGatheringTypeCards(data, { today: dayjs().format('YYYY-MM-DD'), filter, sort, curatedIds }),
  })
}

// 모임 종류 상세 (옛 회차 ID로 요청해도 종류로 응답)
export function useGatheringDetail(id: string) {
  return useQuery({
    queryKey: ['gathering', id],
    queryFn: () => fetchGatheringDetail(id),
    enabled: !!id,
  })
}

// 회차 상세 (종류 정보 + 그 회차 1건)
export function useGatheringSession(sessionId: string) {
  return useQuery({
    queryKey: ['gathering', 'session', sessionId],
    queryFn: () => fetchGatheringSession(sessionId),
    enabled: !!sessionId,
  })
}

// 전체 목록 1회만 프리페치 — 날짜별 목록·달력 dot은 클라이언트에서 파생한다. prefetchQuery는 실패해도 throw하지 않는다.
export async function prefetchGatheringsQueries(queryClient: QueryClient) {
  await queryClient.prefetchQuery({
    queryKey: ['gatherings', 'all'],
    queryFn: fetchGatheringsAll,
  })
}
