import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchGatheringForm,
  addFormQuestion,
  updateFormQuestion,
  deleteFormQuestion,
} from '@/lib/api/form'
import type { FormQuestionUpsertRequest } from '@/lib/api/types'

// 게더링 신청폼 조회 (질문 동적 목록)
export function useGatheringForm(gatheringId: string) {
  return useQuery({
    queryKey: ['gathering', gatheringId, 'form'],
    queryFn: () => fetchGatheringForm(gatheringId),
    enabled: !!gatheringId,
    staleTime: 1000 * 60,
  })
}

// 관리자 질문 추가
export function useAddFormQuestion(gatheringId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: FormQuestionUpsertRequest) => addFormQuestion(gatheringId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gathering', gatheringId, 'form'] })
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      alert(msg || '질문 추가 중 오류가 발생했어요.')
    },
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
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      alert(msg || '질문 수정 중 오류가 발생했어요.')
    },
  })
}

// 관리자 질문 삭제
export function useDeleteFormQuestion(gatheringId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (questionId: string) => deleteFormQuestion(questionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gathering', gatheringId, 'form'] })
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      alert(msg || '질문 삭제 중 오류가 발생했어요.')
    },
  })
}
