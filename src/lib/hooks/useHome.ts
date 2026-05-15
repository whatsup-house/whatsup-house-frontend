import { useQuery } from '@tanstack/react-query'
import { fetchCuratedGatherings, fetchHeroCarousel } from '@/lib/api/home'
import { fetchAllReviews } from '@/lib/api/review'

export function useHeroCarousel() {
  return useQuery({
    queryKey: ['home', 'carousel'],
    queryFn: fetchHeroCarousel,
    staleTime: 1000 * 60 * 5,
  })
}

export function useCuratedGatherings() {
  return useQuery({
    queryKey: ['home', 'curated'],
    queryFn: fetchCuratedGatherings,
    staleTime: 1000 * 60 * 5,
  })
}

export function useHomeReviews(sort: 'LIKES' | 'LATEST' = 'LIKES') {
  return useQuery({
    queryKey: ['home', 'reviews', sort],
    queryFn: () => fetchAllReviews(sort, 0, 6),
    staleTime: 1000 * 60 * 5,
  })
}
