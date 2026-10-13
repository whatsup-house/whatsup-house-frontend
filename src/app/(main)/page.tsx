import type { Metadata } from 'next'
import { dehydrate, HydrationBoundary } from '@tanstack/react-query'
import { getTranslations } from 'next-intl/server'
import { makeQueryClient } from '@/lib/utils/queryClient'
import { prefetchHomeQueries } from '@/lib/hooks/useHome'
import HeroCarousel from '@/components/home/HeroCarousel'
import CuratedSection from '@/components/home/CuratedSection'
import ReviewsSection from '@/components/home/ReviewsSection'
import DiningStatusSummary from '@/components/home/DiningStatusSummary'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('metadata.home')

  return {
    title: t('title'),
    description: t('description'),
    openGraph: {
      title: t('openGraphTitle'),
      description: t('openGraphDescription'),
      type: 'website',
      // openGraph 를 정의하면 루트 opengraph-image 가 덮이므로 같은 대표 이미지를 다시 지정
      images: '/opengraph-image.png',
    },
  }
}

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const queryClient = makeQueryClient()
  await prefetchHomeQueries(queryClient)

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="min-h-screen bg-background pb-6">
        <DiningStatusSummary />
        <HeroCarousel />
        <CuratedSection />
        <ReviewsSection />
      </div>
    </HydrationBoundary>
  )
}
