import type { Metadata } from 'next'
import { dehydrate, HydrationBoundary } from '@tanstack/react-query'
import { getTranslations } from 'next-intl/server'
import { makeQueryClient } from '@/lib/utils/queryClient'
import { getGatheringDetailOnServer, prefetchGatheringDetail } from '@/lib/hooks/useGatherings'
import { buildGatheringJsonLd, toMetaDescription } from '@/lib/utils/gatheringSeo'
import GatheringDetailPageClient from '@/components/gathering/GatheringDetailPageClient'

interface GatheringDetailPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: GatheringDetailPageProps): Promise<Metadata> {
  const { id } = await params
  const gathering = await getGatheringDetailOnServer(id)
  const t = await getTranslations('metadata.gatherings')
  const tCommon = await getTranslations('common')
  if (!gathering) return { title: t('title'), description: t('description') }

  const description = toMetaDescription(gathering.description, t('description'))
  return {
    title: `${gathering.title} | ${tCommon('brand')}`,
    description,
    // 옛 회차 ID로 들어와도 종류 페이지 하나로 모은다.
    alternates: { canonical: `/gatherings/${gathering.id}` },
    openGraph: {
      title: gathering.title,
      description,
      type: 'website',
      images: gathering.thumbnailUrl ? [{ url: gathering.thumbnailUrl }] : undefined,
    },
  }
}

export const dynamic = 'force-dynamic'

// 서버에서 상세를 프리페치해 첫 HTML에 본문을 담는다 — 검색·AI 크롤러용. (KAN-395)
export default async function GatheringDetailPage({ params }: GatheringDetailPageProps) {
  const { id } = await params
  const queryClient = makeQueryClient()
  const gathering = await prefetchGatheringDetail(queryClient, id)
  const tCommon = await getTranslations('common')
  const jsonLd = gathering ? buildGatheringJsonLd(gathering, tCommon('brand')) : []

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      {jsonLd.length > 0 && (
        <script
          type="application/ld+json"
          // '<' 이스케이프로 설명 속 </script> 주입을 막는다.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
        />
      )}
      <GatheringDetailPageClient id={id} />
    </HydrationBoundary>
  )
}
