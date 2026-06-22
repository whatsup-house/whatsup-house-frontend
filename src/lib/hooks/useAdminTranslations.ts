import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchAdminTranslations, overrideTranslation } from '@/lib/api/translation'
import type { TranslationOverridePayload } from '@/lib/api/types'

// 관리자 번역 목록 조회 (KAN-268)
export function useAdminTranslations(entityType: string, entityId: string | undefined) {
  return useQuery({
    queryKey: ['admin-translations', entityType, entityId],
    queryFn: () => fetchAdminTranslations(entityType, entityId as string),
    enabled: !!entityId,
  })
}

// 관리자 번역 수동 보정. 성공 시 목록 갱신.
export function useOverrideTranslation(entityType: string, entityId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: TranslationOverridePayload) => overrideTranslation(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-translations', entityType, entityId] })
    },
  })
}
