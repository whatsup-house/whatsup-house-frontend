import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchAdminHomeReviews,
  createHomeReview,
  updateHomeReview,
  deleteHomeReview,
  toggleHomeReview,
} from '@/lib/api/adminHomeReview'
import type { AdminHomeReview, AdminHomeReviewRequest } from '@/lib/api/types'

const MOCK_REVIEWS: AdminHomeReview[] = [
  { id: 'r1', authorName: '재즈러버', avatarUrl: '/home/home-1.png', gatheringTitle: '느린 오후의 재즈 감상 모임', content: '오랜만에 깊은 대화를 나눴어요. 사장님이 추천해주신 LP가 진짜 좋았고 같이 간 분들도 다들 편안한 분위기였어요.', rating: 5, displayOrder: 1, isActive: true },
  { id: 'r2', authorName: '민트초코', avatarUrl: null, gatheringTitle: '느린 오후의 재즈 감상 모임', content: '생각보다 분위기가 너무 편해서 놀랐습니다. 처음 봤는데 다들 친절하셨어요.', rating: 4, displayOrder: 2, isActive: true },
  { id: 'r3', authorName: '밤산책', avatarUrl: '/home/home-2.png', gatheringTitle: '느린 오후의 재즈 감상 모임', content: '퇴근하고 가볍게 다녀오기 딱 좋았어요. 음악도 좋고 공간도 아늑했어요.', rating: 5, displayOrder: 3, isActive: true },
  { id: 'r4', authorName: '노을빛', avatarUrl: null, gatheringTitle: '드로잉 살롱', content: '드로잉 살롱 분위기 진짜 따뜻했어요. 혼자 갔는데 전혀 어색하지 않았고 좋은 분들과 이야기 나눴어요.', rating: 5, displayOrder: 4, isActive: false },
]

export function useAdminHomeReviews() {
  return useQuery({
    queryKey: ['admin', 'home-reviews'],
    queryFn: fetchAdminHomeReviews,
    placeholderData: MOCK_REVIEWS,
  })
}

export function useCreateHomeReview(onSuccess: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createHomeReview,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'home-reviews'] })
      onSuccess()
    },
  })
}

export function useUpdateHomeReview(onSuccess: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: AdminHomeReviewRequest }) =>
      updateHomeReview(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'home-reviews'] })
      onSuccess()
    },
  })
}

export function useDeleteHomeReview() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteHomeReview,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'home-reviews'] })
    },
  })
}

export function useToggleHomeReview() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: toggleHomeReview,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'home-reviews'] })
    },
  })
}
