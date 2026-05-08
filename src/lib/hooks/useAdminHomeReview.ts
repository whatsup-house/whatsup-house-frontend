import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AdminHomeReview, AdminHomeReviewRequest } from '@/lib/api/types'

let mockReviews: AdminHomeReview[] = [
  { id: 'r1', authorName: '재즈러버', avatarUrl: '/home/home-1.png', gatheringTitle: '느린 오후의 재즈 감상 모임', content: '오랜만에 깊은 대화를 나눴어요. 사장님이 추천해주신 LP가 진짜 좋았고 같이 간 분들도 다들 편안한 분위기였어요.', rating: 5, displayOrder: 1, isActive: true },
  { id: 'r2', authorName: '민트초코', avatarUrl: null, gatheringTitle: '느린 오후의 재즈 감상 모임', content: '생각보다 분위기가 너무 편해서 놀랐습니다. 처음 봤는데 다들 친절하셨어요.', rating: 4, displayOrder: 2, isActive: true },
  { id: 'r3', authorName: '밤산책', avatarUrl: '/home/home-2.png', gatheringTitle: '느린 오후의 재즈 감상 모임', content: '퇴근하고 가볍게 다녀오기 딱 좋았어요. 음악도 좋고 공간도 아늑했어요.', rating: 5, displayOrder: 3, isActive: true },
  { id: 'r4', authorName: '노을빛', avatarUrl: null, gatheringTitle: '드로잉 살롱', content: '드로잉 살롱 분위기 진짜 따뜻했어요. 혼자 갔는데 전혀 어색하지 않았고 좋은 분들과 이야기 나눴어요.', rating: 5, displayOrder: 4, isActive: false },
]

let nextId = 5

export function useAdminHomeReviews() {
  return useQuery({
    queryKey: ['admin', 'home-reviews'],
    queryFn: () => Promise.resolve([...mockReviews]),
  })
}

export function useCreateHomeReview(onSuccess: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: AdminHomeReviewRequest) => {
      const review: AdminHomeReview = {
        id: `r${nextId++}`,
        isActive: true,
        authorName: data.authorName,
        avatarUrl: data.avatarUrl ?? null,
        gatheringTitle: data.gatheringTitle,
        content: data.content,
        rating: data.rating,
        displayOrder: data.displayOrder ?? mockReviews.length + 1,
      }
      mockReviews = [...mockReviews, review]
      return Promise.resolve(review)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'home-reviews'] })
      onSuccess()
    },
  })
}

export function useUpdateHomeReview(onSuccess: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: AdminHomeReviewRequest }) => {
      mockReviews = mockReviews.map((r) =>
        r.id === id ? { ...r, ...data, avatarUrl: data.avatarUrl ?? null } : r
      )
      return Promise.resolve(mockReviews.find((r) => r.id === id)!)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'home-reviews'] })
      onSuccess()
    },
  })
}

export function useDeleteHomeReview() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => {
      mockReviews = mockReviews.filter((r) => r.id !== id)
      return Promise.resolve()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'home-reviews'] })
    },
  })
}

export function useToggleHomeReview() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => {
      mockReviews = mockReviews.map((r) => (r.id === id ? { ...r, isActive: !r.isActive } : r))
      return Promise.resolve()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'home-reviews'] })
    },
  })
}
