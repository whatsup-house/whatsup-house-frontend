'use client'

import { useState } from 'react'
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
    content: '오랜만에 깊은 대화를 나눴어요. 사장님이 추천해주신 LP가 진짜 좋았고 같이 간 분들도 다들 편안한 분위기였어요.',
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
    content: '생각보다 분위기가 너무 편해서 놀랐습니다. 처음 봤는데 다들 친절하셨어요.',
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
  const [liked, setLiked] = useState(review.isLikedByMe)
  const [likeCount, setLikeCount] = useState(review.likeCount)

  const handleLike = () => {
    if (!isLoggedIn) { onToast('로그인이 필요한 기능이에요'); return }
    setLiked((prev) => !prev)
    setLikeCount((c) => (liked ? c - 1 : c + 1))
  }

  return (
    <div className="flex-none w-[200px] bg-card rounded-2xl border border-tag-bg/40 overflow-hidden snap-start">
      {/* 상단: 사진 or 이모지 */}
      <div className="relative w-full aspect-square bg-tag-bg">
        {review.type === 'PHOTO' && review.imageUrl ? (
          <img
            src={review.imageUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-4xl">
            {review.authorAnimalType}
          </div>
        )}
      </div>

      {/* 하단 텍스트 */}
      <div className="p-3">
        <div className="flex items-center gap-1.5 mb-1.5">
          <span className="text-[11px] font-semibold text-foreground truncate">
            {review.authorNickname}
          </span>
          <span className="text-[9px] text-tag-text shrink-0">{review.createdAt}</span>
        </div>
        <p className="text-xs text-tag-text leading-relaxed line-clamp-3 mb-2">
          {review.content}
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

export default function ReviewListSection() {
  const { isLoggedIn } = useAuthStore()
  const [toast, setToast] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  return (
    <div className="relative">
      {/* 가로 스크롤 카드 목록 */}
      <div className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-1 -mx-4 px-4">
        {MOCK_REVIEWS.map((review) => (
          <ReviewCardCompact
            key={review.id}
            review={review}
            isLoggedIn={isLoggedIn}
            onToast={showToast}
          />
        ))}
      </div>

      {/* 비로그인 토스트 */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-foreground/90 text-white text-sm px-4 py-2.5 rounded-full shadow-lg z-50 whitespace-nowrap pointer-events-none">
          {toast}
        </div>
      )}
    </div>
  )
}
