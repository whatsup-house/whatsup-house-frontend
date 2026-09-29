import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { adminGatheringApi, groupAdminGatheringTypes, ApplicationStatus } from '@/lib/api/adminGathering'
import type { AdminGatheringStatus } from '@/lib/api/admin'
import type {
  AdminGatheringTypeRequest,
  AdminSessionCreateRequest,
  AdminSessionRequest,
  GatheringDetail,
} from '@/lib/api/types'
import { useToastStore } from '@/lib/store/toastStore'
import { getApiErrorMessage, getApiErrorStatus } from '@/lib/utils/apiError'

// 종류·회차 변경은 관리자 목록·상세와 공개 목록·상세 캐시를 모두 낡게 만든다. (KAN-340)
function invalidateGatheringQueries(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: ['admin', 'gatherings'] })
  queryClient.invalidateQueries({ queryKey: ['admin', 'gathering'] })
  queryClient.invalidateQueries({ queryKey: ['gatherings'] })
  queryClient.invalidateQueries({ queryKey: ['gathering'] })
}

// 삭제 409(신청이 있는 회차)는 취소로 유도하는 안내 토스트를 띄운다. (KAN-340)
function useDeleteErrorToast() {
  const showToast = useToastStore((s) => s.show)
  return (err: unknown) => {
    if (getApiErrorStatus(err) === 409) {
      showToast('신청이 있는 회차는 삭제할 수 없어요. 회차를 취소해 주세요.', 'error')
    } else {
      showToast(getApiErrorMessage(err, '삭제 중 오류가 발생했어요.'), 'error')
    }
  }
}

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

// 관리자 모임 목록 — 회차 단위 목록을 종류 단위로 묶는다. (KAN-340)
export function useAdminGatheringTypes() {
  return useQuery({
    queryKey: ['admin', 'gatherings', 'types'],
    queryFn: () => adminGatheringApi.getAll(),
    select: (items) => groupAdminGatheringTypes(items, dayjs().format('YYYY-MM-DD')),
  })
}

// 모임 종류 상세 + 전체 회차 (수정 패널 prefill, 종류 상세 화면) (KAN-220, KAN-340)
export function useAdminGatheringDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['admin', 'gathering', id],
    queryFn: () => adminGatheringApi.getById(id as string),
    enabled: !!id,
    staleTime: 1000 * 30,
  })
}

export function useCreateGathering(onSuccess?: (created: GatheringDetail) => void) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: AdminGatheringTypeRequest) => adminGatheringApi.create(data),
    onSuccess: (created) => {
      invalidateGatheringQueries(queryClient)
      onSuccess?.(created)
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      alert(msg || '저장 중 오류가 발생했어요.')
    },
  })
}

export function useUpdateGathering(onSuccess?: (updated: GatheringDetail) => void) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: AdminGatheringTypeRequest }) =>
      adminGatheringApi.update(id, data),
    onSuccess: (updated) => {
      invalidateGatheringQueries(queryClient)
      onSuccess?.(updated)
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      alert(msg || '저장 중 오류가 발생했어요.')
    },
  })
}

// 모임 종류 삭제(회차 포함). 신청이 있는 회차가 있으면 409 → 토스트 (KAN-340)
export function useDeleteGathering(onSuccess?: () => void) {
  const queryClient = useQueryClient()
  const onError = useDeleteErrorToast()
  return useMutation({
    mutationFn: (id: string) => adminGatheringApi.delete(id),
    onSuccess: () => {
      invalidateGatheringQueries(queryClient)
      onSuccess?.()
    },
    onError,
  })
}

// 회차 추가 — 단건 또는 주간 반복 (KAN-340)
export function useCreateSessions(gatheringId: string, onSuccess?: () => void) {
  const queryClient = useQueryClient()
  const showToast = useToastStore((s) => s.show)
  return useMutation({
    mutationFn: (data: AdminSessionCreateRequest) => adminGatheringApi.createSessions(gatheringId, data),
    onSuccess: (created) => {
      invalidateGatheringQueries(queryClient)
      showToast(`회차 ${created.length}개를 추가했어요.`)
      onSuccess?.()
    },
    onError: (err: unknown) => showToast(getApiErrorMessage(err, '회차 추가 중 오류가 발생했어요.'), 'error'),
  })
}

export function useUpdateSession(onSuccess?: () => void) {
  const queryClient = useQueryClient()
  const showToast = useToastStore((s) => s.show)
  return useMutation({
    mutationFn: ({ sessionId, data }: { sessionId: string; data: AdminSessionRequest }) =>
      adminGatheringApi.updateSession(sessionId, data),
    onSuccess: () => {
      invalidateGatheringQueries(queryClient)
      onSuccess?.()
    },
    onError: (err: unknown) => showToast(getApiErrorMessage(err, '회차 수정 중 오류가 발생했어요.'), 'error'),
  })
}

// 신청이 있는 회차면 409 → 토스트 (KAN-340)
export function useDeleteSession() {
  const queryClient = useQueryClient()
  const onError = useDeleteErrorToast()
  return useMutation({
    mutationFn: (sessionId: string) => adminGatheringApi.deleteSession(sessionId),
    onSuccess: () => invalidateGatheringQueries(queryClient),
    onError,
  })
}

// 회차 상태 변경. id는 회차 ID (KAN-338)
export function useUpdateGatheringStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: AdminGatheringStatus }) =>
      adminGatheringApi.updateStatus(id, status),
    onSuccess: () => invalidateGatheringQueries(queryClient),
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
