'use client'

import { useState } from 'react'
import ReviewCard from '@/components/gathering/ReviewCard'
import { useAuthStore } from '@/lib/store/authStore'
import type { ReviewItem } from '@/lib/api/types'

const MOCK_MY_REVIEWS: ReviewItem[] = [
  {
    reviewId: 'mr1',
    userId: 'mock-user',
    applicationId: 'app1',
    gatheringId: 'g1',
    reviewType: 'PHOTO',
    images: [{ imageId: 'img1', imageUrl: '/home/home-2.png', displayOrder: 0 }],
    reviewContent: '퇴근하고 가볍게 다녀오기 딱 좋았어요. 음악도 좋고 공간도 아늑했어요.',
    likeCount: 9,
    createdAt: '2026-05-11T10:00:00',
  },
  {
    reviewId: 'mr2',
    userId: 'mock-user',
    applicationId: 'app2',
    gatheringId: 'g3',
    reviewType: 'TEXT',
    images: [],
    reviewContent: '손이 어색했지만 결과물은 마음에 듭니다. 선생님이 친절하게 도와주셔서 좋았어요.',
    likeCount: 14,
    createdAt: '2026-05-11T10:00:00',
  },
  {
    reviewId: 'mr3',
    userId: 'mock-user',
    applicationId: 'app3',
    gatheringId: 'g2',
    reviewType: 'PHOTO',
    images: [{ imageId: 'img3', imageUrl: '/home/home-4.png', displayOrder: 0 }],
    reviewContent: '커피 종류별 비교가 흥미로웠어요. 다음엔 꼭 친구랑 같이 가고 싶어요.',
    likeCount: 18,
    createdAt: '2026-04-27T10:00:00',
  },
]

type SortType = 'latest' | 'recommended'
const PAGE_SIZE = 4

export default function MyReviewList() {
  const { isLoggedIn } = useAuthStore()
  const [sort, setSort] = useState<SortType>('latest')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [toast, setToast] = useState<string | null>(null)
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set())

  const remaining = MOCK_MY_REVIEWS.filter((r) => !deletedIds.has(r.reviewId))
  const sorted = sort === 'recommended'
    ? [...remaining].sort((a, b) => b.likeCount - a.likeCount)
    : remaining

  const visible = sorted.slice(0, visibleCount)
  const hasMore = visibleCount < sorted.length

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  if (remaining.length === 0) {
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
            onClick={() => setSort(s)}
            className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
              sort === s ? 'bg-primary text-white' : 'bg-tag-bg text-tag-text'
            }`}
          >
            {s === 'latest' ? '최신순' : '추천순'}
          </button>
        ))}
      </div>

      {/* 카드 목록 (게더링 제목 칩 포함) */}
      {visible.map((review) => (
        <ReviewCard
          key={review.reviewId}
          review={review}
          isLoggedIn={isLoggedIn}
          showGatheringTitle
          onToast={showToast}
          onDeleted={() => setDeletedIds((prev) => new Set([...prev, review.reviewId]))}
        />
      ))}

      {/* 더보기 버튼 */}
      {hasMore && (
        <button
          onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
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
