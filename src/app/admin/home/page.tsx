'use client'

import { useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  ImageIcon,
  EyeOff,
  Heart,
  Pencil,
  Plus,
  Star,
  Trash2,
  X,
} from 'lucide-react'
import { useAdminCarouselSlides } from '@/lib/hooks/useAdminHeroCarousel'
import {
  useAdminHomeReviews,
  useAdminHomeReviewCandidates,
  useReorderHomeReviews,
  useSetReviewHomeFeatured,
  useDeleteHomeReview,
} from '@/lib/hooks/useAdminHomeReview'
import { HeroCarouselFormPanel } from '@/components/admin/HeroCarouselFormPanel'
import { LoadingSpinner, Pagination } from '@/components/ui'
import type {
  AdminHeroCarouselSlide,
  AdminHomeReview,
  AdminHomeReviewSort,
  HeroSlideType,
} from '@/lib/api/types'

const TYPE_LABEL: Record<HeroSlideType, string> = {
  GATHERING: '게더링',
  CALENDAR: '일정',
  STORY: '스토리',
}

const TYPE_COLOR: Record<HeroSlideType, string> = {
  GATHERING: 'bg-primary text-white',
  CALENDAR: 'bg-blue-500 text-white',
  STORY: 'bg-tag-bg text-tag-text',
}

const CANDIDATE_PAGE_SIZE = 10

