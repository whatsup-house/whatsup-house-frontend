'use client'

import { useState } from 'react'
import ReviewCard from '@/components/gathering/ReviewCard'
import { useAuthStore } from '@/lib/store/authStore'
import type { ReviewItem } from '@/lib/api/types'

const MOCK_MY_REVIEWS: ReviewItem[] = [
  {
    id: 'mr1',
    authorNickname: '밤산책',
    authorAnimalType: '🐱',
    createdAt: '1주 전',
    gatheringId: 'g1',
    gatheringTitle: '느린 오후의 재즈 감상 모임',
    type: 'PHOTO',
    imageUrl: '/home/home-2.png',
    content: '퇴근하고 가볍게 다녀오기 딱 좋았어요. 음악도 좋고 공간도 아늑했어요.',
    likeCount: 9,
    isLikedByMe: false,
    isMyReview: true,
  },
  {
    id: 'mr2',
    authorNickname: '밤산책',
    authorAnimalType: '🐱',
    createdAt: '1주 전',
    gatheringId: 'g3',
    gatheringTitle: '퇴근 후 오일파스텔 드로잉',
    type: 'TEXT',
    content: '손이 어색했지만 결과물은 마음에 듭니다. 선생님이 친절하게 도와주셔서 좋았어요.',
    likeCount: 14,
    isLikedByMe: false,
    isMyReview: true,
  },
  {
    id: 'mr3',
    authorNickname: '밤산책',
    authorAnimalType: '🐱',
    createdAt: '3주 전',
    gatheringId: 'g2',
    gatheringTitle: '성수동 에스프레소 투어',
    type: 'PHOTO',
    imageUrl: '/home/home-4.png',
    content: '커피 종류별 비교가 흥미로웠어요. 다음엔 꼭 친구랑 같이 가고 싶어요.',
    likeCount: 18,
    isLikedByMe: false,
    isMyReview: true,
  },
]

type SortType = 'latest' | 'recommended'
const PAGE_SIZE = 4

export default function MyReviewList() {
  const { isLoggedIn } = useAuthStore()
  const [sort, setSort] = useState<SortType>('latest')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [toast, setToast] = useState<string | null>(null)

  const sorted = sort === 'recommended'
    ? [...MOCK_MY_REVIEWS].sort((a, b) => b.likeCount - a.likeCount)
    : MOCK_MY_REVIEWS

  const visible = sorted.slice(0, visibleCount)
  const hasMore = visibleCount < sorted.length

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  if (MOCK_MY_REVIEWS.length === 0) {
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
          key={review.id}
          review={review}
          isLoggedIn={isLoggedIn}
          showGatheringTitle
          onToast={showToast}
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
