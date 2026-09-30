import { useQuery, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { fetchMyApplications, fetchApplicationsMe, cancelApplication, checkGuestApplication, fetchApplicationByToken, submitDynamicApplication, submitDynamicGuestApplication, fetchMyApplicationDetail, fetchGuestApplicationDetail, fetchDiningPrefill, fetchMyDiningApplications, cancelDiningApplication, fetchDiningResolution, chooseDiningResolution, fetchDiningTableDetail, submitDiningCheckIn } from '@/lib/api/application'
import type { ApplicationCreateRequest, ApplicationStatus, DiningResolutionChooseRequest, DynamicApplicationRequest } from '@/lib/api/types'
import { useToastStore } from '@/lib/store/toastStore'
import { getApiErrorCode, getApiErrorMessage, getApiErrorStatus } from '@/lib/utils/apiError'

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

// 우연한 식탁 신청 상태가 바뀌는 동작(취소·해결 선택) 뒤 다시 불러올 목록
function invalidateDiningApplications(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: ['dining'] })
  queryClient.invalidateQueries({ queryKey: ['applications', 'me'] })
  queryClient.invalidateQueries({ queryKey: ['my-applications'] })
  queryClient.invalidateQueries({ queryKey: ['my-tickets'] })
}

// 409(이미 처리됨)는 최신 상태로 다시 불러오고, 취소 기한 마감은 안내, 그 외는 서버 메시지를 토스트로 띄운다. (KAN-354)
function useDiningActionErrorToast() {
  const t = useTranslations('mypage.applications.dining.errors')
  const showToast = useToastStore((s) => s.show)
  const queryClient = useQueryClient()
  return (err: unknown) => {
    if (getApiErrorStatus(err) === 409) {
      showToast(t('alreadyProcessed'), 'error')
      invalidateDiningApplications(queryClient)
    } else if (getApiErrorCode(err) === 'CANCEL_WINDOW_CLOSED') {
      showToast(t('cancelWindowClosed'), 'error')
    } else {
      showToast(getApiErrorMessage(err, t('failed')), 'error')
    }
  }
}

// 우연한 식탁 사전 취소 (KAN-342)
export function useCancelDiningApplication() {
  const queryClient = useQueryClient()
  const onError = useDiningActionErrorToast()
  return useMutation({
    mutationFn: (id: string) => cancelDiningApplication(id),
    onSuccess: () => invalidateDiningApplications(queryClient),
    onError,
  })
}

// 매칭 실패 해결 선택지 (KAN-347). 미배포 BE에선 실패로 두고 카드가 안내를 띄운다.
export function useDiningResolution(id: string | null | undefined) {
  return useQuery({
    queryKey: ['dining', 'resolution', id],
    queryFn: () => fetchDiningResolution(id!),
    enabled: !!id,
    retry: false,
  })
}

export function useChooseDiningResolution() {
  const queryClient = useQueryClient()
  const onError = useDiningActionErrorToast()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: DiningResolutionChooseRequest }) => chooseDiningResolution(id, data),
    onSuccess: () => invalidateDiningApplications(queryClient),
    onError,
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

// 우연한 식탁 테이블 상세 (KAN-355). 403(멤버 아님)·404 는 화면에서 분기한다.
export function useDiningTableDetail(id: string, enabled: boolean) {
  return useQuery({
    queryKey: ['dining', 'table', id],
    queryFn: () => fetchDiningTableDetail(id),
    enabled: enabled && !!id,
  })
}

// 체크인 (KAN-355). 응답 모양에 기대지 않고 상세를 다시 불러와 참석 상태를 맞춘다 — 끝날 때까지 pending 유지.
export function useDiningCheckIn(tableId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => submitDiningCheckIn(tableId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dining', 'me', 'applications'] })
      return queryClient.invalidateQueries({ queryKey: ['dining', 'table', tableId] })
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
