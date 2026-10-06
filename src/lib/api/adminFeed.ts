import apiClient from './client'
import type { AdminFeedFilters, AdminFeedPost, AdminFeedPostPage, AdminFeedPostRequest, ApiResponse } from './types'

// 어드민 피드 관리 (KAN-383)
export const fetchAdminFeedPosts = async ({ visible, page }: AdminFeedFilters): Promise<AdminFeedPostPage> => {
  const response = await apiClient.get<ApiResponse<AdminFeedPostPage>>('/api/admin/feed', {
    params: { visible, page, size: 20 },
  })
  return response.data.data
}

export const createAdminFeedPost = async (data: AdminFeedPostRequest): Promise<AdminFeedPost> => {
  const response = await apiClient.post<ApiResponse<AdminFeedPost>>('/api/admin/feed', data)
  return response.data.data
}

export const updateAdminFeedPost = async (id: string, data: AdminFeedPostRequest): Promise<AdminFeedPost> => {
  const response = await apiClient.put<ApiResponse<AdminFeedPost>>(`/api/admin/feed/${id}`, data)
  return response.data.data
}

export const updateAdminFeedVisibility = async (id: string, visible: boolean): Promise<void> => {
  await apiClient.patch(`/api/admin/feed/${id}/visibility`, { visible })
}

export const deleteAdminFeedPost = async (id: string): Promise<void> => {
  await apiClient.delete(`/api/admin/feed/${id}`)
}