export default function AdminHomePage() {
  const [carouselPanel, setCarouselPanel] = useState<AdminHeroCarouselSlide | 'new' | null>(null)
  const [reviewPanelOpen, setReviewPanelOpen] = useState(false)
  const [candidateSort, setCandidateSort] = useState<AdminHomeReviewSort>('LATEST')
  const [candidatePage, setCandidatePage] = useState(0)

  const { data: slides = [], isLoading: slidesLoading, isError: slidesError } = useAdminCarouselSlides()
  const { data: reviews = [], isLoading: reviewsLoading, isError: reviewsError } = useAdminHomeReviews()
  const {
    data: reviewCandidates = [],
    isLoading: candidatesLoading,
    isError: candidatesError,
  } = useAdminHomeReviewCandidates(reviewPanelOpen)
  const {
    mutate: setFeatured,
    isPending: isSettingFeatured,
    variables: featuredVariables,
  } = useSetReviewHomeFeatured()
  const {
    mutate: reorderReviews,
    isPending: isReordering,
  } = useReorderHomeReviews()
  const { mutate: removeReview } = useDeleteHomeReview()

  const sortedSlides = [...slides].sort((a, b) => a.sortOrder - b.sortOrder)
  const sortedReviews = [...reviews].sort(
    (a, b) => (a.homeDisplayOrder ?? 0) - (b.homeDisplayOrder ?? 0),
  )
  const featuredReviewIds = new Set(reviews.map((review) => review.reviewId))
  const filteredReviewCandidates = reviewCandidates
    .filter((review) => !featuredReviewIds.has(review.reviewId))
    .sort((a, b) => {
      if (candidateSort === 'LIKES') {
        const likeDiff = b.likeCount - a.likeCount
        if (likeDiff !== 0) return likeDiff
      }
      return b.createdAt.localeCompare(a.createdAt)
    })
  const candidateTotalPages = Math.ceil(filteredReviewCandidates.length / CANDIDATE_PAGE_SIZE)
  const pagedReviewCandidates = filteredReviewCandidates.slice(
    candidatePage * CANDIDATE_PAGE_SIZE,
    (candidatePage + 1) * CANDIDATE_PAGE_SIZE,
  )
  const nextReviewDisplayOrder = Math.max(0, ...reviews.map((review) => review.homeDisplayOrder ?? 0)) + 1

  const reorderSequentially = (orderedReviews: AdminHomeReview[]) => {
    reorderReviews(
      orderedReviews.map((review, index) => ({
        reviewId: review.reviewId,
        homeDisplayOrder: index + 1,
      })),
    )
  }

  const handleOpenReviewPanel = () => {
    setCandidatePage(0)
    setReviewPanelOpen(true)
  }
  const handleCandidateSort = (sort: AdminHomeReviewSort) => {
    setCandidateSort(sort)
    setCandidatePage(0)
  }
  const handleMoveReview = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= sortedReviews.length) return

    const nextReviews = [...sortedReviews]
    const current = nextReviews[index]
    nextReviews[index] = nextReviews[targetIndex]
    nextReviews[targetIndex] = current
    reorderSequentially(nextReviews)
  }
  const handleFeature = (reviewId: string) => {
    setFeatured(
      { reviewId, data: { isHomeFeatured: true, homeDisplayOrder: nextReviewDisplayOrder } },
      { onSuccess: () => setReviewPanelOpen(false) },
    )
  }
  const handleUnfeature = (reviewId: string) => {
    setFeatured(
      { reviewId, data: { isHomeFeatured: false } },
      {
        onSuccess: () => {
          const remainingReviews = sortedReviews.filter((review) => review.reviewId !== reviewId)
          if (remainingReviews.length > 0) reorderSequentially(remainingReviews)
        },
      },
    )
  }
  const handleDelete = (reviewId: string) => {
    if (confirm('이 리뷰를 삭제할까요? (복구 불가)')) {
      removeReview(reviewId, {
        onSuccess: () => {
          const remainingReviews = sortedReviews.filter((review) => review.reviewId !== reviewId)
          if (remainingReviews.length > 0) reorderSequentially(remainingReviews)
        },
      })
    }
  }

  return (
    <div className="max-w-[1280px]">
      {/* 헤더 */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">홈화면 관리</h1>
          <p className="text-sm text-tag-text mt-1">항목을 클릭해 편집하세요</p>
        </div>
        <button
          onClick={() => setCarouselPanel('new')}
          className="flex items-center gap-1.5 self-start px-4 h-10 bg-primary text-white rounded-[12px] text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus size={15} />
          슬라이드 추가
        </button>
      </div>

      {/* 히어로 캐러셀 섹션 */}
      <section className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-[18px] rounded-full bg-primary" />
          <span className="text-[15px] font-bold text-foreground">히어로 캐러셀</span>
          <span className="text-xs text-tag-text ml-1">{sortedSlides.length}개</span>
        </div>

        {slidesLoading ? (
          <div className="flex justify-center py-12"><LoadingSpinner /></div>
        ) : slidesError ? (
          <div className="flex items-center justify-center h-32 border border-dashed border-red-200 rounded-card text-sm text-red-500">
            캐러셀을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.
          </div>
        ) : sortedSlides.length === 0 ? (
          <div className="flex items-center justify-center h-32 border border-dashed border-tag-bg rounded-card text-sm text-tag-text">
            슬라이드가 없습니다. 우측 상단 버튼으로 추가하세요.
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-hide">
            {sortedSlides.map((slide) => (
              <SlideCard key={slide.id} slide={slide} onClick={() => setCarouselPanel(slide)} />
            ))}
          </div>
        )}
      </section>

      <div className="border-t border-tag-bg mb-10" />

      {/* 홈 후기 섹션 — 실제 리뷰의 홈 노출 관리 */}
      <section>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-2">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-1 h-[18px] rounded-full bg-primary" />
              <span className="text-[15px] font-bold text-foreground">다녀온 사람들의 후기</span>
              <span className="text-xs text-tag-text ml-1">{sortedReviews.length}개 노출 중</span>
            </div>
            <p className="text-xs text-tag-text mt-2">
              홈에 노출할 실제 후기를 추가하거나 노출을 해제할 수 있습니다.
            </p>
          </div>
          <button
            onClick={handleOpenReviewPanel}
            className="inline-flex items-center justify-center gap-1.5 self-start px-4 h-10 bg-primary text-white rounded-[12px] text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Plus size={15} />
            후기 추가
          </button>
        </div>

        {reviewsLoading ? (
          <div className="flex justify-center py-12"><LoadingSpinner /></div>
        ) : reviewsError ? (
          <div className="flex items-center justify-center h-32 border border-dashed border-red-200 rounded-card text-sm text-red-500">
            후기를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.
          </div>
        ) : sortedReviews.length === 0 ? (
          <div className="flex items-center justify-center h-32 border border-dashed border-tag-bg rounded-card text-sm text-tag-text">
            홈에 노출 중인 후기가 없습니다. 리뷰 관리에서 노출을 켜주세요.
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-hide">
            {sortedReviews.map((review, index) => (
              <ReviewCard
                key={review.reviewId}
                review={review}
                displayOrder={index + 1}
                canMoveLeft={index > 0}
                canMoveRight={index < sortedReviews.length - 1}
                isReordering={isReordering}
                onMoveLeft={() => handleMoveReview(index, -1)}
                onMoveRight={() => handleMoveReview(index, 1)}
                onUnfeature={() => handleUnfeature(review.reviewId)}
                onDelete={() => handleDelete(review.reviewId)}
              />
            ))}
          </div>
        )}
      </section>

      {/* 슬라이드 폼 패널 */}
      {carouselPanel !== null && (
        <HeroCarouselFormPanel
          slide={carouselPanel === 'new' ? null : carouselPanel}
          onClose={() => setCarouselPanel(null)}
          onSuccess={() => setCarouselPanel(null)}
        />
      )}

      {reviewPanelOpen && (
        <ReviewCandidatePanel
          reviews={pagedReviewCandidates}
          isLoading={candidatesLoading}
          isError={candidatesError}
          sort={candidateSort}
          page={candidatePage}
          totalElements={filteredReviewCandidates.length}
          totalPages={candidateTotalPages}
          addingReviewId={isSettingFeatured ? featuredVariables?.reviewId ?? null : null}
          onSortChange={handleCandidateSort}
          onPageChange={setCandidatePage}
          onAdd={handleFeature}
          onClose={() => setReviewPanelOpen(false)}
        />
      )}
    </div>
  )
}

