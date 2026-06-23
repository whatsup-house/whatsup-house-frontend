import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchGuestTickets, fetchMyTickets, purchaseGuestTicketPass, purchaseTicketPass } from '@/lib/api/ticket'
import { useAuthStore } from '@/lib/store/authStore'
import type { GuestTicketPurchaseRequest, TicketPurchaseRequest } from '@/lib/api/types'

// 내 이용권/잔여 조회. 로그인 상태에서만 실행하며, 미배포 BE에선 실패해도 graceful하게 처리한다.
export function useMyTickets(applicationId?: string | null) {
  const { isLoggedIn } = useAuthStore()
  return useQuery({
    queryKey: ['my-tickets', applicationId ?? null],
    queryFn: () => fetchMyTickets(applicationId),
    enabled: isLoggedIn,
    retry: false,
    staleTime: 1000 * 30,
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
