'use client'

import { useRef, useState, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import ReviewCard from './ReviewCard'
import { useAuthStore } from '@/lib/store/authStore'
import type { ReviewItem } from '@/lib/api/types'

const MOCK_ALL_REVIEWS: ReviewItem[] = [
  // 퇴근 게더링
  { id: 'a1',  authorNickname: '예림',    authorAnimalType: '🦊', createdAt: '2일 전',   gatheringId: 'c2000000-0000-0000-0000-000000000001', gatheringTitle: '퇴근 게더링',          type: 'PHOTO', imageUrl: '/review/review1.JPG', content: '퇴근하고 팜팜발리에서 처음 만난 분들인데 이렇게 편안할 줄 몰랐어요. 2시간이 어떻게 지나갔는지 모를 정도였어요.',                           likeCount: 24, isLikedByMe: false, isMyReview: false },
  { id: 'a2',  authorNickname: '지은이',  authorAnimalType: '🐻', createdAt: '4일 전',   gatheringId: 'c2000000-0000-0000-0000-000000000001', gatheringTitle: '퇴근 게더링',          type: 'TEXT',                                 content: '혼자 가기 망설였는데 다들 너무 자연스럽게 받아줘서 금방 친해졌어요. 직장인들끼리 공감대가 엄청났습니다.',                                   likeCount: 18, isLikedByMe: false, isMyReview: false },
  { id: 'a3',  authorNickname: '서현우',  authorAnimalType: '🐱', createdAt: '1주 전',   gatheringId: 'c2000000-0000-0000-0000-000000000001', gatheringTitle: '퇴근 게더링',          type: 'PHOTO', imageUrl: '/review/review4.JPG', content: '회사 끝나고 갈까 말까 고민하다 갔는데 진짜 잘 갔어요. 다음 달에 또 신청했어요!',                                                         likeCount: 35, isLikedByMe: false, isMyReview: false },
  { id: 'a4',  authorNickname: '하늘빛',  authorAnimalType: '🐶', createdAt: '1주 전',   gatheringId: 'c2000000-0000-0000-0000-000000000001', gatheringTitle: '퇴근 게더링',          type: 'TEXT',                                 content: '처음에는 어색할 줄 알았는데 팜팜발리 공간이 너무 아늑해서 금방 편해졌어요. 분위기 맛집이에요.',                                               likeCount: 12, isLikedByMe: false, isMyReview: false },
  { id: 'a5',  authorNickname: '민서',    authorAnimalType: '🦊', createdAt: '2주 전',   gatheringId: 'c2000000-0000-0000-0000-000000000001', gatheringTitle: '퇴근 게더링',          type: 'PHOTO', imageUrl: '/review/review6.JPG', content: '평일 저녁에 이런 모임이 있다는 게 너무 좋아요. 퇴근 후 활력이 생기는 느낌!',                                                              likeCount: 21, isLikedByMe: false, isMyReview: false },
  // 썬데이 러닝 클럽
  { id: 'a6',  authorNickname: '나연강',  authorAnimalType: '🐰', createdAt: '3일 전',   gatheringId: 'c2000000-0000-0000-0000-000000000003', gatheringTitle: '썬데이 러닝 클럽 (SRC)', type: 'PHOTO', imageUrl: '/review/review5.JPG', content: '혼자 달리기는 힘들었는데 함께 뛰니까 너무 즐거웠어요. 러닝 후 한강뷰 보면서 마신 커피 한 잔이 꿀맛이었어요.',                           likeCount: 31, isLikedByMe: false, isMyReview: false },
  { id: 'a7',  authorNickname: '도현임',  authorAnimalType: '🐶', createdAt: '5일 전',   gatheringId: 'c2000000-0000-0000-0000-000000000003', gatheringTitle: '썬데이 러닝 클럽 (SRC)', type: 'TEXT',                                 content: '페이스 맞춰주는 분위기가 너무 좋았어요. 처음 오는 사람도 전혀 부담 없이 참여할 수 있어요.',                                                  likeCount: 14, isLikedByMe: false, isMyReview: false },
  { id: 'a8',  authorNickname: '준혁',    authorAnimalType: '🐻', createdAt: '1주 전',   gatheringId: 'c2000000-0000-0000-0000-000000000003', gatheringTitle: '썬데이 러닝 클럽 (SRC)', type: 'PHOTO', imageUrl: '/review/review2.JPG', content: '일요일 아침을 이렇게 보낸 적이 없었어요. 러닝하고 나서 몸도 마음도 가뿐해졌어요.',                                                          likeCount: 28, isLikedByMe: false, isMyReview: false },
  { id: 'a9',  authorNickname: '이슬비',  authorAnimalType: '🐱', createdAt: '2주 전',   gatheringId: 'c2000000-0000-0000-0000-000000000003', gatheringTitle: '썬데이 러닝 클럽 (SRC)', type: 'TEXT',                                 content: '5km 완주는 처음이었는데 옆에서 응원해줘서 포기 안 하고 끝까지 뛸 수 있었어요. 감동이었어요.',                                                 likeCount: 22, isLikedByMe: false, isMyReview: false },
  { id: 'a10', authorNickname: '강태풍',  authorAnimalType: '🦊', createdAt: '2주 전',   gatheringId: 'c2000000-0000-0000-0000-000000000003', gatheringTitle: '썬데이 러닝 클럽 (SRC)', type: 'PHOTO', imageUrl: '/review/review3.JPG', content: '한강에서 뛰고 같이 스트레칭까지. 몸도 사람도 다 좋았습니다.',                                                                              likeCount: 17, isLikedByMe: false, isMyReview: false },
  // 대학생 게더링
  { id: 'a11', authorNickname: '수아',    authorAnimalType: '🦊', createdAt: '1일 전',   gatheringId: 'c2000000-0000-0000-0000-000000000002', gatheringTitle: '대학생 게더링',         type: 'PHOTO', imageUrl: '/review/review3.JPG', content: '학교도 전공도 다른 사람들이랑 이렇게 이야기가 잘 통할 줄 몰랐어요. 비슷한 감성의 친구들을 만난 것 같아서 뿌듯했어요.',                  likeCount: 19, isLikedByMe: false, isMyReview: false },
  { id: 'a12', authorNickname: '민준정',  authorAnimalType: '🐱', createdAt: '3일 전',   gatheringId: 'c2000000-0000-0000-0000-000000000002', gatheringTitle: '대학생 게더링',         type: 'TEXT',                                 content: '서울대입구역 근처에서 이런 모임이 있는 줄 몰랐어요. 낯선 사람들과 이렇게 쉽게 친해질 수 있다는 게 신기했어요.',                               likeCount: 9,  isLikedByMe: false, isMyReview: false },
  { id: 'a13', authorNickname: '하준혜',  authorAnimalType: '🐰', createdAt: '1주 전',   gatheringId: 'c2000000-0000-0000-0000-000000000002', gatheringTitle: '대학생 게더링',         type: 'PHOTO', imageUrl: '/review/review6.JPG', content: '대학생끼리만 모이니까 대화 주제가 정말 잘 맞았어요. 취업 고민도 같이 나눌 수 있어서 좋았어요.',                                              likeCount: 26, isLikedByMe: false, isMyReview: false },
  { id: 'a14', authorNickname: '채원',    authorAnimalType: '🐻', createdAt: '2주 전',   gatheringId: 'c2000000-0000-0000-0000-000000000002', gatheringTitle: '대학생 게더링',         type: 'TEXT',                                 content: '학교 밖에서 만나는 동년배들이랑 이야기하는 게 참 신선했어요. 다음에도 또 참여하고 싶어요.',                                                    likeCount: 13, isLikedByMe: false, isMyReview: false },
  { id: 'a15', authorNickname: '도윤',    authorAnimalType: '🐶', createdAt: '3주 전',   gatheringId: 'c2000000-0000-0000-0000-000000000002', gatheringTitle: '대학생 게더링',         type: 'PHOTO', imageUrl: '/review/review1.JPG', content: '처음엔 어색할 것 같았는데 금방 친해졌어요. 공통 관심사로 대화가 넘쳤던 시간이었어요.',                                                       likeCount: 8,  isLikedByMe: false, isMyReview: false },
  // 경찰과 도둑
  { id: 'a16', authorNickname: '재원송',  authorAnimalType: '🐻', createdAt: '2일 전',   gatheringId: 'c2000000-0000-0000-0000-000000000004', gatheringTitle: '경찰과 도둑',           type: 'PHOTO', imageUrl: '/review/review2.JPG', content: '어른이 되고 이런 게임을 할 줄 몰랐어요. 보라매공원 넓은 곳에서 뛰어다니니까 너무 재밌고 팀원들이랑 빠르게 친해졌어요.',                   likeCount: 27, isLikedByMe: false, isMyReview: false },
  { id: 'a17', authorNickname: '태양오',  authorAnimalType: '🐰', createdAt: '4일 전',   gatheringId: 'c2000000-0000-0000-0000-000000000004', gatheringTitle: '경찰과 도둑',           type: 'TEXT',                                 content: '진짜 어릴 때로 돌아간 기분이었어요. 게임 끝나고 다 같이 아이스크림 먹으러 간 게 제일 좋았던 것 같아요.',                                       likeCount: 11, isLikedByMe: false, isMyReview: false },
  { id: 'a18', authorNickname: '유진',    authorAnimalType: '🐱', createdAt: '1주 전',   gatheringId: 'c2000000-0000-0000-0000-000000000004', gatheringTitle: '경찰과 도둑',           type: 'PHOTO', imageUrl: '/review/review4.JPG', content: '팀 나눠서 뛰다 보니 자연스럽게 팀워크가 생겼어요. 이긴 것보다 과정이 훨씬 재밌었어요.',                                                     likeCount: 33, isLikedByMe: false, isMyReview: false },
  { id: 'a19', authorNickname: '서준',    authorAnimalType: '🦊', createdAt: '2주 전',   gatheringId: 'c2000000-0000-0000-0000-000000000004', gatheringTitle: '경찰과 도둑',           type: 'TEXT',                                 content: '이렇게 뛰어논 게 얼마만인지 모르겠어요. 스트레스가 한 방에 풀렸어요. 다음에도 꼭 오겠습니다.',                                                  likeCount: 16, isLikedByMe: false, isMyReview: false },
  { id: 'a20', authorNickname: '지아',    authorAnimalType: '🐶', createdAt: '3주 전',   gatheringId: 'c2000000-0000-0000-0000-000000000004', gatheringTitle: '경찰과 도둑',           type: 'PHOTO', imageUrl: '/review/review5.JPG', content: '공원에서 다 같이 뛰고 나서 돗자리에 앉아 얘기한 시간이 제일 좋았어요. 또 하고 싶어요!',                                                      likeCount: 20, isLikedByMe: false, isMyReview: false },
]

type SortType = 'latest' | 'recommended'
const PAGE_SIZE = 10

const GATHERING_OPTIONS = [
  { id: 'all', title: '전체 게더링' },
  ...Array.from(
    MOCK_ALL_REVIEWS.reduce((map, r) => {
      if (!map.has(r.gatheringId)) map.set(r.gatheringId, r.gatheringTitle)
      return map
    }, new Map<string, string>()),
    ([id, title]) => ({ id, title }),
  ),
]

function GatheringDropdown({ value, onChange }: {
  value: string
  onChange: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const current = GATHERING_OPTIONS.find((g) => g.id === value)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-full border border-tag-bg/60 bg-card text-sm font-semibold text-tag-text max-w-[220px]"
      >
        <span className="truncate">{current?.title ?? '전체 게더링'}</span>
        <ChevronDown size={14} className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-[calc(100%+6px)] left-0 z-40 min-w-[200px] bg-card rounded-2xl border border-tag-bg/50 shadow-lg overflow-hidden">
          {GATHERING_OPTIONS.map((g, i) => (
            <button
              key={g.id}
              onClick={() => { onChange(g.id); setOpen(false) }}
              className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors
                ${value === g.id ? 'text-primary bg-primary-light' : 'text-foreground'}
                ${i > 0 ? 'border-t border-tag-bg/40' : ''}
              `}
            >
              {g.title}
            </button>
          ))}
        </div>
      )}
    </div>
  )
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
        className="w-8 h-8 rounded-full flex items-center justify-center text-foreground bg-card shadow-sm disabled:opacity-40 disabled:bg-transparent disabled:shadow-none transition-opacity"
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
        className="w-8 h-8 rounded-full flex items-center justify-center text-foreground bg-card shadow-sm disabled:opacity-40 disabled:bg-transparent disabled:shadow-none transition-opacity"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
    </div>
  )
}

export default function AllReviewList() {
  const { isLoggedIn } = useAuthStore()
  const [sort, setSort] = useState<SortType>('recommended')
  const [gatheringId, setGatheringId] = useState('all')
  const [page, setPage] = useState(0)
  const [toast, setToast] = useState<string | null>(null)
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set())

  const available = MOCK_ALL_REVIEWS.filter((r) => !deletedIds.has(r.id))
  const filtered = gatheringId === 'all'
    ? available
    : available.filter((r) => r.gatheringId === gatheringId)

  const sorted = sort === 'recommended'
    ? [...filtered].sort((a, b) => b.likeCount - a.likeCount)
    : filtered

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE)
  const pageItems = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const handleSort = (s: SortType) => {
    setSort(s)
    setPage(0)
  }

  const handleGathering = (id: string) => {
    setGatheringId(id)
    setPage(0)
  }

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  return (
    <div className="relative px-4 py-5">
      {/* 필터 바: 게더링 드롭다운(좌) + 정렬 탭(우) */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <GatheringDropdown value={gatheringId} onChange={handleGathering} />
        <div className="flex gap-2 shrink-0">
          {(['recommended', 'latest'] as const).map((s) => (
            <button
              key={s}
              onClick={() => handleSort(s)}
              className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
                sort === s ? 'bg-primary text-white' : 'bg-tag-bg text-tag-text'
              }`}
            >
              {s === 'recommended' ? '추천순' : '최신순'}
            </button>
          ))}
        </div>
      </div>

      {/* 카드 목록 (게더링 제목 칩 포함) */}
      {pageItems.map((review) => (
        <ReviewCard
          key={review.id}
          review={review}
          isLoggedIn={isLoggedIn}
          showGatheringTitle
          onToast={showToast}
          onDeleted={() => setDeletedIds((prev) => new Set([...prev, review.id]))}
        />
      ))}

      {/* 페이지네이션 */}
      <Pagination page={page} totalPages={totalPages} onChange={setPage} />

      {/* 비로그인 추천 토스트 */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-foreground/90 text-white text-sm px-4 py-2.5 rounded-full shadow-lg z-50 whitespace-nowrap pointer-events-none">
          {toast}
        </div>
      )}
    </div>
  )
}
