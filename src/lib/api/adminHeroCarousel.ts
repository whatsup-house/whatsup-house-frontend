import apiClient from './client'
import type { ApiResponse, AdminHeroCarouselSlide, AdminHeroCarouselSlideRequest } from './types'

// 백엔드는 isActive(boolean)를 Jackson 규칙상 "active"로 직렬화하므로 매핑한다. (KAN-183)
type RawSlide = Omit<AdminHeroCarouselSlide, 'isActive'> & { active: boolean }

const normalize = ({ active, ...rest }: RawSlide): AdminHeroCarouselSlide => ({
  ...rest,
  isActive: active,
})

export const fetchAdminCarouselSlides = async (): Promise<AdminHeroCarouselSlide[]> => {
  const response = await apiClient.get<ApiResponse<RawSlide[]>>('/api/admin/carousel')
  return (response.data.data ?? []).map(normalize)
}

export const createCarouselSlide = async (data: AdminHeroCarouselSlideRequest): Promise<void> => {
  await apiClient.post('/api/admin/carousel', data)
}

export const updateCarouselSlide = async (id: string, data: AdminHeroCarouselSlideRequest): Promise<void> => {
  await apiClient.put(`/api/admin/carousel/${id}`, data)
}

export const deleteCarouselSlide = async (id: string): Promise<void> => {
  await apiClient.delete(`/api/admin/carousel/${id}`)
}

// 노출 토글은 반전된 isActive 값을 명시적으로 전송한다.
export const toggleCarouselSlide = async (id: string, isActive: boolean): Promise<void> => {
  await apiClient.patch(`/api/admin/carousel/${id}`, { isActive })
}

export const reorderCarouselSlides = async (slideIds: string[]): Promise<void> => {
  await apiClient.put('/api/admin/carousel/order', { slideIds })
}