interface SlideCardProps {
  slide: AdminHeroCarouselSlide
  onClick: () => void
}

function SlideCard({ slide, onClick }: SlideCardProps) {
  return (
    <div
      onClick={onClick}
      className="group relative flex-none w-[136px] sm:w-[150px] cursor-pointer rounded-2xl overflow-hidden bg-tag-bg"
      style={{ aspectRatio: '9/16' }}
    >
      {slide.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={slide.imageUrl}
          alt={slide.title}
          className="absolute inset-0 w-full h-full object-cover"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
        />
      )}

      <div
        className="absolute inset-x-0 bottom-0 px-3 pb-3 pt-10 text-white"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.78), transparent)' }}
      >
        <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold mb-1 ${TYPE_COLOR[slide.type]}`}>
          {TYPE_LABEL[slide.type]}
        </span>
        <p className="text-[11px] font-bold leading-snug line-clamp-2">{slide.title}</p>
        {(slide.content || slide.dateLabel) && (
          <p className="text-[9px] opacity-75 mt-0.5">{slide.content ?? slide.dateLabel}</p>
        )}
      </div>

      <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-black/50 text-white text-[10px] font-bold flex items-center justify-center">
        {slide.sortOrder}
      </div>

      {!slide.isActive && (
        <div className="absolute top-2 left-2 flex items-center gap-0.5 bg-black/60 text-white rounded-full px-1.5 py-0.5 text-[9px]">
          <EyeOff size={8} />
          비노출
        </div>
      )}

      <div className="absolute inset-0 bg-primary/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <div className="bg-white rounded-full p-2.5 shadow-lg">
          <Pencil size={16} className="text-primary" />
        </div>
      </div>
    </div>
  )
}

interface ReviewCardProps {
  review: AdminHomeReview
  displayOrder: number
  canMoveLeft: boolean
  canMoveRight: boolean
  isReordering: boolean
  onMoveLeft: () => void
  onMoveRight: () => void
  onUnfeature: () => void
  onDelete: () => void
}

function ReviewCard({
  review,
  displayOrder,
  canMoveLeft,
  canMoveRight,
  isReordering,
  onMoveLeft,
  onMoveRight,
  onUnfeature,
  onDelete,
}: ReviewCardProps) {
  return (
    <div className="relative flex-none w-[176px] sm:w-[200px] bg-card rounded-2xl border border-tag-bg/40 overflow-hidden">
      {/* 리뷰 이미지 */}
      <div className="relative w-full aspect-square bg-tag-bg">
        {review.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={review.imageUrl}
            alt={review.nickname}
            className="absolute inset-0 w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-3xl">📝</div>
        )}
        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-black/50 text-white text-[10px] font-bold flex items-center justify-center">
          {displayOrder}
        </div>
      </div>

      {/* 텍스트 */}
      <div className="p-3">
        <div className="flex items-center gap-1.5 mb-1.5">
          <span className="text-[11px] font-semibold text-tag-text truncate">{review.nickname}</span>
          <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-primary bg-primary/10 rounded px-1 py-0.5 shrink-0">
            <Heart size={9} />{review.likeCount}
          </span>
        </div>
        <p className="text-[10px] text-tag-text font-medium truncate mb-1">{review.gatheringTitle}</p>
        <p className="text-xs text-tag-text leading-relaxed line-clamp-2 mb-2">{review.reviewContent}</p>

        <div className="flex gap-1.5 mb-1.5">
          <button
            type="button"
            onClick={onMoveLeft}
            disabled={!canMoveLeft || isReordering}
            title="앞으로 이동"
            aria-label="앞으로 이동"
            className="flex-1 inline-flex h-8 items-center justify-center rounded-input border border-tag-bg text-tag-text transition-colors hover:border-foreground disabled:cursor-not-allowed disabled:opacity-35"
          >
            <ArrowLeft size={13} />
          </button>
          <button
            type="button"
            onClick={onMoveRight}
            disabled={!canMoveRight || isReordering}
            title="뒤로 이동"
            aria-label="뒤로 이동"
            className="flex-1 inline-flex h-8 items-center justify-center rounded-input border border-tag-bg text-tag-text transition-colors hover:border-foreground disabled:cursor-not-allowed disabled:opacity-35"
          >
            <ArrowRight size={13} />
          </button>
        </div>

        {/* 액션 */}
        <div className="flex gap-1.5">
          <button
            onClick={onUnfeature}
            className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 text-[11px] rounded-input border border-tag-bg text-tag-text hover:border-foreground transition-colors"
          >
            <Star size={11} />
            노출 해제
          </button>
          <button
            onClick={onDelete}
            className="inline-flex items-center justify-center px-2 py-1.5 text-[11px] rounded-input border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
          >
            <Trash2 size={11} />
          </button>
        </div>
      </div>
    </div>
  )
}

interface ReviewCandidatePanelProps {
  reviews: AdminHomeReview[]
  isLoading: boolean
  isError: boolean
  sort: AdminHomeReviewSort
  page: number
  totalElements: number
  totalPages: number
  addingReviewId: string | null
  onSortChange: (sort: AdminHomeReviewSort) => void
  onPageChange: (page: number) => void
  onAdd: (reviewId: string) => void
  onClose: () => void
}

function ReviewCandidatePanel({
  reviews,
  isLoading,
  isError,
  sort,
  page,
  totalElements,
  totalPages,
  addingReviewId,
  onSortChange,
  onPageChange,
  onAdd,
  onClose,
}: ReviewCandidatePanelProps) {
  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 w-full sm:w-[520px] h-full bg-card shadow-2xl z-50 flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-tag-bg">
          <div>
            <h2 className="font-bold text-[18px] text-foreground">홈 노출 후기 추가</h2>
            <p className="text-xs text-tag-text mt-1">사용자가 작성한 실제 후기 중 미노출 항목만 표시됩니다.</p>
          </div>
          <button
            onClick={onClose}
            className="min-w-10 min-h-10 inline-flex items-center justify-center text-tag-text hover:text-foreground transition-colors"
            aria-label="닫기"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-tag-text">총 {totalElements.toLocaleString()}개</p>
            <div className="flex gap-2">
              {(['LATEST', 'LIKES'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => onSortChange(s)}
                  className={`min-h-9 rounded-full px-3 text-xs font-semibold transition-colors ${
                    sort === s ? 'bg-primary text-white' : 'bg-tag-bg text-tag-text hover:text-foreground'
                  }`}
                >
                  {s === 'LATEST' ? '최신순' : '인기순'}
                </button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12"><LoadingSpinner /></div>
          ) : isError ? (
            <div className="flex items-center justify-center h-32 border border-dashed border-red-200 rounded-card text-sm text-red-500">
              후보 후기를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.
            </div>
          ) : reviews.length === 0 ? (
            <div className="flex items-center justify-center h-32 border border-dashed border-tag-bg rounded-card text-sm text-tag-text">
              추가할 수 있는 후기가 없습니다.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {reviews.map((review) => (
                <ReviewCandidateCard
                  key={review.reviewId}
                  review={review}
                  isAdding={addingReviewId === review.reviewId}
                  onAdd={() => onAdd(review.reviewId)}
                />
              ))}
            </div>
          )}

          {!isLoading && !isError && totalPages > 1 && (
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={onPageChange} />
          )}
        </div>
      </div>
    </>
  )
}

interface ReviewCandidateCardProps {
  review: AdminHomeReview
  isAdding: boolean
  onAdd: () => void
}

function ReviewCandidateCard({ review, isAdding, onAdd }: ReviewCandidateCardProps) {
  return (
    <div className="flex gap-3 rounded-card border border-tag-bg/60 bg-background p-3">
      <div className="relative w-20 h-20 shrink-0 rounded-input bg-tag-bg overflow-hidden">
        {review.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={review.imageUrl}
            alt={review.nickname}
            className="absolute inset-0 w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-tag-text">
            <ImageIcon size={24} />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-bold text-foreground truncate">{review.nickname}</p>
            <p className="text-xs text-tag-text truncate mt-0.5">{review.gatheringTitle}</p>
          </div>
          <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-primary bg-primary/10 rounded px-1.5 py-0.5 shrink-0">
            <Heart size={10} />{review.likeCount}
          </span>
        </div>

        <p className="text-xs text-tag-text leading-relaxed line-clamp-2 mt-2">{review.reviewContent}</p>

        <button
          type="button"
          onClick={onAdd}
          disabled={isAdding}
          className="mt-3 inline-flex min-h-9 items-center justify-center gap-1.5 rounded-input bg-primary px-3 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          <Plus size={13} />
          {isAdding ? '추가 중...' : '홈에 추가'}
        </button>
      </div>
    </div>
  )
}
