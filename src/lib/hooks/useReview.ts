import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createReview, deleteReview, fetchAllReviews, fetchGatheringReviewsPage, toggleReviewLike } from '@/lib/api/review'
import type { ReviewCreateRequest } from '@/lib/api/types'

export function useAllReviews(
  sort: 'LATEST' | 'LIKES',
  page: number,
  gatheringId?: string,
) {
  return useQuery({
    queryKey: ['reviews', 'all', sort, page, gatheringId],
    queryFn: () => fetchAllReviews(sort, page, 10, gatheringId),
  })
}

export function useGatheringReviews(
  gatheringId: string,
  sort: 'LATEST' | 'LIKES',
  page: number,
) {
  return useQuery({
    queryKey: ['gathering', gatheringId, 'reviews', sort, page],
    queryFn: () => fetchGatheringReviewsPage(gatheringId, sort, page),
    enabled: !!gatheringId,
  })
}

export function useCreateReview(
  gatheringId: string,
  onSuccess?: (mileageEarned: number) => void,
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: ReviewCreateRequest) => createReview(gatheringId, data),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['gathering', gatheringId, 'reviews'] })
      onSuccess?.(result.mileageEarned)
    },
  })
}

export function useToggleReviewLike() {
  return useMutation({
    mutationFn: (reviewId: string) => toggleReviewLike(reviewId),
  })
}

export function useDeleteReview(gatheringId?: string, onSuccess?: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (reviewId: string) => deleteReview(reviewId),
    onSuccess: () => {
      if (gatheringId) {
        qc.invalidateQueries({ queryKey: ['gathering', gatheringId, 'reviews'] })
      }
      qc.invalidateQueries({ queryKey: ['reviews'] })
      onSuccess?.()
    },
  })
}
