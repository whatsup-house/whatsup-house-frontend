import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AdminHeroCarouselSlide, AdminHeroCarouselSlideRequest } from '@/lib/api/types'

let mockSlides: AdminHeroCarouselSlide[] = [
  { id: '1', type: 'CALENDAR', imageUrl: '/home/home-1.png', label: '5월 게더링 일정', sub: null, date: null, gatheringId: null, displayOrder: 1, isActive: true },
  { id: '2', type: 'STORY', imageUrl: '/home/home-2.png', label: '퇴근 게더링', sub: '와썹하우스', date: null, gatheringId: null, displayOrder: 2, isActive: true },
  { id: '3', type: 'GATHERING', imageUrl: '/home/home-3.png', label: '전국 대학생 게더링', sub: null, date: '5월 21일 수', gatheringId: '1', displayOrder: 3, isActive: true },
  { id: '4', type: 'GATHERING', imageUrl: '/home/home-4.png', label: '경찰과 도둑', sub: null, date: '5월 11일 일', gatheringId: '2', displayOrder: 4, isActive: true },
  { id: '5', type: 'STORY', imageUrl: '/home/home-5.png', label: '우리 젊다', sub: 'Whatsup house story', date: null, gatheringId: null, displayOrder: 5, isActive: false },
]

let nextId = 6

export function useAdminCarouselSlides() {
  return useQuery({
    queryKey: ['admin', 'hero-carousel'],
    queryFn: () => Promise.resolve([...mockSlides]),
  })
}

export function useCreateCarouselSlide(onSuccess: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: AdminHeroCarouselSlideRequest) => {
      const slide: AdminHeroCarouselSlide = { id: String(nextId++), isActive: true, ...data, sub: data.sub ?? null, date: data.date ?? null, gatheringId: data.gatheringId ?? null }
      mockSlides = [...mockSlides, slide]
      return Promise.resolve(slide)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'hero-carousel'] })
      onSuccess()
    },
  })
}

export function useUpdateCarouselSlide(onSuccess: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: AdminHeroCarouselSlideRequest }) => {
      mockSlides = mockSlides.map((s) =>
        s.id === id ? { ...s, ...data, sub: data.sub ?? null, date: data.date ?? null, gatheringId: data.gatheringId ?? null } : s
      )
      return Promise.resolve(mockSlides.find((s) => s.id === id)!)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'hero-carousel'] })
      onSuccess()
    },
  })
}

export function useDeleteCarouselSlide() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => {
      mockSlides = mockSlides.filter((s) => s.id !== id)
      return Promise.resolve()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'hero-carousel'] })
    },
  })
}

export function useToggleCarouselSlide() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => {
      mockSlides = mockSlides.map((s) => (s.id === id ? { ...s, isActive: !s.isActive } : s))
      return Promise.resolve()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'hero-carousel'] })
    },
  })
}
