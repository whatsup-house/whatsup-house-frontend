import apiClient from './client'
import type { ApiResponse, FeedResponse } from './types'

// 피드 공개 API (KAN-382). cursor는 서버가 주는 불투명 문자열.
export const fetchFeed = async (cursor?: string): Promise<FeedResponse> => {
  const response = await apiClient.get<ApiResponse<FeedResponse>>('/api/feed', { params: { cursor, size: 10 } })
  return response.data.data
}
