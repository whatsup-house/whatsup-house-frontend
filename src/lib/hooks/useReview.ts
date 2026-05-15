import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createReview, toggleReviewLike } from '@/lib/api/review'
import type { ReviewCreateRequest } from '@/lib/api/types'

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
