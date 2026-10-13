import { Suspense } from 'react'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import AllReviewList from '@/components/gathering/AllReviewList'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('metadata.reviews')

  return {
    title: t('title'),
    description: t('description'),
    // ?highlight=·?gathering= 은 스크롤·필터용 꼬리표라 대표 주소 하나로 모은다. (KAN-396)
    alternates: { canonical: '/reviews' },
    openGraph: {
      title: t('title'),
      description: t('description'),
      type: 'website',
      // openGraph 를 정의하면 루트 opengraph-image 가 덮이므로 같은 대표 이미지를 다시 지정
      images: '/opengraph-image.png',
    },
  }
}

export default function ReviewsPage() {
  return (
    <div className="min-h-screen bg-background pb-20">
      <Suspense>
        <AllReviewList />
      </Suspense>
    </div>
  )
}
