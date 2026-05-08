'use client'

import Link from 'next/link'
import { useHomeReviews } from '@/lib/hooks/useHome'
import type { HomeReviewItem } from '@/lib/api/types'

function ReviewCardItem({ review }: { review: HomeReviewItem }) {
  return (
    <div className="flex-none w-[200px] bg-card rounded-2xl border border-tag-bg/40 overflow-hidden snap-start">
      <div className="relative w-full aspect-square bg-tag-bg">
        {review.avatarUrl ? (
          <img
            src={review.avatarUrl}
            alt={review.authorName}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-3xl">🐻</div>
        )}
      </div>
      <div className="p-3">
        <div className="flex items-center gap-1.5 mb-1.5">
          <span className="text-[11px] font-semibold text-tag-text truncate">{review.authorName}</span>
          <span className="text-[9px] font-semibold text-primary bg-primary-light rounded px-1 py-0.5 shrink-0">
            ★{review.rating}
          </span>
        </div>
        <p className="text-[10px] text-tag-text font-medium truncate mb-1">{review.gatheringTitle}</p>
        <p className="text-xs text-tag-text leading-relaxed line-clamp-2">{review.content}</p>
      </div>
    </div>
  )
}

export default function ReviewsSection() {
  const { data, isLoading } = useHomeReviews()
  const reviews = data?.reviews ?? []

  if (isLoading || reviews.length === 0) return null

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
      <div className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory px-4">
        {reviews.map((review) => (
          <ReviewCardItem key={review.id} review={review} />
        ))}
      </div>
    </div>
  )
}
