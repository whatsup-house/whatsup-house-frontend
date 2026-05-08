import { useQuery } from '@tanstack/react-query'
import { fetchHomeReviews } from '@/lib/api/home'

export function useHomeReviews() {
  return useQuery({
    queryKey: ['home', 'reviews'],
    queryFn: fetchHomeReviews,
    staleTime: 1000 * 60 * 5,
  })
}
