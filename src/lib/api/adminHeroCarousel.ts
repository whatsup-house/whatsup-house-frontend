import apiClient from './client'
import type { ApiResponse, AdminHeroCarouselSlide, AdminHeroCarouselSlideRequest } from './types'

interface SlidesResponse {
  slides: AdminHeroCarouselSlide[]
}

export const fetchAdminCarouselSlides = async (): Promise<AdminHeroCarouselSlide[]> => {
  const response = await apiClient.get<ApiResponse<SlidesResponse>>('/api/admin/hero-carousel')
  return response.data.data.slides
}

export const createCarouselSlide = async (data: AdminHeroCarouselSlideRequest): Promise<AdminHeroCarouselSlide> => {
  const response = await apiClient.post<ApiResponse<AdminHeroCarouselSlide>>('/api/admin/hero-carousel', data)
  return response.data.data
}

export const updateCarouselSlide = async (id: string, data: AdminHeroCarouselSlideRequest): Promise<AdminHeroCarouselSlide> => {
  const response = await apiClient.put<ApiResponse<AdminHeroCarouselSlide>>(`/api/admin/hero-carousel/${id}`, data)
  return response.data.data
}

export const deleteCarouselSlide = async (id: string): Promise<void> => {
  await apiClient.delete(`/api/admin/hero-carousel/${id}`)
}

export const toggleCarouselSlide = async (id: string): Promise<AdminHeroCarouselSlide> => {
  const response = await apiClient.patch<ApiResponse<AdminHeroCarouselSlide>>(`/api/admin/hero-carousel/${id}/toggle`)
  return response.data.data
}

export const reorderCarouselSlides = async (orderedIds: string[]): Promise<void> => {
  await apiClient.patch('/api/admin/hero-carousel/reorder', { orderedIds })
}
