'use client'

import { useState } from 'react'
import { useAuthStore } from '@/lib/store/authStore'
import { useMyApplicationsMe } from '@/lib/hooks/useApplications'
import { useAllReviews, useGatheringReviews, useToggleReviewLike } from '@/lib/hooks/useReview'
import AppImage from '@/components/ui/AppImage'
import ReviewImageFallback from '@/components/ui/ReviewImageFallback'
import ReviewWriteForm from './ReviewWriteForm'
import type { ReviewItem } from '@/lib/api/types'

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={filled ? 'text-primary' : 'text-tag-text'}
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  )
}

function ReviewCardCompact({ review, isLoggedIn, onToast }: {
  review: ReviewItem
  isLoggedIn: boolean
  onToast: (msg: string) => void
}) {
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(review.likeCount)
  const { mutate: toggleLike } = useToggleReviewLike()

  const handleLike = () => {
    if (!isLoggedIn) { onToast('로그인이 필요한 기능이에요'); return }
    const prevLiked = liked
    const prevCount = likeCount
    setLiked(!prevLiked)
    setLikeCount(prevLiked ? prevCount - 1 : prevCount + 1)
    toggleLike(review.reviewId, {
      onSuccess: (data) => {
        setLiked(data.liked)
        setLikeCount(data.likeCount)
      },
      onError: () => {
        setLiked(prevLiked)
        setLikeCount(prevCount)
      },
    })
  }

  const thumbnailUrl = review.images?.[0]?.imageUrl

  return (
    <div className="flex-none w-[200px] bg-card rounded-2xl border border-tag-bg/40 overflow-hidden snap-start">
      {/* 상단: 사진 or 기본 이미지 */}
      <div className="relative w-full aspect-square bg-tag-bg">
        {review.reviewType === 'PHOTO' && thumbnailUrl ? (
          <AppImage
            src={thumbnailUrl}
            alt=""
            className="object-cover"
            sizes="200px"
          />
        ) : (
          <ReviewImageFallback />
        )}
      </div>

      {/* 하단 텍스트 */}
      <div className="p-3">
        <p className="text-xs text-tag-text leading-relaxed line-clamp-3 mb-2">
          {review.reviewContent}
        </p>
        <button
          onClick={handleLike}
          className="flex items-center gap-1 min-h-[28px]"
          aria-label={liked ? '추천 취소' : '추천'}
        >
          <HeartIcon filled={liked} />
          <span className={`text-[11px] font-medium ${liked ? 'text-primary' : 'text-tag-text'}`}>
            {likeCount}
          </span>
        </button>
      </div>
    </div>
  )
}

interface ReviewListSectionProps {
  gatheringId?: string
  mileageReward?: number
}

export default function ReviewListSection({ gatheringId, mileageReward }: ReviewListSectionProps) {
  const { isLoggedIn } = useAuthStore()
  const [toast, setToast] = useState<string | null>(null)

  const { data: attendedApps } = useMyApplicationsMe('ATTENDED', isLoggedIn)
  const attendedApplication = gatheringId
    ? attendedApps?.find((app) => app.gathering.id === gatheringId)
    : undefined
  const hasAttended = !!attendedApplication
  const gatheringReviews = useGatheringReviews(gatheringId ?? '', 'LIKES', 0, !!gatheringId)
  const allReviews = useAllReviews('LIKES', 0, undefined, !gatheringId)
  const data = gatheringId ? gatheringReviews.data : allReviews.data
  const isLoading = gatheringId ? gatheringReviews.isLoading : allReviews.isLoading
  const reviews = data?.content ?? []

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  return (
    <div className="relative">
      {/* 가로 스크롤 카드 목록 */}
      <div className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-1 -mx-4 px-4">
        {isLoading && (
          <p className="w-full py-8 text-center text-sm text-tag-text">불러오는 중...</p>
        )}
        {!isLoading && reviews.length === 0 && (
          <p className="w-full py-8 text-center text-sm text-tag-text">아직 후기가 없어요.</p>
        )}
        {reviews.map((review) => (
          <ReviewCardCompact
            key={review.reviewId}
            review={review}
            isLoggedIn={isLoggedIn}
            onToast={showToast}
          />
        ))}
      </div>

      {/* ATTENDED 유저 후기 작성 폼 */}
      {hasAttended && attendedApplication && (
        <ReviewWriteForm applicationId={attendedApplication.id} mileageReward={mileageReward} />
      )}

      {/* 비로그인 토스트 */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-foreground/90 text-white text-sm px-4 py-2.5 rounded-full shadow-lg z-50 whitespace-nowrap pointer-events-none">
          {toast}
        </div>
      )}
    </div>
  )
}
