import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchMyApplications, fetchApplicationsMe, cancelApplication, checkGuestApplication, fetchApplicationByToken, submitDynamicApplication, submitDynamicGuestApplication, fetchMyApplicationDetail, fetchGuestApplicationDetail } from '@/lib/api/application'
import type { ApplicationStatus, DynamicApplicationRequest } from '@/lib/api/types'

// 회원 동적 신청
export function useSubmitDynamicApplication() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ gatheringId, data }: { gatheringId: string; data: DynamicApplicationRequest }) =>
      submitDynamicApplication(gatheringId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-applications'] })
      queryClient.invalidateQueries({ queryKey: ['applications', 'me'] })
    },
  })
}

// 비회원 동적 신청
export function useSubmitDynamicGuestApplication() {
  return useMutation({
    mutationFn: ({ gatheringId, data }: { gatheringId: string; data: DynamicApplicationRequest }) =>
      submitDynamicGuestApplication(gatheringId, data),
  })
}

// 내 신청 상세 (답변 포함) — 회원
export function useMyApplicationDetail(id: string) {
  return useQuery({
    queryKey: ['application', id],
    queryFn: () => fetchMyApplicationDetail(id),
    enabled: !!id,
  })
}

// 비회원 신청 상세 (답변 포함)
export function useGuestApplicationDetail() {
  return useMutation({
    mutationFn: ({ phone, bookingNumber }: { phone: string; bookingNumber: string }) =>
      fetchGuestApplicationDetail(phone, bookingNumber),
  })
}

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

export function useApplicationByToken(token: string) {
  return useQuery({
    queryKey: ['application', 'token', token],
    queryFn: () => fetchApplicationByToken(token),
    enabled: !!token,
    retry: false,
  })
}
