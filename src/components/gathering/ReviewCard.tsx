'use client'

import { useState } from 'react'
import { MoreVertical } from 'lucide-react'
import type { ReviewItem } from '@/lib/api/types'

interface ReviewCardProps {
  review: ReviewItem
  isLoggedIn: boolean
  showGatheringTitle?: boolean
  onToast: (msg: string) => void
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width="16"
      height="16"
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

export default function ReviewCard({
  review,
  isLoggedIn,
  showGatheringTitle = false,
  onToast,
}: ReviewCardProps) {
  const [liked, setLiked] = useState(review.isLikedByMe)
  const [likeCount, setLikeCount] = useState(review.likeCount)

  const handleLike = () => {
    if (!isLoggedIn) {
      onToast('로그인이 필요한 기능이에요')
      return
    }
    setLiked((prev) => !prev)
    setLikeCount((c) => (liked ? c - 1 : c + 1))
  }

  return (
    <div className="bg-card rounded-card border border-tag-bg/40 shadow-sm overflow-hidden mb-3.5">
      {/* 헤더: 아바타, 닉네임, 타입 배지 */}
      <div className="flex items-center gap-2.5 px-4 pt-3.5 pb-2.5">
        <div className="w-9 h-9 rounded-full bg-tag-bg flex items-center justify-center text-lg shrink-0">
          {review.authorAnimalType}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-sm font-bold text-foreground truncate">{review.authorNickname}</span>
            <span
              className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-md shrink-0 ${
                review.type === 'PHOTO'
                  ? 'bg-primary-light text-primary'
                  : 'bg-tag-bg text-tag-text'
              }`}
            >
              {review.type === 'PHOTO' ? '📷 사진' : 'T 텍스트'}
            </span>
          </div>
          <p className="text-[11px] text-tag-text">{review.createdAt} 작성</p>
        </div>
        {review.isMyReview && (
          <button
            className="p-1 min-w-[32px] min-h-[32px] flex items-center justify-center"
            aria-label="더보기"
          >
            <MoreVertical size={18} className="text-tag-text" />
          </button>
        )}
      </div>

      {/* 게더링 제목 칩 (전체 후기 모드) */}
      {showGatheringTitle && (
        <div className="mx-4 mb-3">
          <div className="flex items-center gap-1.5 bg-tag-bg rounded-[10px] px-3 py-2">
            <div className="w-0.5 h-3.5 bg-primary rounded-full shrink-0" />
            <span className="text-xs font-semibold text-foreground truncate">
              {review.gatheringTitle}
            </span>
          </div>
        </div>
      )}

      {/* 사진 (PHOTO 타입에 imageUrl이 있을 때만) */}
      {review.type === 'PHOTO' && review.imageUrl && (
        <div className="px-4 pb-3">
          <img
            src={review.imageUrl}
            alt=""
            className="w-full aspect-[4/3] object-cover rounded-card"
          />
        </div>
      )}

      {/* 본문 */}
      <p className="px-5 pb-3.5 text-sm text-tag-text leading-relaxed">{review.content}</p>

      {/* 하단: 추천 버튼 */}
      <div className="border-t border-tag-bg/60 px-4 py-2.5">
        <button
          onClick={handleLike}
          className="flex items-center gap-1.5 min-h-[36px]"
          aria-label={liked ? '추천 취소' : '추천'}
        >
          <HeartIcon filled={liked} />
          <span className={`text-sm font-medium ${liked ? 'text-primary' : 'text-tag-text'}`}>
            {likeCount}
          </span>
        </button>
      </div>
    </div>
  )
}
