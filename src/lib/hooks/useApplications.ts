import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchMyApplications, fetchApplicationsMe, cancelApplication, checkGuestApplication } from '@/lib/api/application'
import type { ApplicationStatus } from '@/lib/api/types'

export function useMyApplications(enabled: boolean) {
  return useQuery({
    queryKey: ['my-applications'],
    queryFn: fetchMyApplications,
    enabled,
    staleTime: 1000 * 60,
  })
}

export function useMyApplicationsMe(status: ApplicationStatus | null, enabled: boolean) {
  return useQuery({
    queryKey: ['applications', 'me', status],
    queryFn: () => fetchApplicationsMe(status ?? undefined),
    enabled,
    staleTime: 1000 * 60,
  })
}

export function useCancelApplication() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => cancelApplication(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-applications'] })
      queryClient.invalidateQueries({ queryKey: ['applications', 'me'] })
    },
  })
}

export function useCheckGuestApplication() {
  return useMutation({
    mutationFn: ({ bookingNumber, phone }: { bookingNumber: string; phone: string }) =>
      checkGuestApplication(bookingNumber, phone),
  })
}
