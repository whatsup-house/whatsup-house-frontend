'use client'

import { useState } from 'react'
import ReviewCard from './ReviewCard'
import { useAuthStore } from '@/lib/store/authStore'
import type { ReviewItem } from '@/lib/api/types'

const MOCK_REVIEWS: ReviewItem[] = [
  {
    id: 'r1',
    authorNickname: '재즈러버',
    authorAnimalType: '🦊',
    createdAt: '3일 전',
    gatheringId: 'g1',
    gatheringTitle: '느린 오후의 재즈 감상 모임',
    type: 'PHOTO',
    imageUrl: '/home/home-1.png',
    content: '오랜만에 깊은 대화를 나눴어요. 사장님이 추천해주신 LP가 진짜 좋았고 같이 간 분들도 다들 편안한 분위기였어요. 다음에도 또 가고 싶어요!',
    likeCount: 24,
    isLikedByMe: false,
    isMyReview: false,
  },
  {
    id: 'r2',
    authorNickname: '민트초코',
    authorAnimalType: '🐻',
    createdAt: '5일 전',
    gatheringId: 'g1',
    gatheringTitle: '느린 오후의 재즈 감상 모임',
    type: 'TEXT',
    content: '생각보다 분위기가 너무 편해서 놀랐습니다 ☺️ 처음 봤는데 다들 친절하셨어요.',
    likeCount: 12,
    isLikedByMe: false,
    isMyReview: false,
  },
  {
    id: 'r3',
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
    id: 'r4',
    authorNickname: '노을빛',
    authorAnimalType: '🦊',
    createdAt: '1주 전',
    gatheringId: 'g1',
    gatheringTitle: '느린 오후의 재즈 감상 모임',
    type: 'TEXT',
    content: '드로잉 살롱 분위기 진짜 따뜻했어요. 혼자 갔는데 전혀 어색하지 않았고 좋은 분들과 이야기 나눴어요.',
    likeCount: 21,
    isLikedByMe: false,
    isMyReview: false,
  },
  {
    id: 'r5',
    authorNickname: '한낮의산책',
    authorAnimalType: '🐰',
    createdAt: '2주 전',
    gatheringId: 'g1',
    gatheringTitle: '느린 오후의 재즈 감상 모임',
    type: 'PHOTO',
    imageUrl: '/home/home-3.png',
    content: '커피 한 잔 마시며 천천히 읽는 시간. 이런 모임이 또 있으면 꼭 다시 오고 싶어요.',
    likeCount: 11,
    isLikedByMe: false,
    isMyReview: false,
  },
  {
    id: 'r6',
    authorNickname: '고소한아메',
    authorAnimalType: '🐼',
    createdAt: '3주 전',
    gatheringId: 'g1',
    gatheringTitle: '느린 오후의 재즈 감상 모임',
    type: 'TEXT',
    content: '시끌벅적했지만 그게 또 매력. 사람들이랑 어울리는 게 즐거웠어요.',
    likeCount: 5,
    isLikedByMe: false,
    isMyReview: false,
  },
]

type SortType = 'latest' | 'recommended'
const PAGE_SIZE = 4

export default function ReviewListSection() {
  const { isLoggedIn } = useAuthStore()
  const [sort, setSort] = useState<SortType>('latest')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [toast, setToast] = useState<string | null>(null)

  const sorted = sort === 'recommended'
    ? [...MOCK_REVIEWS].sort((a, b) => b.likeCount - a.likeCount)
    : MOCK_REVIEWS

  const visible = sorted.slice(0, visibleCount)
  const hasMore = visibleCount < sorted.length

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  return (
    <div className="relative">
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

      {/* 카드 목록 */}
      {visible.map((review) => (
        <ReviewCard
          key={review.id}
          review={review}
          isLoggedIn={isLoggedIn}
          onToast={showToast}
        />
      ))}

      {/* 더보기 버튼 */}
      {hasMore && (
        <button
          onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
          className="w-full py-3 text-sm font-medium text-tag-text border border-tag-bg rounded-card mb-4"
        >
          후기 더보기
        </button>
      )}

      {/* 후기 작성 버튼 (API 연결 후 ATTENDED 조건으로 교체) */}
      <button className="w-full py-3 bg-primary text-white text-sm font-bold rounded-card">
        후기 작성하기
      </button>

      {/* 비로그인 토스트 */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-foreground/90 text-white text-sm px-4 py-2.5 rounded-full shadow-lg z-50 whitespace-nowrap pointer-events-none">
          {toast}
        </div>
      )}
    </div>
  )
}
