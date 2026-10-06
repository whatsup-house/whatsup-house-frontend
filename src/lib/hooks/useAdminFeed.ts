import { useMutation, useQuery, useQueryClient, keepPreviousData, type QueryClient } from '@tanstack/react-query'
import type { AdminFeedFilters, AdminFeedPostRequest } from '@/lib/api/types'
import {
  fetchAdminFeedPosts,
  createAdminFeedPost,
  updateAdminFeedPost,
  updateAdminFeedVisibility,
  deleteAdminFeedPost,
} from '@/lib/api/adminFeed'

// 어드민 피드 관리 (KAN-383). 변경 후 어드민 목록과 공개 피드를 함께 갱신한다.
const invalidateFeed = (qc: QueryClient) =>
  Promise.all([
    qc.invalidateQueries({ queryKey: ['admin-feed'] }),
    qc.invalidateQueries({ queryKey: ['feed'] }),
  ])

const alertError = (fallback: string) => (err: unknown) => {
  const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
  alert(msg || fallback)
}

export function useAdminFeedPosts(filters: AdminFeedFilters) {
  return useQuery({
    queryKey: ['admin-feed', filters],
    queryFn: () => fetchAdminFeedPosts(filters),
    placeholderData: keepPreviousData,
  })
}

export function useSaveAdminFeedPost(onSuccess: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string | null; data: AdminFeedPostRequest }) =>
      id ? updateAdminFeedPost(id, data) : createAdminFeedPost(data),
    onSuccess: () => {
      invalidateFeed(qc)
      onSuccess()
    },
    onError: alertError('저장 중 오류가 발생했어요.'),
  })
}

export function useSetAdminFeedVisibility() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, visible }: { id: string; visible: boolean }) => updateAdminFeedVisibility(id, visible),
    // 재조회가 끝날 때까지 pending 으로 두어 토글이 깜빡이지 않게 한다.
    onSettled: () => invalidateFeed(qc),
    onError: alertError('노출 여부를 바꾸지 못했어요.'),
  })
}

export function useDeleteAdminFeedPost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteAdminFeedPost(id),
    onSuccess: () => invalidateFeed(qc),
    onError: alertError('삭제하지 못했어요.'),
  })
}
