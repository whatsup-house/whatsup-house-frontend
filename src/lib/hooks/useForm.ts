import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchGatheringForm,
  fetchAdminFormQuestions,
  addFormQuestion,
  updateFormQuestion,
  deleteFormQuestion,
} from '@/lib/api/form'
import type { FormQuestionUpsertRequest } from '@/lib/api/types'
import { useToastStore } from '@/lib/store/toastStore'
import { getApiErrorCode, getApiErrorMessage } from '@/lib/utils/apiError'

// 표준 항목 잠금(400 RESERVED_QUESTION_LOCKED)은 토스트로, 그 외 오류는 기존처럼 alert로 알린다. (KAN-343)
const onQuestionError = (fallback: string) => (err: unknown) => {
  if (getApiErrorCode(err) === 'RESERVED_QUESTION_LOCKED') {
    useToastStore.getState().show(
      getApiErrorMessage(err, '우연한 식탁 표준 항목은 삭제하거나 유형을 바꿀 수 없어요.'),
      'error',
    )
    return
  }
  alert(getApiErrorMessage(err, fallback))
}

// 게더링 신청폼 조회 (질문 동적 목록)
export function useGatheringForm(gatheringId: string) {
  return useQuery({
    queryKey: ['gathering', gatheringId, 'form'],
    queryFn: () => fetchGatheringForm(gatheringId),
    enabled: !!gatheringId,
    staleTime: 1000 * 60,
  })
}

// 관리자용 질문 목록 (매칭 설정 포함)
export function useAdminFormQuestions(gatheringId: string) {
  return useQuery({
    queryKey: ['admin', 'form-questions', gatheringId],
    queryFn: () => fetchAdminFormQuestions(gatheringId),
    enabled: !!gatheringId,
  })
}

// 관리자 질문 추가
export function useAddFormQuestion(gatheringId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: FormQuestionUpsertRequest) => addFormQuestion(gatheringId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gathering', gatheringId, 'form'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'form-questions', gatheringId] })
    },
    onError: onQuestionError('질문 추가 중 오류가 발생했어요.'),
  })
}

// 관리자 질문 수정
export function useUpdateFormQuestion(gatheringId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ questionId, data }: { questionId: string; data: FormQuestionUpsertRequest }) =>
      updateFormQuestion(questionId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gathering', gatheringId, 'form'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'form-questions', gatheringId] })
    },
    onError: onQuestionError('질문 수정 중 오류가 발생했어요.'),
  })
}

// 관리자 질문 삭제
export function useDeleteFormQuestion(gatheringId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (questionId: string) => deleteFormQuestion(questionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gathering', gatheringId, 'form'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'form-questions', gatheringId] })
    },
    onError: onQuestionError('질문 삭제 중 오류가 발생했어요.'),
  })
}
