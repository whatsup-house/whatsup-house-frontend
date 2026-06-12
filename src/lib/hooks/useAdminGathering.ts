import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminGatheringApi, GatheringCreateRequest, ApplicationStatus } from '@/lib/api/adminGathering'
import type { AdminGatheringStatus } from '@/lib/api/admin'

export function useDeleteApplication(gatheringId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => adminGatheringApi.deleteApplication(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'applications', gatheringId] })
    },
    onError: (err: unknown) => {
      const axiosErr = err as { response?: { status?: number; data?: { code?: string } } }
      const status = axiosErr?.response?.status
      const code = axiosErr?.response?.data?.code
      if (status === 400 && code === 'CANNOT_DELETE') {
        alert('이 신청은 반려할 수 없습니다.')
      } else if (status === 404) {
        alert('이미 삭제된 신청입니다.')
      } else {
        alert('삭제 중 오류가 발생했어요.')
      }
    },
  })
}

export function useAdminApplications(gatheringId: string) {
  return useQuery({
    queryKey: ['admin', 'applications', gatheringId],
    queryFn: () => adminGatheringApi.getApplicationsByGathering(gatheringId),
    enabled: !!gatheringId,
    staleTime: 1000 * 30,
  })
}

export function useAdminLocations() {
  return useQuery({
    queryKey: ['admin', 'locations'],
    queryFn: adminGatheringApi.getLocations,
    staleTime: 1000 * 60 * 5,
  })
}

// 수정 패널 prefill용 게더링 상세 조회 (KAN-220)
export function useAdminGatheringDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['admin', 'gathering', id],
    queryFn: () => adminGatheringApi.getById(id as string),
    enabled: !!id,
    staleTime: 1000 * 30,
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

export function useUpdateGatheringStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: AdminGatheringStatus }) =>
      adminGatheringApi.updateStatus(id, status),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'gatherings'] })
      queryClient.invalidateQueries({ queryKey: ['gathering', variables.id] })
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      alert(msg || '상태 변경 중 오류가 발생했어요.')
    },
  })
}

export function useUpdateApplicationStatus(gatheringId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ApplicationStatus }) =>
      adminGatheringApi.updateApplicationStatus(id, status),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['admin', 'applications', gatheringId] }),
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      alert(msg || '상태 변경 중 오류가 발생했어요.')
    },
  })
}

// 입금 확인 토글 (KAN-243)
export function useUpdatePaymentStatus(gatheringId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, confirmed }: { id: string; confirmed: boolean }) =>
      adminGatheringApi.updatePaymentStatus(id, confirmed),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['admin', 'applications', gatheringId] }),
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      alert(msg || '입금 상태 변경 중 오류가 발생했어요.')
    },
  })
}

// 홈 큐레이션 노출 토글 (KAN-190)
export function useSetCuration() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, isCurated }: { id: string; isCurated: boolean }) =>
      adminGatheringApi.setCuration(id, isCurated),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'gatherings'] })
      queryClient.invalidateQueries({ queryKey: ['home', 'curated'] })
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      alert(msg || '큐레이션 변경 중 오류가 발생했어요.')
    },
  })
}
