import apiClient from './client'
import type { ApiResponse, CuratedResponse, HeroCarouselSlide, HomeReviewsResponse } from './types'

export const fetchHeroCarousel = async (): Promise<HeroCarouselSlide[]> => {
  const response = await apiClient.get<ApiResponse<HeroCarouselSlide[]>>('/api/home/carousel')
  return response.data.data
}

export const fetchCuratedGatherings = async (): Promise<CuratedResponse> => {
  const response = await apiClient.get<ApiResponse<CuratedResponse>>('/api/home/curated')
  return response.data.data
}

export const fetchHomeReviews = async (): Promise<HomeReviewsResponse> => {
  const response = await apiClient.get<ApiResponse<HomeReviewsResponse>>('/api/home/reviews')
  return response.data.data
}
