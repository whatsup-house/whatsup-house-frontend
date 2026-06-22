import type { Metadata } from 'next'
import { dehydrate, HydrationBoundary } from '@tanstack/react-query'
import { getTranslations } from 'next-intl/server'
import { makeQueryClient } from '@/lib/utils/queryClient'
import { prefetchHomeQueries } from '@/lib/hooks/useHome'
import HeroCarousel from '@/components/home/HeroCarousel'
import CuratedSection from '@/components/home/CuratedSection'
import ReviewsSection from '@/components/home/ReviewsSection'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('metadata.home')

  return {
    title: t('title'),
    description: t('description'),
    openGraph: {
      title: t('openGraphTitle'),
      description: t('openGraphDescription'),
      type: 'website',
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
        <HeroCarousel />
        <CuratedSection />
        <ReviewsSection />
      </div>
    </HydrationBoundary>
  )
}
