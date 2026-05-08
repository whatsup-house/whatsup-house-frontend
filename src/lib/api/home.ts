import apiClient from './client'
import type { ApiResponse, HomeReviewsResponse } from './types'

export const fetchHomeReviews = async (): Promise<HomeReviewsResponse> => {
  const response = await apiClient.get<ApiResponse<HomeReviewsResponse>>('/api/home/reviews')
  return response.data.data
}
