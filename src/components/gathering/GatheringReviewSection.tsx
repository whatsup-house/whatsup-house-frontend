'use client'

import { useState } from 'react'
import { useAuthStore } from '@/lib/store/authStore'
import { useMyApplicationsMe } from '@/lib/hooks/useApplications'
import { useGatheringReviews } from '@/lib/hooks/useReview'
import ReviewCard from './ReviewCard'
import ReviewWriteForm from './ReviewWriteForm'

type ReviewSort = 'LATEST' | 'LIKES'

interface GatheringReviewSectionProps {
  gatheringId: string
  mileageReward?: number
}

function Pagination({ page, totalPages, onChange }: {
  page: number
  totalPages: number
  onChange: (p: number) => void
}) {
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-center gap-1 py-5">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page === 0}
        aria-label="이전 페이지"
        className="w-8 h-8 rounded-full flex items-center justify-center text-foreground bg-card shadow-sm disabled:opacity-40 disabled:bg-transparent disabled:shadow-none"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>
      {Array.from({ length: totalPages }, (_, i) => (
        <button
          key={i}
          onClick={() => onChange(i)}
          className={`w-8 h-8 rounded-full text-sm font-bold transition-colors ${
            i === page ? 'bg-primary text-white' : 'text-tag-text'
          }`}
        >
          {i + 1}
        </button>
      ))}
      <button
        onClick={() => onChange(page + 1)}
        disabled={page === totalPages - 1}
        aria-label="다음 페이지"
        className="w-8 h-8 rounded-full flex items-center justify-center text-foreground bg-card shadow-sm disabled:opacity-40 disabled:bg-transparent disabled:shadow-none"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
    </div>
  )
}

export default function GatheringReviewSection({ gatheringId, mileageReward }: GatheringReviewSectionProps) {
  const { isLoggedIn, userId } = useAuthStore()
  const [sort, setSort] = useState<ReviewSort>('LIKES')
  const [page, setPage] = useState(0)
  const [toast, setToast] = useState<string | null>(null)
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set())

  const { data: attendedApps } = useMyApplicationsMe('ATTENDED', isLoggedIn)
  const attendedApplication = attendedApps?.find((app) => app.gathering.id === gatheringId)
  const hasAttended = !!attendedApplication

  const { data, isLoading } = useGatheringReviews(gatheringId, sort, page)

  const reviews = (data?.content ?? []).filter((r) => !deletedIds.has(r.reviewId))
  const totalElements = data?.totalElements ?? 0
  const totalPages = data?.totalPages ?? 0
  const hasMyReview = isLoggedIn && reviews.some((r) => r.userId === userId)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  const handlePageChange = (p: number) => {
    setPage(p)
    window.scrollTo({ top: 0, behavior: 'smooth' })
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

      {/* 리뷰 목록 */}
      {reviews.map((review) => (
        <ReviewCard
          key={review.reviewId}
          review={review}
          isLoggedIn={isLoggedIn}
          onToast={showToast}
          onDeleted={() => setDeletedIds((prev) => new Set([...prev, review.reviewId]))}
        />
      ))}

      {/* 페이지네이션 */}
      <Pagination page={page} totalPages={totalPages} onChange={handlePageChange} />

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
