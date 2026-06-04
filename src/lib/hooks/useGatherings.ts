import { useQuery, useMutation, type QueryClient } from '@tanstack/react-query'
import { fetchGatherings, fetchGatheringsAll, fetchCalendarDots, fetchGatheringDetail, submitGuestApplication, submitUserApplication } from '@/lib/api/gathering'
import type { GuestApplicationRequest, UserApplicationRequest } from '@/lib/api/types'

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
  return useQuery({
    queryKey: ['gathering', id],
    queryFn: () => fetchGatheringDetail(id),
    enabled: !!id,
  })
}

export function useSubmitGuestApplication() {
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: GuestApplicationRequest }) =>
      submitGuestApplication(id, data),
  })
}

export function useSubmitUserApplication() {
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UserApplicationRequest }) =>
      submitUserApplication(id, data),
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
