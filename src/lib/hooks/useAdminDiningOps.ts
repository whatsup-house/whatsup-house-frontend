import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  assignDiningTableVenue,
  createDiningVenue,
  deleteDiningVenue,
  fetchDiningExceptions,
  fetchDiningMatchingRules,
  fetchDiningVenues,
  updateDiningExceptionStatus,
  updateDiningMatchingRules,
  updateDiningVenue,
} from '@/lib/api/adminDiningOps'
import type {
  DiningExceptionStatus,
  DiningExceptionType,
  DiningMatchingRules,
  DiningSafetyAction,
  DiningVenueRequest,
} from '@/lib/api/types'
import { useToastStore } from '@/lib/store/toastStore'
import { getAdminApiErrorMessage } from '@/lib/utils/apiError'

// 우연한 식탁 운영 — 예외함·매칭 규칙·식당 풀 (KAN-353)
const diningKey = ['admin', 'dining'] as const
const exceptionsKey = [...diningKey, 'exceptions'] as const
const matchingRulesKey = [...diningKey, 'matching-rules'] as const
const venuesKey = [...diningKey, 'venues'] as const

// 400/409 등 서버 메시지를 그대로 토스트로 띄운다.
function useErrorToast() {
  const showToast = useToastStore((s) => s.show)
  return (fallback: string) => (error: unknown) => showToast(getAdminApiErrorMessage(error, fallback), 'error')
}

export function useDiningExceptions(type: DiningExceptionType | undefined, status: DiningExceptionStatus) {
  return useQuery({
    queryKey: [...exceptionsKey, type ?? 'ALL', status],
    queryFn: () => fetchDiningExceptions(type, status),
    retry: false,
  })
}

interface ResolveDiningExceptionVariables {
  id: string
  note: string
  action?: DiningSafetyAction
  // VENUE: 식당을 고르면 테이블에 먼저 배정한 뒤 처리 완료한다.
  venueAssignment?: { tableId: string; venueId: string }
}

// 처리 완료(RESOLVED). 배정 PUT은 멱등이라 처리 PATCH만 실패해도 다시 눌러 이어갈 수 있다.
export function useResolveDiningException() {
  const queryClient = useQueryClient()
  const showToast = useToastStore((s) => s.show)
  const onError = useErrorToast()
  return useMutation({
    mutationFn: async ({ id, note, action, venueAssignment }: ResolveDiningExceptionVariables) => {
      if (venueAssignment) await assignDiningTableVenue(venueAssignment.tableId, venueAssignment.venueId)
      return updateDiningExceptionStatus(id, { status: 'RESOLVED', note, action })
    },
    onSuccess: () => showToast('예외를 처리했어요.'),
    onError: onError('예외를 처리하지 못했어요.'),
    // 대시보드 열린 예외 수·회차 콘솔 테이블 식당도 바뀌므로 우연한 식탁 관리자 캐시 전체를 낡게 만든다.
    // 배정만 성공하고 처리 PATCH가 실패한 경우도 있어 성공·실패 모두 무효화한다.
    onSettled: () => queryClient.invalidateQueries({ queryKey: diningKey }),
  })
}

export function useDiningMatchingRules() {
  return useQuery({
    queryKey: matchingRulesKey,
    queryFn: fetchDiningMatchingRules,
    retry: false,
  })
}

export function useUpdateDiningMatchingRules() {
  const queryClient = useQueryClient()
  const showToast = useToastStore((s) => s.show)
  const onError = useErrorToast()
  return useMutation({
    mutationFn: (data: DiningMatchingRules) => updateDiningMatchingRules(data),
    onSuccess: (saved) => {
      queryClient.setQueryData(matchingRulesKey, saved)
      showToast('매칭 규칙을 저장했어요.')
    },
    onError: onError('매칭 규칙을 저장하지 못했어요.'),
  })
}

export function useDiningVenues() {
  return useQuery({
    queryKey: venuesKey,
    queryFn: fetchDiningVenues,
    retry: false,
    staleTime: 1000 * 60,
  })
}

export function useSaveDiningVenue(onSuccess?: () => void) {
  const queryClient = useQueryClient()
  const showToast = useToastStore((s) => s.show)
  const onError = useErrorToast()
  return useMutation({
    // id가 있으면 수정(전체 교체), 없으면 생성
    mutationFn: ({ id, data }: { id?: string; data: DiningVenueRequest }) =>
      id ? updateDiningVenue(id, data) : createDiningVenue(data),
    onSuccess: (_saved, { id }) => {
      queryClient.invalidateQueries({ queryKey: venuesKey })
      showToast(id ? '식당을 수정했어요.' : '식당을 추가했어요.')
      onSuccess?.()
    },
    onError: onError('식당을 저장하지 못했어요.'),
  })
}

export function useDeleteDiningVenue() {
  const queryClient = useQueryClient()
  const showToast = useToastStore((s) => s.show)
  const onError = useErrorToast()
  return useMutation({
    mutationFn: (id: string) => deleteDiningVenue(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: venuesKey })
      showToast('식당을 삭제했어요.')
    },
    onError: onError('식당을 삭제하지 못했어요.'),
  })
}

// 회차 콘솔 테이블별 식당 배정 (KAN-352). 풀에 없는 식당 400, 수용 테이블이 가득 차면 409
export function useAssignDiningTableVenue() {
  const queryClient = useQueryClient()
  const showToast = useToastStore((s) => s.show)
  const onError = useErrorToast()
  return useMutation({
    mutationFn: ({ tableId, venueId }: { tableId: string; venueId: string }) => assignDiningTableVenue(tableId, venueId),
    onSuccess: (res) => showToast(`${res.venue.name}을(를) 배정했어요.`),
    onError: onError('식당을 배정하지 못했어요.'),
    onSettled: () => queryClient.invalidateQueries({ queryKey: diningKey }),
  })
}
