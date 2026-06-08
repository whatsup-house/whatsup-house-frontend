import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchAdminHomeReviews,
  setReviewHomeFeatured,
  reorderHomeReviews,
  deleteHomeReview,
} from '@/lib/api/adminHomeReview'
import type { ReviewHomeFeaturedRequest, ReviewHomeOrderItem } from '@/lib/api/types'

const KEY = ['admin', 'home-reviews']

export function useAdminHomeReviews() {
  return useQuery({
    queryKey: KEY,
    queryFn: fetchAdminHomeReviews,
  })
}

export function useSetReviewHomeFeatured() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ reviewId, data }: { reviewId: string; data: ReviewHomeFeaturedRequest }) =>
      setReviewHomeFeatured(reviewId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useReorderHomeReviews() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (items: ReviewHomeOrderItem[]) => reorderHomeReviews(items),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useDeleteHomeReview() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (reviewId: string) => deleteHomeReview(reviewId),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}
