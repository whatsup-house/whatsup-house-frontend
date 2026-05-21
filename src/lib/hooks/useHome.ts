import { useQuery, type QueryClient } from '@tanstack/react-query'
import { fetchCuratedGatherings, fetchHeroCarousel, fetchHomeReviews } from '@/lib/api/home'

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

export function useHomeReviews() {
  return useQuery({
    queryKey: ['home', 'reviews'],
    queryFn: fetchHomeReviews,
    staleTime: 1000 * 60 * 5,
  })
}

export async function prefetchHomeQueries(queryClient: QueryClient) {
  await Promise.allSettled([
    queryClient.prefetchQuery({ queryKey: ['home', 'carousel'], queryFn: fetchHeroCarousel }),
    queryClient.prefetchQuery({ queryKey: ['home', 'curated'], queryFn: fetchCuratedGatherings }),
    queryClient.prefetchQuery({ queryKey: ['home', 'reviews'], queryFn: fetchHomeReviews }),
  ])
}
