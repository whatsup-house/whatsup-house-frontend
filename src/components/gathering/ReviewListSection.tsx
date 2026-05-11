'use client'

import { useState } from 'react'
import { useAuthStore } from '@/lib/store/authStore'
import { useMyApplicationsMe } from '@/lib/hooks/useApplications'
import ReviewWriteForm from './ReviewWriteForm'
import type { ReviewItem } from '@/lib/api/types'

const MOCK_REVIEWS: ReviewItem[] = [
  {
    id: 'r1',
    authorNickname: '예림',
    authorAnimalType: '🦊',
    createdAt: '3일 전',
    gatheringId: 'c2000000-0000-0000-0000-000000000001',
    gatheringTitle: '퇴근 게더링',
    type: 'PHOTO',
    imageUrl: '/review/review1.JPG',
    content: '퇴근하고 팜팜발리에서 처음 만난 분들인데 이렇게 편안할 줄 몰랐어요. 2시간이 어떻게 지나갔는지 모를 정도였어요.',
    likeCount: 24,
    isLikedByMe: false,
    isMyReview: false,
  },
  {
    id: 'r2',
    authorNickname: '지은이',
    authorAnimalType: '🐻',
    createdAt: '5일 전',
    gatheringId: 'c2000000-0000-0000-0000-000000000001',
    gatheringTitle: '퇴근 게더링',
    type: 'TEXT',
    content: '혼자 가기 망설였는데 다들 너무 자연스럽게 받아줘서 금방 친해졌어요. 직장인들끼리 공감대가 엄청났습니다.',
    likeCount: 18,
    isLikedByMe: false,
    isMyReview: false,
  },
  {
    id: 'r3',
    authorNickname: '나연강',
    authorAnimalType: '🐰',
    createdAt: '1주 전',
    gatheringId: 'c2000000-0000-0000-0000-000000000003',
    gatheringTitle: '썬데이 러닝 클럽 (SRC)',
    type: 'PHOTO',
    imageUrl: '/review/review5.JPG',
    content: '혼자 달리기는 힘들었는데 함께 뛰니까 너무 즐거웠어요. 러닝 후 한강뷰 보면서 마신 커피 한 잔이 꿀맛이었어요.',
    likeCount: 31,
    isLikedByMe: false,
    isMyReview: false,
  },
  {
    id: 'r4',
    authorNickname: '도현임',
    authorAnimalType: '🐼',
    createdAt: '1주 전',
    gatheringId: 'c2000000-0000-0000-0000-000000000003',
    gatheringTitle: '썬데이 러닝 클럽 (SRC)',
    type: 'TEXT',
    content: '페이스 맞춰주는 분위기가 너무 좋았어요. 처음 오는 사람도 전혀 부담 없이 참여할 수 있어요.',
    likeCount: 14,
    isLikedByMe: false,
    isMyReview: false,
  },
  {
    id: 'r5',
    authorNickname: '수아',
    authorAnimalType: '🦊',
    createdAt: '2주 전',
    gatheringId: 'c2000000-0000-0000-0000-000000000002',
    gatheringTitle: '대학생 게더링',
    type: 'PHOTO',
    imageUrl: '/review/review3.JPG',
    content: '학교도 전공도 다른 사람들이랑 이렇게 이야기가 잘 통할 줄 몰랐어요. 비슷한 감성의 친구들을 만난 것 같아서 뿌듯했어요.',
    likeCount: 19,
    isLikedByMe: false,
    isMyReview: false,
  },
  {
    id: 'r6',
    authorNickname: '민준정',
    authorAnimalType: '🐱',
    createdAt: '2주 전',
    gatheringId: 'c2000000-0000-0000-0000-000000000002',
    gatheringTitle: '대학생 게더링',
    type: 'TEXT',
    content: '서울대입구역 근처에서 이런 모임이 있는 줄 몰랐어요. 낯선 사람들과 이렇게 쉽게 친해질 수 있다는 게 신기했어요.',
    likeCount: 9,
    isLikedByMe: false,
    isMyReview: false,
  },
  {
    id: 'r7',
    authorNickname: '재원송',
    authorAnimalType: '🐻',
    createdAt: '3주 전',
    gatheringId: 'c2000000-0000-0000-0000-000000000004',
    gatheringTitle: '경찰과 도둑',
    type: 'PHOTO',
    imageUrl: '/review/review2.JPG',
    content: '어른이 되고 이런 게임을 할 줄 몰랐어요. 보라매공원 넓은 곳에서 뛰어다니니까 너무 재밌고 팀원들이랑 빠르게 친해졌어요.',
    likeCount: 27,
    isLikedByMe: false,
    isMyReview: false,
  },
  {
    id: 'r8',
    authorNickname: '태양오',
    authorAnimalType: '🐰',
    createdAt: '3주 전',
    gatheringId: 'c2000000-0000-0000-0000-000000000004',
    gatheringTitle: '경찰과 도둑',
    type: 'TEXT',
    content: '진짜 어릴 때로 돌아간 기분이었어요. 게임 끝나고 다 같이 아이스크림 먹으러 간 게 제일 좋았던 것 같아요.',
    likeCount: 11,
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

interface ReviewListSectionProps {
  gatheringId?: string
  mileageReward?: number
}

export default function ReviewListSection({ gatheringId, mileageReward }: ReviewListSectionProps) {
  const { isLoggedIn } = useAuthStore()
  const [toast, setToast] = useState<string | null>(null)

  const { data: attendedApps } = useMyApplicationsMe('ATTENDED', isLoggedIn)
  const hasAttended = gatheringId
    ? (attendedApps?.some((app) => app.gathering.id === gatheringId) ?? false)
    : false

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

      {/* ATTENDED 유저 후기 작성 폼 */}
      {hasAttended && gatheringId && (
        <ReviewWriteForm gatheringId={gatheringId} mileageReward={mileageReward} />
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
