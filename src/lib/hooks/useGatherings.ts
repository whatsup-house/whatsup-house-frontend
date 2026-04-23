import { useQuery, useMutation } from '@tanstack/react-query'
import { fetchGatherings, fetchCalendarDots, fetchGatheringDetail, submitGuestApplication, submitUserApplication } from '@/lib/api/gathering'
import type { GuestApplicationRequest, UserApplicationRequest } from '@/lib/api/types'

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
