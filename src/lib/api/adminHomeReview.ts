import apiClient from './client'
import type { ApiResponse, AdminHomeReview, ReviewHomeFeaturedRequest, ReviewHomeOrderItem } from './types'

// 백엔드 raw 리뷰: isHomeFeatured는 "homeFeatured"로 직렬화되고, 이미지는 배열로 온다. (KAN-184)
interface RawAdminReview {
  reviewId: string
  nickname: string
  reviewContent: string
  likeCount: number
  gatheringTitle: string
  homeFeatured: boolean
  homeDisplayOrder: number | null
  images: { imageUrl: string }[] | null
  createdAt: string
}

interface RawReviewPage {
  content: RawAdminReview[]
}

const toHomeReview = (r: RawAdminReview): AdminHomeReview => ({
  reviewId: r.reviewId,
  nickname: r.nickname,
  reviewContent: r.reviewContent,
  likeCount: r.likeCount,
  gatheringTitle: r.gatheringTitle,
  imageUrl: r.images?.[0]?.imageUrl ?? null,
  homeFeatured: r.homeFeatured,
  homeDisplayOrder: r.homeDisplayOrder,
  createdAt: r.createdAt,
})

// 홈 노출(피처링)된 리뷰 목록 조회
export const fetchAdminHomeReviews = async (): Promise<AdminHomeReview[]> => {
  const response = await apiClient.get<ApiResponse<RawReviewPage>>('/api/admin/reviews', {
    params: { homeFeatured: true, page: 0, size: 50 },
  })
  return (response.data.data?.content ?? []).map(toHomeReview)
}

// 리뷰 홈 노출 설정 변경(노출/해제)
export const setReviewHomeFeatured = async (
  reviewId: string,
  data: ReviewHomeFeaturedRequest,
): Promise<void> => {
  await apiClient.patch(`/api/admin/reviews/${reviewId}/home-featured`, data)
}

// 홈 노출 리뷰 순서 변경
export const reorderHomeReviews = async (items: ReviewHomeOrderItem[]): Promise<void> => {
  await apiClient.put('/api/admin/reviews/home-order', { items })
}

export const deleteHomeReview = async (reviewId: string): Promise<void> => {
  await apiClient.delete(`/api/admin/reviews/${reviewId}`)
}
