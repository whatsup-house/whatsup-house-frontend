'use client'

import { useRef, useState, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import ReviewCard from './ReviewCard'
import { useAuthStore } from '@/lib/store/authStore'
import { useAllReviews } from '@/lib/hooks/useReview'
import { useGatheringsAll } from '@/lib/hooks/useGatherings'

type SortType = 'LIKES' | 'LATEST'

function GatheringDropdown({ value, onChange, options }: {
  value: string
  onChange: (id: string) => void
  options: Array<{ id: string; title: string }>
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const allOptions = [{ id: 'all', title: '전체 게더링' }, ...options]
  const current = allOptions.find((g) => g.id === value)

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
        <div className="absolute top-[calc(100%+6px)] left-0 z-40 min-w-[200px] max-h-[300px] overflow-y-auto bg-card rounded-2xl border border-tag-bg/50 shadow-lg overflow-hidden">
          {allOptions.map((g, i) => (
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
  const { isLoggedIn, userId } = useAuthStore()
  const [sort, setSort] = useState<SortType>('LIKES')
  const [gatheringId, setGatheringId] = useState<string | undefined>(undefined)
  const [myReviewOnly, setMyReviewOnly] = useState(false)
  const [page, setPage] = useState(0)
  const [toast, setToast] = useState<string | null>(null)
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set())

  const { data: gatheringsData } = useGatheringsAll()
  const { data, isLoading } = useAllReviews(sort, page, gatheringId)

  const gatheringOptions = (gatheringsData ?? []).map((g) => ({ id: g.id, title: g.title }))

  const allReviews = (data?.content ?? []).filter((r) => !deletedIds.has(r.reviewId))
  const reviews = myReviewOnly ? allReviews.filter((r) => r.userId === userId) : allReviews
  const totalPages = data?.totalPages ?? 0

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  const handleSort = (s: SortType) => {
    setSort(s)
    setPage(0)
  }

  const handleGathering = (id: string) => {
    setGatheringId(id === 'all' ? undefined : id)
    setPage(0)
  }

  const handlePage = (p: number) => {
    setPage(p)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="relative px-4 py-5">
      {/* 헤더 */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-1 h-5 bg-primary rounded-full" />
        <h1 className="text-base font-bold text-foreground">전체 후기</h1>
      </div>

      {/* 필터 바: 게더링 드롭다운(좌) + 정렬 탭(우) */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <GatheringDropdown
          value={gatheringId ?? 'all'}
          onChange={handleGathering}
          options={gatheringOptions}
        />
        <div className="flex gap-2 shrink-0">
          {(['LIKES', 'LATEST'] as const).map((s) => (
            <button
              key={s}
              onClick={() => handleSort(s)}
              className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
                sort === s ? 'bg-primary text-white' : 'bg-tag-bg text-tag-text'
              }`}
            >
              {s === 'LIKES' ? '추천순' : '최신순'}
            </button>
          ))}
        </div>
      </div>

      {/* 내 후기만 필터 (로그인 시) */}
      {isLoggedIn && (
        <div className="mb-4">
          <button
            onClick={() => setMyReviewOnly((o) => !o)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors ${
              myReviewOnly
                ? 'bg-primary text-white border-primary'
                : 'bg-card text-tag-text border-tag-bg/60'
            }`}
          >
            내 후기만
          </button>
        </div>
      )}

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

      {/* 카드 목록 */}
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
      <Pagination page={page} totalPages={totalPages} onChange={handlePage} />

      {/* 토스트 */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-foreground/90 text-white text-sm px-4 py-2.5 rounded-full shadow-lg z-50 whitespace-nowrap pointer-events-none">
          {toast}
        </div>
      )}
    </div>
  )
}
