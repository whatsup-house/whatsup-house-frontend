'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useHomeReviews } from '@/lib/hooks/useHome'
import type { ReviewItem } from '@/lib/api/types'

type SortType = 'LIKES' | 'LATEST'

function HomeReviewCard({ review }: { review: ReviewItem }) {
  return (
    <div className="flex-none w-[200px] bg-card rounded-2xl border border-tag-bg/40 overflow-hidden snap-start">
      <div className="relative w-full aspect-square bg-tag-bg flex items-center justify-center overflow-hidden">
        {review.type === 'PHOTO' && review.imageUrl ? (
          <img
            src={review.imageUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <span className="text-4xl">{review.authorAnimalType}</span>
        )}
      </div>
      <div className="p-3">
        <div className="flex items-center gap-1.5 mb-1.5">
          <span className="text-[11px] font-semibold text-tag-text truncate">{review.authorNickname}</span>
          {review.type === 'PHOTO' && (
            <span className="text-[9px] font-semibold text-primary bg-primary-light rounded px-1 py-0.5 shrink-0">
              📷
            </span>
          )}
        </div>
        <p className="text-[10px] text-tag-text font-medium truncate mb-1">{review.gatheringTitle}</p>
        <p className="text-xs text-tag-text leading-relaxed line-clamp-2">{review.content}</p>
      </div>
    </div>
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
  const [sort, setSort] = useState<SortType>('LIKES')
  const { data, isLoading } = useHomeReviews(sort)
  const reviews = data?.content ?? []

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

      <div className="flex gap-2 px-4 mb-3">
        {(['LIKES', 'LATEST'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSort(s)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
              sort === s ? 'bg-primary text-white' : 'bg-tag-bg text-tag-text'
            }`}
          >
            {s === 'LIKES' ? '추천순' : '최신순'}
          </button>
        ))}
      </div>

      <div className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory px-4">
        {isLoading
          ? Array.from({ length: 4 }, (_, i) => <SkeletonCard key={i} />)
          : reviews.map((review) => <HomeReviewCard key={review.id} review={review} />)
        }
      </div>
    </div>
  )
}
