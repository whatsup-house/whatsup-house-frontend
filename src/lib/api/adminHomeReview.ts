import apiClient from './client'
import type {
  ApiResponse,
  AdminHomeReview,
  AdminHomeReviewPage,
  ReviewHomeFeaturedRequest,
  ReviewHomeOrderItem,
} from './types'

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
  page?: number
  size?: number
  totalElements?: number
  totalPages?: number
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

const fetchAdminReviewsPageByHomeFeatured = async ({
  homeFeatured,
  page,
  size,
}: {
  homeFeatured: boolean
  page: number
  size: number
}): Promise<AdminHomeReviewPage> => {
  const response = await apiClient.get<ApiResponse<RawReviewPage>>('/api/admin/reviews', {
    params: { homeFeatured, page, size },
  })
  const data = response.data.data
  const content = (data?.content ?? []).map(toHomeReview)

  return {
    content,
    page: data?.page ?? page,
    size: data?.size ?? size,
    totalElements: data?.totalElements ?? content.length,
    totalPages: data?.totalPages ?? (content.length > 0 ? 1 : 0),
  }
}

// 홈 노출(피처링)된 리뷰 목록 조회
export const fetchAdminHomeReviews = async (): Promise<AdminHomeReview[]> => {
  const page = await fetchAdminReviewsPageByHomeFeatured({ homeFeatured: true, page: 0, size: 50 })
  return page.content
}

// 홈에 아직 노출하지 않은 실제 리뷰 후보 조회
export const fetchAdminHomeReviewCandidates = async (): Promise<AdminHomeReview[]> => {
  const firstPage = await fetchAdminReviewsPageByHomeFeatured({ homeFeatured: false, page: 0, size: 100 })
  if (firstPage.totalPages <= 1) return firstPage.content

  const remainingPages = await Promise.all(
    Array.from({ length: firstPage.totalPages - 1 }, (_, i) =>
      fetchAdminReviewsPageByHomeFeatured({ homeFeatured: false, page: i + 1, size: 100 }),
    ),
  )

  return [
    ...firstPage.content,
    ...remainingPages.flatMap((page) => page.content),
  ]
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
