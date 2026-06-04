import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AdminHeroCarouselSlideRequest } from '@/lib/api/types'
import {
  fetchAdminCarouselSlides,
  createCarouselSlide,
  updateCarouselSlide,
  deleteCarouselSlide,
  toggleCarouselSlide,
} from '@/lib/api/adminHeroCarousel'

export function useAdminCarouselSlides() {
  return useQuery({
    queryKey: ['admin', 'hero-carousel'],
    queryFn: fetchAdminCarouselSlides,
  })
}

export function useCreateCarouselSlide(onSuccess: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: AdminHeroCarouselSlideRequest) => createCarouselSlide(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'hero-carousel'] })
      onSuccess()
    },
  })
}

export function useUpdateCarouselSlide(onSuccess: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: AdminHeroCarouselSlideRequest }) =>
      updateCarouselSlide(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'hero-carousel'] })
      onSuccess()
    },
  })
}

export function useDeleteCarouselSlide() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteCarouselSlide(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'hero-carousel'] })
    },
  })
}

export function useToggleCarouselSlide() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => toggleCarouselSlide(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'hero-carousel'] })
    },
  })
}
