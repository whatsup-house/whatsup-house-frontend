import apiClient from './client'
import type { ApiResponse, AdminHomeReview, AdminHomeReviewRequest } from './types'

interface AdminHomeReviewsListResponse {
  reviews: AdminHomeReview[]
}

export const fetchAdminHomeReviews = async (): Promise<AdminHomeReview[]> => {
  const response = await apiClient.get<ApiResponse<AdminHomeReviewsListResponse>>('/api/admin/home-reviews')
  return response.data.data.reviews
}

export const createHomeReview = async (data: AdminHomeReviewRequest): Promise<AdminHomeReview> => {
  const response = await apiClient.post<ApiResponse<AdminHomeReview>>('/api/admin/home-reviews', data)
  return response.data.data
}

export const updateHomeReview = async (id: string, data: AdminHomeReviewRequest): Promise<AdminHomeReview> => {
  const response = await apiClient.put<ApiResponse<AdminHomeReview>>(`/api/admin/home-reviews/${id}`, data)
  return response.data.data
}

export const deleteHomeReview = async (id: string): Promise<void> => {
  await apiClient.delete(`/api/admin/home-reviews/${id}`)
}

export const toggleHomeReview = async (id: string): Promise<AdminHomeReview> => {
  const response = await apiClient.patch<ApiResponse<AdminHomeReview>>(`/api/admin/home-reviews/${id}/toggle`)
  return response.data.data
}

export const reorderHomeReviews = async (orderedIds: string[]): Promise<void> => {
  await apiClient.patch('/api/admin/home-reviews/reorder', { orderedIds })
}
