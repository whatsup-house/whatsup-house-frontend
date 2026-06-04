import apiClient from './client'
import type {
  ApiResponse,
  GatheringForm,
  FormQuestionUpsertRequest,
  FormQuestionAdminItem,
} from './types'

// 게더링 신청폼 조회 (질문 동적 목록)
export const fetchGatheringForm = async (gatheringId: string): Promise<GatheringForm> => {
  const response = await apiClient.get<ApiResponse<GatheringForm>>(
    `/api/gatherings/${gatheringId}/form`,
  )
  return response.data.data
}

// ===== 관리자 신청폼 질문 관리 =====

// 질문 추가
export const addFormQuestion = async (
  gatheringId: string,
  data: FormQuestionUpsertRequest,
): Promise<FormQuestionAdminItem> => {
  const response = await apiClient.post<ApiResponse<FormQuestionAdminItem>>(
    `/api/admin/gatherings/${gatheringId}/form/questions`,
    data,
  )
  return response.data.data
}

// 질문 수정
export const updateFormQuestion = async (
  questionId: string,
  data: FormQuestionUpsertRequest,
): Promise<FormQuestionAdminItem> => {
  const response = await apiClient.put<ApiResponse<FormQuestionAdminItem>>(
    `/api/admin/form/questions/${questionId}`,
    data,
  )
  return response.data.data
}

// 질문 삭제 (soft delete)
export const deleteFormQuestion = async (questionId: string): Promise<void> => {
  await apiClient.delete(`/api/admin/form/questions/${questionId}`)
}
