import type { Metadata } from 'next'
import dayjs from 'dayjs'
import { dehydrate, HydrationBoundary } from '@tanstack/react-query'
import { makeQueryClient } from '@/lib/utils/queryClient'
import { prefetchGatheringsQueries } from '@/lib/hooks/useGatherings'
import GatheringsPageClient from '@/components/gathering/GatheringsPageClient'

export const metadata: Metadata = {
  title: '게더링 | 와썹하우스',
  description: '날짜별 소셜 게더링 일정을 확인하고 신청하세요.',
  openGraph: {
    title: '게더링 | 와썹하우스',
    description: '날짜별 소셜 게더링 일정을 확인하고 신청하세요.',
    type: 'website',
  },
}

export default async function GatheringsPage() {
  const today = dayjs()
  const todayStr = today.format('YYYY-MM-DD')
  const year = today.year()
  const month = today.month() + 1

  const queryClient = makeQueryClient()
  await prefetchGatheringsQueries(queryClient, todayStr, year, month)

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <GatheringsPageClient />
    </HydrationBoundary>
  )
}
