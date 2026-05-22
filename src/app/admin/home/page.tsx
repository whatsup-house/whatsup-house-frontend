'use client'

import { useState } from 'react'
import { Plus, Pencil, EyeOff } from 'lucide-react'
import { useAdminCarouselSlides } from '@/lib/hooks/useAdminHeroCarousel'
import { useAdminHomeReviews } from '@/lib/hooks/useAdminHomeReview'
import { HeroCarouselFormPanel } from '@/components/admin/HeroCarouselFormPanel'
import { HomeReviewFormPanel } from '@/components/admin/HomeReviewFormPanel'
import { LoadingSpinner } from '@/components/ui'
import type { AdminHeroCarouselSlide, AdminHomeReview, HeroSlideType } from '@/lib/api/types'

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

export default function AdminHomePage() {
  const [carouselPanel, setCarouselPanel] = useState<AdminHeroCarouselSlide | 'new' | null>(null)
  const [reviewPanel, setReviewPanel] = useState<AdminHomeReview | 'new' | null>(null)

  const { data: slides = [], isLoading: slidesLoading } = useAdminCarouselSlides()
  const { data: reviews = [], isLoading: reviewsLoading } = useAdminHomeReviews()

  const sortedSlides = [...slides].sort((a, b) => a.sortOrder - b.sortOrder)
  const sortedReviews = [...reviews].sort((a, b) => a.displayOrder - b.displayOrder)

  return (
    <div className="max-w-[1280px]">
      {/* 헤더 */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">홈화면 관리</h1>
          <p className="text-sm text-tag-text mt-1">항목을 클릭해 편집하세요</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCarouselPanel('new')}
            className="flex items-center gap-1.5 px-4 h-10 bg-primary text-white rounded-[12px] text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Plus size={15} />
            슬라이드 추가
          </button>
          <button
            onClick={() => setReviewPanel('new')}
            className="flex items-center gap-1.5 px-4 h-10 border border-primary text-primary rounded-[12px] text-sm font-medium hover:bg-primary/5 transition-colors"
          >
            <Plus size={15} />
            후기 추가
          </button>
        </div>
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
        ) : sortedSlides.length === 0 ? (
          <div className="flex items-center justify-center h-32 border border-dashed border-tag-bg rounded-card text-sm text-tag-text">
            슬라이드가 없습니다. 우측 상단 버튼으로 추가하세요.
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-hide">
            {sortedSlides.map((slide) => (
              <SlideCard
                key={slide.id}
                slide={slide}
                onClick={() => setCarouselPanel(slide)}
              />
            ))}
          </div>
        )}
      </section>

      <div className="border-t border-tag-bg mb-10" />

      {/* 홈 후기 섹션 */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-[18px] rounded-full bg-primary" />
          <span className="text-[15px] font-bold text-foreground">다녀온 사람들의 후기</span>
          <span className="text-xs text-tag-text ml-1">{sortedReviews.length}개</span>
        </div>

        {reviewsLoading ? (
          <div className="flex justify-center py-12"><LoadingSpinner /></div>
        ) : sortedReviews.length === 0 ? (
          <div className="flex items-center justify-center h-32 border border-dashed border-tag-bg rounded-card text-sm text-tag-text">
            후기가 없습니다. 우측 상단 버튼으로 추가하세요.
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-hide">
            {sortedReviews.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                onClick={() => setReviewPanel(review)}
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

      {/* 후기 폼 패널 */}
      {reviewPanel !== null && (
        <HomeReviewFormPanel
          review={reviewPanel === 'new' ? null : reviewPanel}
          onClose={() => setReviewPanel(null)}
          onSuccess={() => setReviewPanel(null)}
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
      className="group relative flex-none w-[150px] cursor-pointer rounded-2xl overflow-hidden bg-tag-bg"
      style={{ aspectRatio: '9/16' }}
    >
      {/* 배경 이미지 */}
      {slide.imageUrl && (
        <img
          src={slide.imageUrl}
          alt={slide.title}
          className="absolute inset-0 w-full h-full object-cover"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
        />
      )}

      {/* 하단 그라데이션 + 텍스트 */}
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

      {/* 순서 배지 */}
      <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-black/50 text-white text-[10px] font-bold flex items-center justify-center">
        {slide.sortOrder}
      </div>

      {/* 비노출 배지 */}
      {!slide.isActive && (
        <div className="absolute top-2 left-2 flex items-center gap-0.5 bg-black/60 text-white rounded-full px-1.5 py-0.5 text-[9px]">
          <EyeOff size={8} />
          비노출
        </div>
      )}

      {/* hover 편집 오버레이 */}
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
  onClick: () => void
}

function ReviewCard({ review, onClick }: ReviewCardProps) {
  return (
    <div
      onClick={onClick}
      className="group relative flex-none w-[200px] bg-card rounded-2xl border border-tag-bg/40 overflow-hidden cursor-pointer"
    >
      {/* 아바타 */}
      <div className="relative w-full aspect-square bg-tag-bg">
        {review.avatarUrl ? (
          <img
            src={review.avatarUrl}
            alt={review.authorName}
            className="absolute inset-0 w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-3xl">🐻</div>
        )}
        {!review.isActive && (
          <div className="absolute top-2 left-2 flex items-center gap-0.5 bg-black/60 text-white rounded-full px-1.5 py-0.5 text-[9px]">
            <EyeOff size={8} />
            비노출
          </div>
        )}
      </div>

      {/* 텍스트 */}
      <div className="p-3">
        <div className="flex items-center gap-1.5 mb-1.5">
          <span className="text-[11px] font-semibold text-tag-text truncate">{review.authorName}</span>
          <span className="text-[9px] font-semibold text-primary bg-primary/10 rounded px-1 py-0.5 shrink-0">
            ★{review.rating}
          </span>
        </div>
        <p className="text-[10px] text-tag-text font-medium truncate mb-1">{review.gatheringTitle}</p>
        <p className="text-xs text-tag-text leading-relaxed line-clamp-2">{review.content}</p>
      </div>

      {/* hover 편집 오버레이 */}
      <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <div className="bg-white rounded-full p-2.5 shadow-lg">
          <Pencil size={16} className="text-primary" />
        </div>
      </div>
    </div>
  )
}
