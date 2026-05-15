import apiClient from './client'
import type { ApiResponse, GatheringReviewPageResponse, ReviewCreateRequest, ReviewCreateResponse, ReviewDeleteResponse, ReviewItem, ReviewLikeResponse } from './types'

export const fetchGatheringReviews = async (gatheringId: string): Promise<ReviewItem[]> => {
  const response = await apiClient.get<ApiResponse<ReviewItem[]>>(`/api/gatherings/${gatheringId}/reviews`)
  return response.data.data
}

export const fetchGatheringReviewsPage = async (
  gatheringId: string,
  sort: 'LATEST' | 'LIKES',
  page: number,
  size = 10,
): Promise<GatheringReviewPageResponse> => {
  const response = await apiClient.get<ApiResponse<GatheringReviewPageResponse>>(
    `/api/gatherings/${gatheringId}/reviews`,
    { params: { sort, page, size } },
  )
  return response.data.data
}

export const createReview = async (
  gatheringId: string,
  data: ReviewCreateRequest,
): Promise<ReviewCreateResponse> => {
  const response = await apiClient.post<ApiResponse<ReviewCreateResponse>>(
    `/api/gatherings/${gatheringId}/reviews`,
    data,
  )
  return response.data.data
}

export const toggleReviewLike = async (reviewId: string): Promise<ReviewLikeResponse> => {
  const response = await apiClient.post<ApiResponse<ReviewLikeResponse>>(`/api/reviews/${reviewId}/like`)
  return response.data.data
}

export const deleteReview = async (reviewId: string): Promise<ReviewDeleteResponse> => {
  const response = await apiClient.delete<ApiResponse<ReviewDeleteResponse>>(`/api/reviews/${reviewId}`)
  return response.data.data
}
