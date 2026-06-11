import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createReview, deleteReview, fetchAllReviews, fetchGatheringReviewsPage, fetchMyReviews, locateReview, toggleReviewLike } from '@/lib/api/review'
import type { ReviewCreateRequest } from '@/lib/api/types'

export function useAllReviews(
  sort: 'LATEST' | 'LIKES',
  page: number,
  gatheringId?: string,
  enabled = true,
) {
  return useQuery({
    queryKey: ['reviews', 'all', sort, page, gatheringId],
    queryFn: () => fetchAllReviews(sort, page, 10, gatheringId),
    enabled,
  })
}

export function useReviewLocate(
  reviewId: string | undefined,
  sort: 'LATEST' | 'LIKES',
  gatheringId?: string,
  enabled = true,
) {
  return useQuery({
    queryKey: ['reviews', 'locate', reviewId, sort, gatheringId],
    queryFn: () => locateReview(reviewId!, sort, 10, gatheringId),
    enabled: enabled && !!reviewId,
    retry: false,
  })
}

export function useGatheringReviews(
  gatheringId: string,
  sort: 'LATEST' | 'LIKES',
  page: number,
  enabled = true,
) {
  return useQuery({
    queryKey: ['gathering', gatheringId, 'reviews', sort, page],
    queryFn: () => fetchGatheringReviewsPage(gatheringId, sort, page),
    enabled: enabled && !!gatheringId,
  })
}

export function useMyReviews(sort: 'LATEST' | 'LIKES', page: number, enabled = true) {
  return useQuery({
    queryKey: ['reviews', 'me', sort, page],
    queryFn: () => fetchMyReviews(sort, page),
    enabled,
  })
}

export function useCreateReview(onSuccess?: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: ReviewCreateRequest) => createReview(data),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['gathering', result.gatheringId, 'reviews'] })
      qc.invalidateQueries({ queryKey: ['reviews'] })
      onSuccess?.()
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
