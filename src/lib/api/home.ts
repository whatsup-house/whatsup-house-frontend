import apiClient from './client'
import type { ApiResponse, CuratedGathering, HeroCarouselSlide, HomeReviewItem } from './types'

export const fetchHeroCarousel = async (): Promise<HeroCarouselSlide[]> => {
  const response = await apiClient.get<ApiResponse<HeroCarouselSlide[]>>('/api/home/carousel')
  return response.data.data
}

export const fetchCuratedGatherings = async (): Promise<CuratedGathering[]> => {
  const response = await apiClient.get<ApiResponse<CuratedGathering[]>>('/api/home/curated')
  return response.data.data
}

export const fetchHomeReviews = async (): Promise<HomeReviewItem[]> => {
  const response = await apiClient.get<ApiResponse<HomeReviewItem[]>>('/api/home/reviews')
  return response.data.data
}
