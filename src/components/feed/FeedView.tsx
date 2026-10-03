'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useFeed } from '@/lib/hooks/useFeed'
import FeedItem from './FeedItem'

// 모바일: 화면 높이 - TopNav(3.5rem) - BottomNav(4rem + safe-area) - 두 nav의 1px 보더. lg 프레임 안에서는 main 높이를 그대로 쓴다.
const HEIGHT_CLS = 'h-[calc(100dvh-7.5rem-2px-env(safe-area-inset-bottom))] lg:h-full'
const ctaCls = 'rounded-full bg-white px-5 py-2.5 text-sm font-bold text-black'

export default function FeedView() {
  const t = useTranslations('feed')
  const { data, isPending, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = useFeed()
  const containerRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [muted, setMuted] = useState(true)  // 한 번 소리를 켜면 다음 영상도 켠 채로
  const items = data?.pages.flatMap((page) => page.items) ?? []

  // 화면의 60% 이상 보이는 칸이 현재 칸
  useEffect(() => {
    const root = containerRef.current
    if (!root) return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveIndex(Number((entry.target as HTMLElement).dataset.feedIndex))
        }
      },
      { root, threshold: 0.6 },
    )
    root.querySelectorAll('[data-feed-index]').forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [items.length, hasNextPage])  // 빈 마지막 페이지여도 엔드 카드가 관찰되도록

  // 끝에서 두 번째 칸이 보이면 다음 페이지
  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage && activeIndex >= items.length - 2) fetchNextPage()
  }, [activeIndex, items.length, hasNextPage, isFetchingNextPage, fetchNextPage])

  if (isPending || isError || items.length === 0) {
    return (
      <div className={`${HEIGHT_CLS} flex flex-col items-center justify-center gap-4 bg-black px-6 text-center text-white`}>
        {isPending ? (
          <Loader2 className="animate-spin" size={32} aria-label={t('loading')} />
        ) : isError ? (
          <>
            <p className="text-sm text-white/80">{t('error')}</p>
            <button type="button" onClick={() => refetch()} className={ctaCls}>{t('retry')}</button>
          </>
        ) : (
          <>
            <p className="text-sm text-white/80">{t('empty')}</p>
            <Link href="/gatherings" className={ctaCls}>{t('emptyAction')}</Link>
          </>
        )}
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      data-testid="feed"
      className={`${HEIGHT_CLS} snap-y snap-mandatory overflow-y-scroll overscroll-contain bg-black [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`}
    >
      {items.map((item, index) => (
        <div key={item.id} data-feed-index={index} className="h-full">
          <FeedItem
            kind={item.kind}
            media={item.media}
            caption={item.caption}
            postedAt={item.postedAt}
            gathering={item.gathering}
            instagramUrl={item.instagramUrl}
            reviewId={item.reviewId}
            isActive={index === activeIndex}
            muted={muted}
            onToggleMute={() => setMuted((m) => !m)}
          />
        </div>
      ))}
      {hasNextPage ? (
        <div className="flex h-24 items-center justify-center text-white/70">
          <Loader2 className="animate-spin" size={24} aria-label={t('loading')} />
        </div>
      ) : (
        // 엔드 카드도 인덱스를 가져야 마지막 영상이 화면 밖에서 계속 재생되지 않는다 (로더는 제외)
        <div data-feed-index={items.length} data-testid="feed-end" className="flex h-full snap-start flex-col items-center justify-center gap-4 px-6 text-center text-white">
          <p className="text-base font-semibold">{t('endTitle')}</p>
          <Link href="/gatherings" className={ctaCls}>{t('nextGatherings')}</Link>
        </div>
      )}
    </div>
  )
}
