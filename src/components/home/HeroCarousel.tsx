'use client'

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import { Flame, Pause, Play } from 'lucide-react'
import { useTranslations } from 'next-intl'
import AppImage from '@/components/ui/AppImage'
import CarouselArrows from '@/components/ui/CarouselArrows'
import { useHeroCarousel } from '@/lib/hooks/useHome'
import { useWheelStep } from '@/lib/hooks/useWheelStep'
import { findStoryByTitle } from '@/lib/constants/stories'
import type { HeroCarouselSlide } from '@/lib/api/types'

const AUTO_INTERVAL = 5000
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

function subscribeReducedMotion(onChange: () => void) {
  const mq = window.matchMedia(REDUCED_MOTION_QUERY)
  mq.addEventListener('change', onChange)
  return () => mq.removeEventListener('change', onChange)
}

function CarouselSkeleton() {
  return <div className="w-full aspect-[9/16] bg-tag-bg animate-pulse" />
}

export default function HeroCarousel() {
  const t = useTranslations('home.hero')
  const { data: slides, isLoading } = useHeroCarousel()
  const [idx, setIdx] = useState(0)
  // 사용자가 일시정지했거나 hover/focus 중이면 자동 넘김을 멈춘다 (WCAG 2.2.2)
  const [userPaused, setUserPaused] = useState(false)
  const [interacting, setInteracting] = useState(false)
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
    () => false,
  )
  const touchStartX = useRef(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const total = slides?.length ?? 0
  const activeIdx = total > 0 ? Math.min(idx, total - 1) : 0

  const paused = userPaused || interacting || reducedMotion

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (total === 0 || paused) return
    timerRef.current = setInterval(() => {
      setIdx(prev => (prev + 1) % total)
    }, AUTO_INTERVAL)
  }, [total, paused])

  useEffect(() => {
    resetTimer()
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [resetTimer])

  const step = useCallback((dir: 1 | -1) => {
    setIdx(prev => Math.max(0, Math.min(total - 1, prev + dir)))
    resetTimer()
  }, [total, resetTimer])

  useWheelStep(containerRef, step)

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX
    if (Math.abs(diff) > 50) {
      step(diff > 0 ? 1 : -1)
    }
  }

  const handleSlideClick = (slide: HeroCarouselSlide) => {
    if (slide.type === 'CALENDAR') {
      router.push('/gatherings')
    } else if (slide.type === 'GATHERING' && slide.gatheringId) {
      router.push(`/gatherings/${slide.gatheringId}`)
    } else if (slide.type === 'STORY') {
      // STORY 슬라이드는 제목 기준으로 정적 소개 페이지에 매핑한다 (BE 링크 필드 없음). (KAN-254)
      const story = findStoryByTitle(slide.title)
      if (story) router.push(`/story/${story.slug}`)
    }
  }

  if (isLoading) return <CarouselSkeleton />
  if (!slides || slides.length === 0) return <CarouselSkeleton />

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-[9/16] overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onPointerEnter={(e) => { if (e.pointerType === 'mouse') setInteracting(true) }}
      onPointerLeave={(e) => { if (e.pointerType === 'mouse') setInteracting(false) }}
      onFocus={() => setInteracting(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setInteracting(false)
      }}
    >
      {/* 카운터 + 일시정지 토글 */}
      <button
        type="button"
        aria-label={userPaused ? t('play') : t('pause')}
        aria-pressed={userPaused}
        onClick={() => setUserPaused((p) => !p)}
        className="absolute top-2 right-2 z-10 flex min-h-[44px] items-center p-1.5 focus-visible:outline-none"
      >
        <span className="flex items-center gap-1.5 bg-black/45 backdrop-blur-sm text-white rounded-full px-3 py-1 text-xs font-semibold tabular-nums ring-primary [button:focus-visible_&]:ring-2">
          {userPaused ? <Play size={12} aria-hidden /> : <Pause size={12} aria-hidden />}
          {activeIdx + 1} / {total}
        </span>
      </button>

      {/* 슬라이드 컨테이너 */}
      <div
        className="flex transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none w-full h-full"
        style={{ transform: `translateX(-${activeIdx * 100}%)` }}
      >
        {slides.map((slide, i) => (
          <button
            type="button"
            key={slide.id ?? i}
            aria-label={slide.title}
            tabIndex={i === activeIdx ? 0 : -1}
            aria-hidden={i !== activeIdx}
            className="flex-none w-full h-full relative overflow-hidden cursor-pointer bg-tag-bg text-left focus-visible:outline-4 focus-visible:-outline-offset-4 focus-visible:outline-primary"
            onClick={() => handleSlideClick(slide)}
          >
            <AppImage
              src={slide.imageUrl}
              alt={slide.title}
              className="object-cover"
              sizes="(max-width: 390px) 100vw, 390px"
              onError={(e) => {
                ;(e.target as HTMLImageElement).style.display = 'none'
              }}
            />
            <div
              className="absolute inset-x-0 bottom-0 px-5 pb-5 pt-10 text-white"
              style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)' }}
            >
              {slide.type === 'CALENDAR' && (
                <>
                  <p className="text-xs font-semibold opacity-85 mb-1">
                    {t('calendarEyebrow')}
                  </p>
                  <p className="text-lg font-bold">{slide.title}</p>
                  <p className="text-xs opacity-85 mt-1">{t('calendarCta')}</p>
                </>
              )}
              {slide.type === 'GATHERING' && (
                <>
                  {/* 완료/마감/취소된 게더링 슬라이드엔 모집중 뱃지를 표시하지 않는다. (KAN-211) */}
                  {slide.gatheringStatus === 'OPEN' && (
                    <span className="inline-flex items-center gap-1 bg-primary text-white rounded-full px-2.5 py-0.5 text-[10px] font-bold mb-1.5">
                      <Flame size={12} />
                      {t('openBadge')}
                    </span>
                  )}
                  <p className="text-xl font-bold mb-1">{slide.title}</p>
                  {slide.dateLabel && <p className="text-xs opacity-90">{slide.dateLabel}</p>}
                </>
              )}
              {slide.type === 'STORY' && (
                <>
                  {slide.content && (
                    <p className="text-xs font-semibold opacity-85 mb-1">
                      {slide.content}
                    </p>
                  )}
                  <p className="text-lg font-bold">{slide.title}</p>
                </>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* 좌우 이동 버튼 (데스크탑 전용) */}
      <CarouselArrows
        canPrev={activeIdx > 0}
        canNext={activeIdx < total - 1}
        onPrev={() => step(-1)}
        onNext={() => step(1)}
        prevLabel={t('previous')}
        nextLabel={t('next')}
      />

      {/* 인디케이터 */}
      <div className="absolute bottom-2 inset-x-0 flex justify-center gap-1.5 z-10">
        {slides.map((_, i) => (
          <div
            key={i}
            style={{
              width: i === activeIdx ? 18 : 6,
              height: 6,
              borderRadius: 9999,
              background: i === activeIdx ? 'var(--color-primary)' : 'rgba(255,255,255,0.6)',
              transition: 'width 0.25s, background-color 0.25s',
              boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
            }}
          />
        ))}
      </div>
    </div>
  )
}
