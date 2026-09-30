import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchMyApplications, fetchApplicationsMe, cancelApplication, checkGuestApplication, fetchApplicationByToken, submitDynamicApplication, submitDynamicGuestApplication, fetchMyApplicationDetail, fetchGuestApplicationDetail, fetchDiningPrefill, fetchMyDiningApplications } from '@/lib/api/application'
import type { ApplicationCreateRequest, ApplicationStatus, DynamicApplicationRequest } from '@/lib/api/types'

// 회원 동적 신청
export function useSubmitDynamicApplication() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: ApplicationCreateRequest) => submitDynamicApplication(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-applications'] })
      queryClient.invalidateQueries({ queryKey: ['applications', 'me'] })
      queryClient.invalidateQueries({ queryKey: ['dining', 'me', 'applications'] })
      queryClient.invalidateQueries({ queryKey: ['my-tickets'] })
    },
  })
}

// 비회원 동적 신청
export function useSubmitDynamicGuestApplication() {
  return useMutation({
    mutationFn: ({ sessionId, data }: { sessionId: string; data: DynamicApplicationRequest }) =>
      submitDynamicGuestApplication(sessionId, data),
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
      queryClient.invalidateQueries({ queryKey: ['dining', 'me', 'applications'] })
    },
  })
}

// 우연한 식탁 신청 폼 프리필 (KAN-342). 미배포 BE에선 실패해도 프리필 없이 진행한다.
export function useDiningPrefill(gatheringId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['dining', 'prefill', gatheringId],
    queryFn: () => fetchDiningPrefill(gatheringId),
    enabled: enabled && !!gatheringId,
    retry: false,
  })
}

// 내 우연한 식탁 신청 목록 + 매칭 상태 (KAN-342)
export function useMyDiningApplications(enabled: boolean) {
  return useQuery({
    queryKey: ['dining', 'me', 'applications'],
    queryFn: fetchMyDiningApplications,
    enabled,
    retry: false,
    staleTime: 1000 * 60,
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
