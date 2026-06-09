'use client'

import { useState } from 'react'
import Link from 'next/link'
import dayjs from 'dayjs'
import { useAuthStore } from '@/lib/store/authStore'
import { useMyApplicationsMe } from '@/lib/hooks/useApplications'
import { useGatheringReviews } from '@/lib/hooks/useReview'
import AppImage from '@/components/ui/AppImage'
import ReviewWriteForm from './ReviewWriteForm'
import type { ReviewItem } from '@/lib/api/types'

type ReviewSort = 'LATEST' | 'LIKES'

interface GatheringReviewSectionProps {
  gatheringId: string
  mileageReward?: number
}

function HorizontalReviewCard({ review }: { review: ReviewItem }) {
  const hasPhoto = review.reviewType === 'PHOTO' && !!review.images?.[0]?.imageUrl

  return (
    <Link
      href={`/reviews?highlight=${review.reviewId}&gathering=${review.gatheringId}`}
      className="bg-card rounded-card border border-tag-bg/40 shadow-sm overflow-hidden flex flex-col active:opacity-70 transition-opacity"
    >
      {/* 이미지 영역 — 항상 고정 비율 */}
      <div className="relative w-full aspect-[4/3] bg-tag-bg overflow-hidden shrink-0">
        {hasPhoto ? (
          <AppImage
            src={review.images![0].imageUrl}
            alt=""
            className="object-cover"
            sizes="260px"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-tag-bg to-background flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-tag-text/30">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
        )}
        {review.reviewType === 'PHOTO' && (
          <span className="absolute top-2 left-2 text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-primary-light text-primary">
            📷 포토리뷰
          </span>
        )}
      </div>

      {/* 텍스트 영역 */}
      <div className="flex flex-col flex-1 px-3 pt-2.5 pb-3 min-h-[110px]">
        <p className="text-[11px] text-tag-text mb-1.5">
          <span className="font-medium">{review.nickname ?? '익명'}</span>
          <span className="mx-1">·</span>
          {dayjs(review.createdAt).format('MM.DD')}
        </p>
        <p className="text-xs text-tag-text leading-relaxed line-clamp-3 flex-1">
          {review.reviewContent}
        </p>
        <div className="flex items-center gap-1 mt-2">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-tag-text/50">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          <span className="text-xs text-tag-text/60">{review.likeCount}</span>
        </div>
      </div>
    </Link>
  )
}

export default function GatheringReviewSection({ gatheringId, mileageReward }: GatheringReviewSectionProps) {
  const { isLoggedIn, userId } = useAuthStore()
  const [sort, setSort] = useState<ReviewSort>('LIKES')
  const [page, setPage] = useState(0)
  const [toast, setToast] = useState<string | null>(null)

  const { data: attendedApps } = useMyApplicationsMe('ATTENDED', isLoggedIn)
  const attendedApplication = attendedApps?.find((app) => app.gathering.id === gatheringId)
  const hasAttended = !!attendedApplication

  const { data, isLoading } = useGatheringReviews(gatheringId, sort, page)

  const reviews = data?.content ?? []
  const totalElements = data?.totalElements ?? 0
  const hasMyReview = isLoggedIn && reviews.some((r) => r.userId === userId)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  return (
    <div className="relative">
      {/* 총 개수 + 정렬 탭 */}
      <div className="flex items-center justify-between mb-4">
        {totalElements > 0 ? (
          <p className="text-xs text-tag-text">이 게더링의 후기 {totalElements}개</p>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          {(['LIKES', 'LATEST'] as const).map((s) => (
            <button
              key={s}
              onClick={() => { setSort(s); setPage(0) }}
              className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
                sort === s ? 'bg-primary text-white' : 'bg-tag-bg text-tag-text'
              }`}
            >
              {s === 'LIKES' ? '추천순' : '최신순'}
            </button>
          ))}
        </div>
      </div>

      {/* 로딩 */}
      {isLoading && (
        <p className="py-8 text-center text-sm text-tag-text">불러오는 중...</p>
      )}

      {/* 빈 상태 */}
      {!isLoading && reviews.length === 0 && (
        <p className="py-8 text-center text-sm text-tag-text">
          아직 후기가 없어요. 첫 번째 후기를 남겨보세요!
        </p>
      )}

      {/* 리뷰 목록 — 가로 스크롤 */}
      {reviews.length > 0 && (
        <div className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-2 items-stretch">
          {reviews.map((review) => (
            <div key={review.reviewId} className="flex-none w-[260px] snap-start">
              <HorizontalReviewCard review={review} />
            </div>
          ))}
        </div>
      )}

      {/* ATTENDED + 미작성 → 후기 작성 폼 */}
      {hasAttended && !hasMyReview && attendedApplication && (
        <ReviewWriteForm applicationId={attendedApplication.id} mileageReward={mileageReward} />
      )}

      {/* ATTENDED + 기작성 안내 */}
      {hasAttended && hasMyReview && (
        <div className="mt-4 bg-tag-bg/60 rounded-2xl px-4 py-3 text-center">
          <p className="text-xs text-tag-text font-medium">내가 작성한 리뷰가 있어요</p>
        </div>
      )}

      {/* 토스트 */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-foreground/90 text-white text-sm px-4 py-2.5 rounded-full shadow-lg z-50 whitespace-nowrap pointer-events-none">
          {toast}
        </div>
      )}
    </div>
  )
}
