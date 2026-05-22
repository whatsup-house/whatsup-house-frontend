import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AdminHomeReviewRequest } from '@/lib/api/types'
import {
  fetchAdminHomeReviews,
  createHomeReview,
  updateHomeReview,
  deleteHomeReview,
  toggleHomeReview,
} from '@/lib/api/adminHomeReview'

export function useAdminHomeReviews() {
  return useQuery({
    queryKey: ['admin', 'home-reviews'],
    queryFn: fetchAdminHomeReviews,
  })
}

export function useCreateHomeReview(onSuccess: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: AdminHomeReviewRequest) => createHomeReview(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'home-reviews'] })
      onSuccess()
    },
  })
}

export function useUpdateHomeReview(onSuccess: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: AdminHomeReviewRequest }) =>
      updateHomeReview(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'home-reviews'] })
      onSuccess()
    },
  })
}

export function useDeleteHomeReview() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteHomeReview(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'home-reviews'] })
    },
  })
}

export function useToggleHomeReview() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => toggleHomeReview(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'home-reviews'] })
    },
  })
}
