import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchDiningDashboard, fetchDiningVenues, updateSessionVenues } from '@/lib/api/adminDining'
import type { SessionVenueRequest } from '@/lib/api/types'
import { useToastStore } from '@/lib/store/toastStore'
import { getAdminApiErrorMessage } from '@/lib/utils/apiError'

// 운영 대시보드. 신청·테이블 수치가 계속 바뀌어 staleTime을 두지 않는다. (KAN-351)
export function useDiningDashboard() {
  return useQuery({
    queryKey: ['admin', 'dining', 'dashboard'],
    queryFn: fetchDiningDashboard,
  })
}

export function useDiningVenues(enabled = true) {
  return useQuery({
    queryKey: ['admin', 'dining', 'venues'],
    queryFn: fetchDiningVenues,
    staleTime: 1000 * 60 * 5,
    enabled,
  })
}

// 여러 회차(주간 반복으로 만든 회차들)에 같은 식당 풀을 설정한다.
export function useUpdateSessionVenues() {
  const queryClient = useQueryClient()
  const showToast = useToastStore((s) => s.show)
  return useMutation({
    mutationFn: ({ sessionIds, venues }: { sessionIds: string[]; venues: SessionVenueRequest[] }) =>
      Promise.all(sessionIds.map((id) => updateSessionVenues(id, venues))),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'dining'] }),
    onError: (err: unknown) => showToast(getAdminApiErrorMessage(err, '식당 풀을 저장하지 못했어요.'), 'error'),
  })
}
