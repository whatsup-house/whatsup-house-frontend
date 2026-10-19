import { useMutation, useQueryClient } from '@tanstack/react-query'
import { submitDemoDeposit } from '@/lib/api/payment'

export function useDemoDeposit() {
  return useMutation({ mutationFn: submitDemoDeposit })
}

// 결제 상태 화면이 폴링하는 쿼리(이용권 + 내 우연한 식탁 신청)를 다시 읽는다.
export function useRefreshPaymentStatus() {
  const queryClient = useQueryClient()
  return () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ['my-tickets'] }),
    queryClient.invalidateQueries({ queryKey: ['dining', 'me', 'applications'] }),
  ])
}
