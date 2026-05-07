'use client'

import { useState } from 'react'
import ReviewCard from './ReviewCard'
import { useAuthStore } from '@/lib/store/authStore'
import type { ReviewItem } from '@/lib/api/types'

const MOCK_ALL_REVIEWS: ReviewItem[] = [
  {
    id: 'a1',
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
    id: 'a2',
    authorNickname: '골목길고양이',
    authorAnimalType: '🐼',
    createdAt: '2일 전',
    gatheringId: 'g2',
    gatheringTitle: '성수동 에스프레소 투어',
    type: 'TEXT',
    content: '커피 종류별 비교가 흥미로웠어요. 다음엔 꼭 친구랑 같이 가고 싶음.',
    likeCount: 18,
    isLikedByMe: false,
    isMyReview: false,
  },
  {
    id: 'a3',
    authorNickname: '뜨거운라떼',
    authorAnimalType: '🐶',
    createdAt: '4일 전',
    gatheringId: 'g2',
    gatheringTitle: '성수동 에스프레소 투어',
    type: 'PHOTO',
    imageUrl: '/home/home-3.png',
    content: '바리스타분 설명이 너무 친절했어요! 좋아하는 커피가 뭔지 알게 됐어요.',
    likeCount: 7,
    isLikedByMe: false,
    isMyReview: false,
  },
  {
    id: 'a4',
    authorNickname: '밤산책',
    authorAnimalType: '🐱',
    createdAt: '1주 전',
    gatheringId: 'g3',
    gatheringTitle: '퇴근 후 오일파스텔 드로잉',
    type: 'TEXT',
    content: '손이 어색했지만 결과물은 마음에 듭니다. 선생님이 옆에서 도와주셔서 완성할 수 있었어요.',
    likeCount: 14,
    isLikedByMe: false,
    isMyReview: false,
  },
  {
    id: 'a5',
    authorNickname: '노을빛',
    authorAnimalType: '🦊',
    createdAt: '1주 전',
    gatheringId: 'g3',
    gatheringTitle: '퇴근 후 오일파스텔 드로잉',
    type: 'PHOTO',
    imageUrl: '/home/home-4.png',
    content: '드로잉 살롱 분위기 진짜 따뜻했어요. 혼자 갔는데 전혀 어색하지 않았어요.',
    likeCount: 21,
    isLikedByMe: false,
    isMyReview: false,
  },
  {
    id: 'a6',
    authorNickname: '책읽는토끼',
    authorAnimalType: '🐰',
    createdAt: '2주 전',
    gatheringId: 'g4',
    gatheringTitle: '주말 아침 독서 모임',
    type: 'TEXT',
    content: '책 한 권을 다 같이 이야기하니 다른 시각이 보여서 좋았어요. 읽은 책이 달라 보였어요.',
    likeCount: 16,
    isLikedByMe: false,
    isMyReview: false,
  },
  {
    id: 'a7',
    authorNickname: '재즈러버',
    authorAnimalType: '🦊',
    createdAt: '3주 전',
    gatheringId: 'g5',
    gatheringTitle: '을지로 LP바 투어',
    type: 'PHOTO',
    imageUrl: '/home/home-5.png',
    content: '세 곳을 돌았는데 마지막 가게가 제일 좋았어요. 분위기에 취해 시간 가는 줄 몰랐어요.',
    likeCount: 32,
    isLikedByMe: false,
    isMyReview: false,
  },
  {
    id: 'a8',
    authorNickname: '민트초코',
    authorAnimalType: '🐻',
    createdAt: '한 달 전',
    gatheringId: 'g6',
    gatheringTitle: '홈베이킹 클래스',
    type: 'TEXT',
    content: '다음엔 마들렌 도전! 생각보다 쉽게 만들 수 있다는 걸 알았어요.',
    likeCount: 19,
    isLikedByMe: false,
    isMyReview: false,
  },
]

type SortType = 'latest' | 'recommended'
const PAGE_SIZE = 5

export default function AllReviewList() {
  const { isLoggedIn } = useAuthStore()
  const [sort, setSort] = useState<SortType>('latest')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [toast, setToast] = useState<string | null>(null)

  const sorted = sort === 'recommended'
    ? [...MOCK_ALL_REVIEWS].sort((a, b) => b.likeCount - a.likeCount)
    : MOCK_ALL_REVIEWS

  const visible = sorted.slice(0, visibleCount)
  const hasMore = visibleCount < sorted.length

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
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

      {/* 비로그인 추천 토스트 */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-foreground/90 text-white text-sm px-4 py-2.5 rounded-full shadow-lg z-50 whitespace-nowrap pointer-events-none">
          {toast}
        </div>
      )}
    </div>
  )
}
