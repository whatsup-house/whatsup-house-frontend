import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AdminHomeReview, AdminHomeReviewRequest } from '@/lib/api/types'

let mockReviews: AdminHomeReview[] = [
  { id: 'r1', authorName: '예림', avatarUrl: '/review/review1.JPG', gatheringTitle: '봄밤의 루프탑 재즈 소셜', content: '루프탑에서 재즈를 들으며 처음 만난 분들과 이렇게 편안해질 수 있을 줄 몰랐어요. 별이 보이는 밤하늘 아래 대화가 끊이지 않았어요.', rating: 5, displayOrder: 1, isActive: true },
  { id: 'r2', authorName: '지은이', avatarUrl: '/review/review2.JPG', gatheringTitle: '봄밤의 루프탑 재즈 소셜', content: '혼자 가기 망설였는데 다들 너무 자연스럽게 받아줘서 금방 친해졌어요. 2시간이 어떻게 지나갔는지 모를 정도였습니다.', rating: 5, displayOrder: 2, isActive: true },
  { id: 'r3', authorName: '수아', avatarUrl: '/review/review3.JPG', gatheringTitle: '일요일 오후의 북클럽 모임', content: '책 한 권으로 이렇게 다양한 이야기가 나올 수 있다는 게 신기했어요. 비슷한 감성의 사람들을 만난 것 같아서 뿌듯한 하루였습니다.', rating: 5, displayOrder: 3, isActive: true },
  { id: 'r4', authorName: '민준정', avatarUrl: '/review/review4.JPG', gatheringTitle: '직장인을 위한 목요 네트워킹', content: '퇴근 후 가볍게 갔는데 생각보다 솔직한 이야기들이 오가서 좋았어요. 같은 시대를 사는 직장인들끼리 공감대가 엄청났습니다.', rating: 5, displayOrder: 4, isActive: true },
  { id: 'r5', authorName: '나연강', avatarUrl: '/review/review5.JPG', gatheringTitle: '감성 필름 사진 산책', content: '필름 카메라 처음 써봤는데 같이 가르쳐주시면서 동네 골목을 걸으니까 너무 좋았어요. 사진도 예쁘게 나왔고 사람들도 따뜻했습니다.', rating: 5, displayOrder: 5, isActive: true },
  { id: 'r6', authorName: '도현임', avatarUrl: '/review/review6.JPG', gatheringTitle: '소규모 요리 클래스 — 이탈리안 파스타', content: '파스타 반죽을 직접 밀어보는 경험 자체가 너무 재밌었고, 같이 만들어서 먹으니까 더 맛있었어요. 요리를 못해도 충분히 즐길 수 있어요.', rating: 5, displayOrder: 6, isActive: true },
  { id: 'r7', authorName: '재원송', avatarUrl: '/review/review1.JPG', gatheringTitle: '수요 저녁 — 새로운 사람과 밥 한 끼', content: '처음 만난 사람들과 밥을 먹는 게 어색하면 어떡하나 했는데, 분위기가 너무 자연스러워서 오히려 친구 같았어요.', rating: 5, displayOrder: 7, isActive: false },
]

let nextId = 8

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
