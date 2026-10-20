import { useQuery, type QueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/lib/store/authStore'
import { fetchCuratedGatherings, fetchHeroCarousel, fetchHomeReviews } from '@/lib/api/home'

export function useHeroCarousel() {
  return useQuery({
    queryKey: ['home', 'carousel'],
    queryFn: fetchHeroCarousel,
    staleTime: 1000 * 60 * 5,
  })
}

// 체험 계정은 숨김 모임이 보여서 userId 를 키에 넣는다. SSR 프리페치는 'anon' 키.
export function useCuratedGatherings() {
  const userId = useAuthStore((s) => s.userId)
  return useQuery({
    queryKey: ['home', 'curated', userId ?? 'anon'],
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
    queryClient.prefetchQuery({ queryKey: ['home', 'curated', 'anon'], queryFn: fetchCuratedGatherings }),
    queryClient.prefetchQuery({ queryKey: ['home', 'reviews'], queryFn: fetchHomeReviews }),
  ])
}
