import { useQuery, type QueryClient } from '@tanstack/react-query'
import { fetchGatheringsAll, fetchGatheringDetail, filterGatheringsByDate, deriveCalendarDots } from '@/lib/api/gathering'

export function useGatheringsAll() {
  return useQuery({
    queryKey: ['gatherings', 'all'],
    queryFn: fetchGatheringsAll,
    staleTime: 1000 * 60 * 5,
  })
}

export function useGatheringsByTitle(title: string) {
  return useQuery({
    queryKey: ['gatherings', 'all'],
    queryFn: fetchGatheringsAll,
    staleTime: 1000 * 60 * 5,
    select: (data) => data.filter((g) => g.title === title),
    enabled: !!title,
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

export function useGatheringDetail(id: string) {
  return useQuery({
    queryKey: ['gathering', id],
    queryFn: () => fetchGatheringDetail(id),
    enabled: !!id,
  })
}

// 전체 목록 1회만 프리페치 — 날짜별 목록·달력 dot은 클라이언트에서 파생한다. prefetchQuery는 실패해도 throw하지 않는다.
export async function prefetchGatheringsQueries(queryClient: QueryClient) {
  await queryClient.prefetchQuery({
    queryKey: ['gatherings', 'all'],
    queryFn: fetchGatheringsAll,
  })
}
