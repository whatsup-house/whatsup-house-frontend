import type { FeedResponse } from './types'
import { getMockFeedPage } from './feedMock'

// TODO(KAN-380): API가 나오면 아래로 교체하고 feedMock.ts 삭제
//   const response = await apiClient.get<ApiResponse<FeedResponse>>('/api/feed', { params: { cursor, size: 10 } })
//   return response.data.data
export const fetchFeed = async (cursor?: string): Promise<FeedResponse> => {
  await new Promise((resolve) => setTimeout(resolve, 300))
  return getMockFeedPage(cursor)
}
