import apiClient from './client'
import type { ApiResponse, AdminContentTranslation, TranslationOverridePayload } from './types'

// 관리자: 엔티티의 번역 목록(필드·로케일별 상태) 조회 (KAN-268 / BE KAN-274)
export const fetchAdminTranslations = async (
  entityType: string,
  entityId: string
): Promise<AdminContentTranslation[]> => {
  const response = await apiClient.get<ApiResponse<AdminContentTranslation[]>>('/api/admin/translations', {
    params: { entityType, entityId },
  })
  return response.data.data
}

// 관리자: 번역 수동 보정(override). 저장 시 자동 재번역이 덮어쓰지 않는다.
export const overrideTranslation = async (
  payload: TranslationOverridePayload
): Promise<AdminContentTranslation> => {
  const response = await apiClient.put<ApiResponse<AdminContentTranslation>>('/api/admin/translations', payload)
  return response.data.data
}
