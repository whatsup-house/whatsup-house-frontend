'use client'

import { useRef, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { ChevronDown } from 'lucide-react'
import { useTranslations } from 'next-intl'
import ReviewCard from './ReviewCard'
import { useAuthStore } from '@/lib/store/authStore'
import { useAllReviews, useReviewLocate } from '@/lib/hooks/useReview'
import { useGatheringsAll } from '@/lib/hooks/useGatherings'

type SortType = 'LIKES' | 'LATEST'

function GatheringDropdown({ value, onChange, options }: {
  value: string
  onChange: (id: string) => void
  options: Array<{ id: string; title: string }>
}) {
  const t = useTranslations('review')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const allOptions = [{ id: 'all', title: t('allGatherings') }, ...options]
  const current = allOptions.find((g) => g.id === value)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative min-w-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-fit items-center gap-1.5 px-3 py-2 rounded-full border border-tag-bg/60 bg-card text-sm font-semibold text-tag-text max-w-[220px]"
      >
        <span className="truncate">{current?.title ?? t('allGatherings')}</span>
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
  const t = useTranslations('pagination')
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-center gap-1 py-5">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page === 0}
        aria-label={t('previous')}
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
        aria-label={t('next')}
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
  const t = useTranslations('review')
  const { isLoggedIn } = useAuthStore()
  const searchParams = useSearchParams()
  const highlightId = searchParams.get('highlight')
  const gatheringParam = searchParams.get('gathering')
  const [sort, setSort] = useState<SortType>('LIKES')
  const [gatheringId, setGatheringId] = useState<string | undefined>(gatheringParam ?? undefined)
  const [page, setPage] = useState(0)
  const [toast, setToast] = useState<string | null>(null)
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set())
  const [locateApplied, setLocateApplied] = useState(false)

  const { data: gatheringsData } = useGatheringsAll()
  const { data, isLoading } = useAllReviews(sort, page, gatheringId)
  const { data: locateData } = useReviewLocate(highlightId ?? undefined, sort, gatheringId, !!highlightId)

  const gatheringOptions = (gatheringsData ?? []).map((g) => ({ id: g.id, title: g.title }))
  const gatheringTitleById = new Map(gatheringOptions.map((g) => [g.id, g.title]))

  // locate 결과로 해당 리뷰가 위치한 페이지로 1회 이동 (렌더 타임 조건부 setState)
  // 미존재·미배포 시 locateData가 없어 현재 페이지를 유지한다
  if (!locateApplied && locateData?.page != null) {
    setLocateApplied(true)
    if (locateData.page !== page) setPage(locateData.page)
  }

  // 데이터 로드 후 highlight 리뷰로 스크롤 (해당 페이지에 존재할 때만)
  useEffect(() => {
    if (!highlightId) return
    const el = document.getElementById(`review-${highlightId}`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [highlightId, data])

  const reviews = (data?.content ?? []).filter((r) => !deletedIds.has(r.reviewId))
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
      {/* 필터 바: 게더링 드롭다운 + 정렬 탭 */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="min-w-0">
          <GatheringDropdown
            value={gatheringId ?? 'all'}
            onChange={handleGathering}
            options={gatheringOptions}
          />
        </div>
        <div className="flex gap-2 shrink-0">
          {(['LIKES', 'LATEST'] as const).map((s) => (
            <button
              key={s}
              onClick={() => handleSort(s)}
              className={`px-2.5 py-1.5 text-sm font-medium rounded-full transition-colors ${
                sort === s ? 'bg-primary text-white' : 'bg-tag-bg text-tag-text'
              }`}
            >
              {s === 'LIKES' ? t('sort.likes') : t('sort.latest')}
            </button>
          ))}
        </div>
      </div>

      {/* 로딩 */}
      {isLoading && (
        <p className="py-8 text-center text-sm text-tag-text">{t('loading')}</p>
      )}

      {/* 빈 상태 */}
      {!isLoading && reviews.length === 0 && (
        <p className="py-8 text-center text-sm text-tag-text">
          {t('empty')}
        </p>
      )}

      {/* 카드 목록 */}
      {reviews.map((review) => (
        <div key={review.reviewId} id={`review-${review.reviewId}`}>
          <ReviewCard
            review={{
              ...review,
              gatheringTitle: review.gatheringTitle ?? gatheringTitleById.get(review.gatheringId),
            }}
            isLoggedIn={isLoggedIn}
            showGatheringTitle
            onToast={showToast}
            onDeleted={() => setDeletedIds((prev) => new Set([...prev, review.reviewId]))}
          />
        </div>
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
