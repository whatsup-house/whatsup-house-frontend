import { useQuery, type QueryClient } from '@tanstack/react-query'
import { useLocale } from 'next-intl'
import { fetchGatherings, fetchGatheringsAll, fetchCalendarDots, fetchGatheringDetail } from '@/lib/api/gathering'

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

export function useGatherings(date: string) {
  return useQuery({
    queryKey: ['gatherings', 'date', date],
    queryFn: () => fetchGatherings(date),
    staleTime: 1000 * 60,
  })
}

export function useCalendarDots(year: number, month: number) {
  return useQuery({
    queryKey: ['gatherings', 'calendar', year, month],
    queryFn: () => fetchCalendarDots(year, month),
    staleTime: 1000 * 60 * 5,
  })
}

export function useGatheringDetail(id: string) {
  // 현재 로케일을 Accept-Language로 전달하고 queryKey에도 포함해, 언어 변경 시 번역본으로 재조회한다. (KAN-268)
  const locale = useLocale()
  return useQuery({
    queryKey: ['gathering', id, locale],
    queryFn: () => fetchGatheringDetail(id, locale),
    enabled: !!id,
  })
}

export async function prefetchGatheringsQueries(queryClient: QueryClient, date: string, year: number, month: number) {
  await Promise.allSettled([
    queryClient.prefetchQuery({
      queryKey: ['gatherings', 'date', date],
      queryFn: () => fetchGatherings(date),
    }),
    queryClient.prefetchQuery({
      queryKey: ['gatherings', 'calendar', year, month],
      queryFn: () => fetchCalendarDots(year, month),
    }),
  ])
}
