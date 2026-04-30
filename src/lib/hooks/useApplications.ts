import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchMyApplications, cancelApplication } from '@/lib/api/application'

export function useMyApplications(enabled: boolean) {
  return useQuery({
    queryKey: ['my-applications'],
    queryFn: fetchMyApplications,
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
    },
  })
}
