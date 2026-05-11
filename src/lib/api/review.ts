import apiClient from './client'
import type { ApiResponse, ReviewCreateRequest, ReviewCreateResponse, ReviewItem } from './types'

export const fetchGatheringReviews = async (gatheringId: string): Promise<ReviewItem[]> => {
  const response = await apiClient.get<ApiResponse<ReviewItem[]>>(`/api/gatherings/${gatheringId}/reviews`)
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
