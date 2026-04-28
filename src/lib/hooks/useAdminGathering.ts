import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminGatheringApi, GatheringCreateRequest } from '@/lib/api/adminGathering'

export function useAdminLocations() {
  return useQuery({
    queryKey: ['admin', 'locations'],
    queryFn: adminGatheringApi.getLocations,
    staleTime: 1000 * 60 * 5,
  })
}

export function useCreateGathering(onSuccess?: () => void) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: GatheringCreateRequest) => adminGatheringApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'gatherings'] })
      onSuccess?.()
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      alert(msg || '저장 중 오류가 발생했어요.')
    },
  })
}

export function useUpdateGathering(onSuccess?: () => void) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: GatheringCreateRequest }) =>
      adminGatheringApi.update(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'gatherings'] })
      queryClient.invalidateQueries({ queryKey: ['gathering', variables.id] })
      onSuccess?.()
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      alert(msg || '저장 중 오류가 발생했어요.')
    },
  })
}
