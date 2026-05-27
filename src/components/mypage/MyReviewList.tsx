'use client'

import { useState } from 'react'
import ReviewCard from '@/components/gathering/ReviewCard'
import { useAuthStore } from '@/lib/store/authStore'
import { useMyReviews } from '@/lib/hooks/useReview'

type SortType = 'latest' | 'recommended'

export default function MyReviewList() {
  const { isLoggedIn } = useAuthStore()
  const [sort, setSort] = useState<SortType>('latest')
  const [page, setPage] = useState(0)
  const [toast, setToast] = useState<string | null>(null)
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set())

  const apiSort = sort === 'recommended' ? 'LIKES' : 'LATEST'
  const { data, isLoading } = useMyReviews(apiSort, page, isLoggedIn)
  const reviews = (data?.content ?? []).filter((r) => !deletedIds.has(r.reviewId))
  const totalPages = data?.totalPages ?? 0

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  if (isLoading) {
    return (
      <p className="py-8 text-center text-sm text-tag-text">불러오는 중...</p>
    )
  }

  if (reviews.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-tag-text">아직 작성한 후기가 없어요</p>
    )
  }

  return (
    <div className="relative px-4 py-5">
      {/* 정렬 탭 */}
      <div className="flex gap-2 mb-4">
        {(['latest', 'recommended'] as const).map((s) => (
          <button
            key={s}
            onClick={() => { setSort(s); setPage(0) }}
            className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
              sort === s ? 'bg-primary text-white' : 'bg-tag-bg text-tag-text'
            }`}
          >
            {s === 'latest' ? '최신순' : '추천순'}
          </button>
        ))}
      </div>

      {/* 카드 목록 (게더링 제목 칩 포함) */}
      {reviews.map((review) => (
        <ReviewCard
          key={review.reviewId}
          review={review}
          isLoggedIn={isLoggedIn}
          showGatheringTitle
          onToast={showToast}
          onDeleted={() => setDeletedIds((prev) => new Set([...prev, review.reviewId]))}
        />
      ))}

      {/* 페이지네이션 */}
      {totalPages > 1 && page < totalPages - 1 && (
        <button
          onClick={() => setPage((p) => p + 1)}
          className="w-full py-3 text-sm font-medium text-tag-text border border-tag-bg rounded-card"
        >
          더보기
        </button>
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
