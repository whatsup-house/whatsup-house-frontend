import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  confirmTicketDeposit,
  createAdminTicketProduct,
  deleteAdminTicketProduct,
  fetchAdminTicketProducts,
  fetchPendingDepositCount,
  fetchPendingDeposits,
  updateAdminTicketProduct,
  type TicketProductPayload,
} from '@/lib/api/adminTicket'

// 입금 대기 큐 (게더링 가로지른 시간순)
export function usePendingDeposits() {
  return useQuery({
    queryKey: ['admin', 'deposits', 'pending'],
    queryFn: fetchPendingDeposits,
    staleTime: 1000 * 15,
  })
}

// 입금 대기 건수 (뱃지)
export function usePendingDepositCount() {
  return useQuery({
    queryKey: ['admin', 'deposits', 'count'],
    queryFn: fetchPendingDepositCount,
    staleTime: 1000 * 15,
  })
}

// 입금 확인 처리. 성공 시 대기 큐/건수를 갱신한다.
export function useConfirmDeposit() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (ticketPassId: string) => confirmTicketDeposit(ticketPassId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'deposits'] })
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      alert(msg || '입금 확인 중 오류가 발생했어요.')
    },
  })
}

export function useAdminTicketProducts() {
  return useQuery({
    queryKey: ['admin', 'ticket-products'],
    queryFn: fetchAdminTicketProducts,
    staleTime: 1000 * 30,
  })
}

export function useCreateTicketProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: TicketProductPayload) => createAdminTicketProduct(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'ticket-products'] })
      queryClient.invalidateQueries({ queryKey: ['ticket-products'] })
    },
  })
}

export function useUpdateTicketProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: TicketProductPayload }) => updateAdminTicketProduct(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'ticket-products'] })
      queryClient.invalidateQueries({ queryKey: ['ticket-products'] })
    },
  })
}

export function useDeleteTicketProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteAdminTicketProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'ticket-products'] })
      queryClient.invalidateQueries({ queryKey: ['ticket-products'] })
    },
  })
}
