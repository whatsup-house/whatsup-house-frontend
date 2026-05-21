import type { Metadata } from 'next'
import { dehydrate, HydrationBoundary } from '@tanstack/react-query'
import { makeQueryClient } from '@/lib/utils/queryClient'
import { prefetchHomeQueries } from '@/lib/hooks/useHome'
import HeroCarousel from '@/components/home/HeroCarousel'
import CuratedSection from '@/components/home/CuratedSection'
import ReviewsSection from '@/components/home/ReviewsSection'

export const metadata: Metadata = {
  title: '와썹하우스 | 1인 가구 소셜 게더링 플랫폼',
  description: '혼자 사는 2030 청년을 위한 소규모 오프라인 소셜 게더링. 새로운 인연을 만나보세요.',
  openGraph: {
    title: '와썹하우스',
    description: '혼자 사는 2030 청년을 위한 소규모 오프라인 소셜 게더링.',
    type: 'website',
  },
}

export default async function HomePage() {
  const queryClient = makeQueryClient()
  await prefetchHomeQueries(queryClient)

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="min-h-screen bg-background pb-6">
        <HeroCarousel />
        <CuratedSection />
        <ReviewsSection />
      </div>
    </HydrationBoundary>
  )
}
