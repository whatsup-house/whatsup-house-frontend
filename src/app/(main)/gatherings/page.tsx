import type { Metadata } from 'next'
import { dehydrate, HydrationBoundary } from '@tanstack/react-query'
import { getTranslations } from 'next-intl/server'
import { makeQueryClient } from '@/lib/utils/queryClient'
import { prefetchGatheringsQueries } from '@/lib/hooks/useGatherings'
import GatheringsPageClient from '@/components/gathering/GatheringsPageClient'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('metadata.gatherings')

  return {
    title: t('title'),
    description: t('description'),
    openGraph: {
      title: t('title'),
      description: t('description'),
      type: 'website',
    },
  }
}

export const dynamic = 'force-dynamic'

export default async function GatheringsPage() {
  const queryClient = makeQueryClient()
  await prefetchGatheringsQueries(queryClient)

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <GatheringsPageClient />
    </HydrationBoundary>
  )
}
