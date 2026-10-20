import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchDepositNotifications,
  fetchPayouts,
  fetchPendingTargets,
  linkDepositNotification,
  markPayoutsSent,
} from '@/lib/api/adminPayment'
import type {
  DepositMatchResult,
  DepositNotificationLinkRequest,
  PayoutStatus,
  PayoutType,
} from '@/lib/api/types'
import { useToastStore } from '@/lib/store/toastStore'
import { getAdminApiErrorMessage, getApiErrorCode } from '@/lib/utils/apiError'

// 운영자 입금 알림 로그·송금 목록 (KAN-411)
const paymentKey = ['admin', 'payments'] as const
export const DEPOSIT_AMOUNT_MISMATCH = 'DEPOSIT_AMOUNT_MISMATCH'

// 새 입금이 들어오는지 지켜보는 화면이라 10초마다 갱신한다.
export function useDepositNotifications(result: DepositMatchResult | undefined, page: number) {
  return useQuery({
    queryKey: [...paymentKey, 'deposit-notifications', result ?? 'ALL', page],
    queryFn: () => fetchDepositNotifications(result, page),
    refetchInterval: 10_000,
    retry: false,
  })
}

// 수동 연결 후보 — 연결 폼이 열릴 때만 조회한다
export function usePendingTargets() {
  return useQuery({
    queryKey: [...paymentKey, 'pending-targets'],
    queryFn: fetchPendingTargets,
    retry: false,
  })
}

// 연결하면 예외도 RESOLVED가 되므로 예외함 캐시(['admin','dining'])도 낡게 만든다.
export function useLinkDepositNotification() {
  const queryClient = useQueryClient()
  const showToast = useToastStore((s) => s.show)
  return useMutation({
    mutationFn: ({ id, ...data }: DepositNotificationLinkRequest & { id: string }) => linkDepositNotification(id, data),
    onSuccess: () => showToast('신청에 연결했어요.'),
    // 금액 불일치 409는 화면이 확인 후 force 로 재전송하므로 토스트를 띄우지 않는다.
    onError: (error) => {
      if (getApiErrorCode(error) === DEPOSIT_AMOUNT_MISMATCH) return
      showToast(getAdminApiErrorMessage(error, '신청에 연결하지 못했어요.'), 'error')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: paymentKey })
      queryClient.invalidateQueries({ queryKey: ['admin', 'dining'] })
    },
  })
}

export function usePayouts(type: PayoutType, status: PayoutStatus) {
  return useQuery({
    queryKey: [...paymentKey, 'payouts', type, status],
    queryFn: () => fetchPayouts(type, status),
    retry: false,
  })
}

export function useMarkPayoutsSent() {
  const queryClient = useQueryClient()
  const showToast = useToastStore((s) => s.show)
  return useMutation({
    mutationFn: (ids: string[]) => markPayoutsSent(ids),
    onSuccess: () => showToast('송금 완료로 처리했어요.'),
    onError: (error) => showToast(getAdminApiErrorMessage(error, '송금 완료 처리에 실패했어요.'), 'error'),
    onSettled: () => queryClient.invalidateQueries({ queryKey: [...paymentKey, 'payouts'] }),
  })
}
