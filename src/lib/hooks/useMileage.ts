import { useQuery } from '@tanstack/react-query'
import { fetchMyMileageBalance, fetchMyMileageHistory } from '@/lib/api/mileage'

export function useMyMileageBalance(enabled: boolean) {
  return useQuery({
    queryKey: ['mileage', 'me'],
    queryFn: fetchMyMileageBalance,
    enabled,
    staleTime: 1000 * 60 * 5,
  })
}

export function useMyMileageHistory(page: number, size: number, enabled: boolean) {
  return useQuery({
    queryKey: ['mileage', 'history', page, size],
    queryFn: () => fetchMyMileageHistory(page, size),
    enabled,
    staleTime: 1000 * 30,
  })
}
