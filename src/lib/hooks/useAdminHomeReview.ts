import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AdminHomeReview, AdminHomeReviewRequest } from '@/lib/api/types'

let mockReviews: AdminHomeReview[] = [
  { id: 'r1', authorName: '예림', avatarUrl: '/review/review1.JPG', gatheringTitle: '퇴근 게더링', content: '퇴근하고 팜팜발리에서 처음 만난 분들인데 이렇게 편안할 줄 몰랐어요. 2시간이 어떻게 지나갔는지 모를 정도였어요.', rating: 5, displayOrder: 1, isActive: true },
  { id: 'r2', authorName: '지은이', avatarUrl: '/review/review2.JPG', gatheringTitle: '퇴근 게더링', content: '혼자 가기 망설였는데 다들 너무 자연스럽게 받아줘서 금방 친해졌어요. 직장인들끼리 공감대가 엄청났습니다.', rating: 5, displayOrder: 2, isActive: true },
  { id: 'r3', authorName: '수아', avatarUrl: '/review/review3.JPG', gatheringTitle: '대학생 게더링', content: '학교도 전공도 다른 사람들이랑 이렇게 이야기가 잘 통할 줄 몰랐어요. 비슷한 감성의 친구들을 만난 것 같아서 뿌듯했어요.', rating: 5, displayOrder: 3, isActive: true },
  { id: 'r4', authorName: '민준정', avatarUrl: '/review/review4.JPG', gatheringTitle: '대학생 게더링', content: '서울대입구역 근처에서 이런 모임이 있는 줄 몰랐어요. 낯선 사람들과 이렇게 쉽게 친해질 수 있다는 게 신기했어요.', rating: 4, displayOrder: 4, isActive: true },
  { id: 'r5', authorName: '나연강', avatarUrl: '/review/review5.JPG', gatheringTitle: '썬데이 러닝 클럽 (SRC)', content: '혼자 달리기는 힘들었는데 함께 뛰니까 너무 즐거웠어요. 러닝 후 한강뷰 보면서 마신 커피 한 잔이 꿀맛이었어요.', rating: 5, displayOrder: 5, isActive: true },
  { id: 'r6', authorName: '도현임', avatarUrl: '/review/review6.JPG', gatheringTitle: '썬데이 러닝 클럽 (SRC)', content: '페이스 맞춰주는 분위기가 너무 좋았어요. 처음 오는 사람도 전혀 부담 없이 참여할 수 있어요.', rating: 5, displayOrder: 6, isActive: true },
  { id: 'r7', authorName: '재원송', avatarUrl: '/review/review1.JPG', gatheringTitle: '경찰과 도둑', content: '어른이 되고 이런 게임을 할 줄 몰랐어요. 보라매공원 넓은 곳에서 뛰어다니니까 너무 재밌고 팀원들이랑 빠르게 친해졌어요.', rating: 5, displayOrder: 7, isActive: true },
  { id: 'r8', authorName: '태양오', avatarUrl: '/review/review2.JPG', gatheringTitle: '경찰과 도둑', content: '진짜 어릴 때로 돌아간 기분이었어요. 게임 끝나고 다 같이 아이스크림 먹으러 간 게 제일 좋았던 것 같아요.', rating: 5, displayOrder: 8, isActive: false },
]

let nextId = 9

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
