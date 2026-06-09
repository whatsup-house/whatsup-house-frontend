'use client'

import { useRef } from 'react'
import Link from 'next/link'
import AppImage from '@/components/ui/AppImage'
import HScrollButtons from '@/components/ui/HScrollButtons'
import { useHomeReviews } from '@/lib/hooks/useHome'
import type { HomeReviewItem } from '@/lib/api/types'

function HomeReviewCard({ review }: { review: HomeReviewItem }) {
  return (
    <Link href={`/reviews?highlight=${review.reviewId}`} className="flex-none w-[200px] bg-card rounded-2xl border border-tag-bg/40 overflow-hidden snap-start active:opacity-70 transition-opacity">
      <div className="relative w-full aspect-square bg-tag-bg flex items-center justify-center overflow-hidden">
        {review.thumbnailImageUrl ? (
          <AppImage
            src={review.thumbnailImageUrl}
            alt=""
            className="object-cover"
            sizes="200px"
          />
        ) : (
          <span className="text-4xl">🐾</span>
        )}
      </div>
      <div className="p-3">
        <div className="flex items-center gap-1.5 mb-1.5">
          <span className="text-[11px] font-semibold text-tag-text truncate">{review.nickname}</span>
          {review.thumbnailImageUrl && (
            <span className="text-[9px] font-semibold text-primary bg-primary-light rounded px-1 py-0.5 shrink-0">
              📷
            </span>
          )}
        </div>
        <p className="text-[10px] text-tag-text font-medium truncate mb-1">{review.gatheringTitle}</p>
        <p className="text-xs text-tag-text leading-relaxed line-clamp-2">{review.reviewContent}</p>
      </div>
    </Link>
  )
}

function SkeletonCard() {
  return (
    <div className="flex-none w-[200px] bg-card rounded-2xl border border-tag-bg/40 overflow-hidden snap-start animate-pulse">
      <div className="w-full aspect-square bg-tag-bg" />
      <div className="p-3 space-y-2">
        <div className="h-3 bg-tag-bg rounded w-1/2" />
        <div className="h-2.5 bg-tag-bg rounded w-3/4" />
        <div className="h-2.5 bg-tag-bg rounded w-full" />
      </div>
    </div>
  )
}

export default function ReviewsSection() {
  const { data, isLoading } = useHomeReviews()
  const reviews = data ?? []
  const scrollRef = useRef<HTMLDivElement>(null)

  if (!isLoading && reviews.length === 0) return null

  return (
    <div className="pt-2 pb-6">
      <div className="flex items-center justify-between px-4 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-1 h-[18px] rounded-full bg-primary" />
          <span className="text-[15px] font-bold text-foreground">다녀온 사람들의 후기</span>
        </div>
        <Link href="/reviews" className="text-xs text-tag-text/70 min-h-[36px] flex items-center">
          전체보기 ›
        </Link>
      </div>

      <div className="relative">
        <div ref={scrollRef} className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory scroll-pl-4 px-4">
          {isLoading
            ? Array.from({ length: 4 }, (_, i) => <SkeletonCard key={i} />)
            : reviews.map((review) => <HomeReviewCard key={review.reviewId} review={review} />)
          }
        </div>
        <HScrollButtons scrollRef={scrollRef} />
      </div>
    </div>
  )
}
