import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { fetchGuestTickets, fetchMyTickets, fetchTicketProducts, purchaseGuestTicketPass, purchaseTicketPass, refundMembership } from '@/lib/api/ticket'
import { useAuthStore } from '@/lib/store/authStore'
import { useToastStore } from '@/lib/store/toastStore'
import { getApiErrorCode, getApiErrorMessage } from '@/lib/utils/apiError'
import type { GuestTicketPurchaseRequest, MembershipRefundRequest, TicketPurchaseRequest } from '@/lib/api/types'

export function useTicketProducts() {
  return useQuery({
    queryKey: ['ticket-products'],
    queryFn: fetchTicketProducts,
    staleTime: 1000 * 60,
  })
}

// 내 이용권/잔여 조회. 로그인 상태에서만 실행하며, 미배포 BE에선 실패해도 graceful하게 처리한다.
export function useMyTickets(applicationId?: string | null) {
  const { isLoggedIn } = useAuthStore()
  return useQuery({
    queryKey: ['my-tickets', applicationId ?? null],
    queryFn: () => fetchMyTickets(applicationId),
    enabled: isLoggedIn,
    retry: false,
    staleTime: 1000 * 30,
    // 입금 대기 중이면 자동 대사로 확정되는 걸 화면이 따라가게 10초마다 다시 읽는다. (KAN-408)
    refetchInterval: (query) => (query.state.data?.passes.some((pass) => pass.status === 'PENDING') ? 10_000 : false),
  })
}

// 이용권 구매(선결제) 요청. 성공 시 잔여 캐시를 무효화한다.
export function usePurchaseTicketPass() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: TicketPurchaseRequest) => purchaseTicketPass(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-tickets'] })
    },
  })
}

// 멤버십 환불 요청 — 첫 참석 전까지만. 성공하면 송금 대기 안내를 띄우고 이용권·신청 목록을 다시 읽는다. (KAN-410)
export function useRefundMembership() {
  const t = useTranslations('payment.membershipRefund')
  const showToast = useToastStore((s) => s.show)
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ passId, data }: { passId: string; data: MembershipRefundRequest }) => refundMembership(passId, data),
    onSuccess: () => {
      showToast(t('done'))
      queryClient.invalidateQueries({ queryKey: ['my-tickets'] })
      queryClient.invalidateQueries({ queryKey: ['dining'] })
      queryClient.invalidateQueries({ queryKey: ['my-applications'] })
      queryClient.invalidateQueries({ queryKey: ['applications', 'me'] })
    },
    onError: (err) => {
      const code = getApiErrorCode(err)
      const known = ['MEMBERSHIP_REFUND_AFTER_ATTENDANCE', 'MEMBERSHIP_REFUND_ACTIVE_TABLE', 'REFUND_ACCOUNT_REQUIRED']
      showToast(code && known.includes(code) ? t(`errors.${code}`) : getApiErrorMessage(err, t('errors.failed')), 'error')
    },
  })
}

export function useGuestTickets(bookingNumber: string | null) {
  return useQuery({
    queryKey: ['guest-tickets', bookingNumber],
    queryFn: () => fetchGuestTickets(bookingNumber!),
    enabled: Boolean(bookingNumber),
    retry: false,
    staleTime: 1000 * 30,
  })
}

export function usePurchaseGuestTicketPass() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: GuestTicketPurchaseRequest) => purchaseGuestTicketPass(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['guest-tickets', variables.bookingNumber] })
    },
  })
}
