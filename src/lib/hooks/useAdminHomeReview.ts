import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchAdminHomeReviews,
  fetchAdminHomeReviewCandidates,
  setReviewHomeFeatured,
  reorderHomeReviews,
  deleteHomeReview,
} from '@/lib/api/adminHomeReview'
import type { ReviewHomeFeaturedRequest, ReviewHomeOrderItem } from '@/lib/api/types'

const KEY = ['admin', 'home-reviews']
const CANDIDATE_KEY = ['admin', 'home-review-candidates']

export function useAdminHomeReviews() {
  return useQuery({
    queryKey: KEY,
    queryFn: fetchAdminHomeReviews,
  })
}

export function useAdminHomeReviewCandidates(enabled = true) {
  return useQuery({
    queryKey: CANDIDATE_KEY,
    queryFn: fetchAdminHomeReviewCandidates,
    enabled,
  })
}

export function useSetReviewHomeFeatured() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ reviewId, data }: { reviewId: string; data: ReviewHomeFeaturedRequest }) =>
      setReviewHomeFeatured(reviewId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      qc.invalidateQueries({ queryKey: CANDIDATE_KEY })
      qc.invalidateQueries({ queryKey: ['home', 'reviews'] })
    },
  })
}

export function useReorderHomeReviews() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (items: ReviewHomeOrderItem[]) => reorderHomeReviews(items),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      qc.invalidateQueries({ queryKey: ['home', 'reviews'] })
    },
  })
}

export function useDeleteHomeReview() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (reviewId: string) => deleteHomeReview(reviewId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      qc.invalidateQueries({ queryKey: CANDIDATE_KEY })
      qc.invalidateQueries({ queryKey: ['home', 'reviews'] })
    },
  })
}
