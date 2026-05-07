import { useQuery } from '@tanstack/react-query'
import { fetchAdminGatherings, fetchAdminDashboardGatherings } from '@/lib/api/admin'

export function useAdminGatherings() {
  return useQuery({
    queryKey: ['admin', 'gatherings'],
    queryFn: fetchAdminGatherings,
    refetchInterval: 1000 * 30,
  })
}

export function useAdminDashboardGatherings(from?: string, to?: string) {
  return useQuery({
    queryKey: ['admin', 'dashboard', 'gatherings', from ?? '', to ?? ''],
    queryFn: () => fetchAdminDashboardGatherings(from, to),
    refetchInterval: 1000 * 30,
  })
}
