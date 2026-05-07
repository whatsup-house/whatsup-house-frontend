'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Flame } from 'lucide-react'

type SlideType = 'gathering' | 'calendar' | 'story'

interface Slide {
  type: SlideType
  src: string
  label: string
  date?: string
  sub?: string
  gatheringId?: string
}

const SLIDES: Slide[] = [
  { type: 'calendar', src: '/home/home-1.png', label: '5월 게더링 일정' },
  { type: 'story', src: '/home/home-2.png', label: '퇴근 게더링', sub: '와썹하우스' },
  { type: 'gathering', src: '/home/home-3.png', label: '전국 대학생 게더링', date: '5월 21일 수', gatheringId: '1' },
  { type: 'gathering', src: '/home/home-4.png', label: '경찰과 도둑', date: '5월 11일 일', gatheringId: '2' },
  { type: 'story', src: '/home/home-5.png', label: '우리 젊다', sub: 'Whatsup house story' },
]

const AUTO_INTERVAL = 5000
// 이 시간(ms) 이상 wheel 이벤트가 없으면 새 제스처로 판단
const GESTURE_GAP = 100
const SWIPE_THRESHOLD = 40

export default function HeroCarousel() {
  const [idx, setIdx] = useState(0)
  const touchStartX = useRef(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // 제스처 상태 (lock 없음 — 제스처 경계만 감지)
  const wheelAccum = useRef(0)
  const wheelGestureDir = useRef(0)   // 현재 제스처 방향 (1 or -1 or 0)
  const wheelLastTime = useRef(0)
  const wheelTriggered = useRef(false) // 이번 제스처에서 이미 전환했는지

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setIdx(prev => (prev + 1) % SLIDES.length)
    }, AUTO_INTERVAL)
  }, [])

  useEffect(() => {
    resetTimer()
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [resetTimer])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const handleWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) < Math.abs(e.deltaY)) return
      e.preventDefault()

      const now = Date.now()
      const gap = now - wheelLastTime.current
      const dir = e.deltaX > 0 ? 1 : -1

      // 새 제스처: 시간 간격 초과 또는 방향 전환
      const isNewGesture =
        gap > GESTURE_GAP ||
        (wheelGestureDir.current !== 0 && dir !== wheelGestureDir.current)

      if (isNewGesture) {
        wheelAccum.current = 0
        wheelTriggered.current = false
        wheelGestureDir.current = 0
      }

      wheelLastTime.current = now
      if (wheelGestureDir.current === 0) wheelGestureDir.current = dir
      if (wheelTriggered.current) return

      wheelAccum.current += e.deltaX
      if (Math.abs(wheelAccum.current) >= SWIPE_THRESHOLD) {
        setIdx(prev => Math.max(0, Math.min(SLIDES.length - 1, prev + wheelGestureDir.current)))
        resetTimer()
        wheelTriggered.current = true
        wheelAccum.current = 0
      }
    }

    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [resetTimer])

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX
    if (Math.abs(diff) > 50) {
      setIdx(prev => Math.max(0, Math.min(SLIDES.length - 1, prev + (diff > 0 ? 1 : -1))))
      resetTimer()
    }
  }

  const handleSlideClick = (slide: Slide) => {
    if (slide.type === 'calendar') {
      router.push('/gatherings')
    } else if (slide.type === 'gathering' && slide.gatheringId) {
      router.push(`/gatherings/${slide.gatheringId}`)
    }
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-[9/16] overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* 카운터 pill */}
      <div className="absolute top-3.5 right-3.5 z-10 bg-black/45 backdrop-blur-sm text-white rounded-full px-3 py-1 text-[11px] font-semibold">
        {idx + 1} / {SLIDES.length}
      </div>

      {/* 슬라이드 컨테이너 */}
      <div
        className="flex transition-transform duration-500 ease-out w-full h-full"
        style={{ transform: `translateX(-${idx * 100}%)` }}
      >
        {SLIDES.map((slide, i) => (
          <div
            key={i}
            className="flex-none w-full h-full relative overflow-hidden cursor-pointer bg-tag-bg"
            onClick={() => handleSlideClick(slide)}
          >
            <img
              src={slide.src}
              alt={slide.label}
              className="w-full h-full object-cover block"
              onError={(e) => {
                ;(e.target as HTMLImageElement).style.display = 'none'
              }}
            />
            <div
              className="absolute inset-x-0 bottom-0 px-5 pb-5 pt-10 text-white"
              style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)' }}
            >
              {slide.type === 'calendar' && (
                <>
                  <p className="text-[11px] font-semibold uppercase tracking-widest opacity-85 mb-1">
                    이번 달 일정
                  </p>
                  <p className="text-lg font-bold">{slide.label}</p>
                  <p className="text-xs opacity-85 mt-1">탭해서 전체 게더링 보기 →</p>
                </>
              )}
              {slide.type === 'gathering' && (
                <>
                  <span className="inline-flex items-center gap-1 bg-primary text-white rounded-full px-2.5 py-0.5 text-[10px] font-bold mb-1.5">
                    <Flame size={12} />
                    모집중
                  </span>
                  <p className="text-xl font-bold mb-1">{slide.label}</p>
                  <p className="text-xs opacity-90">{slide.date}</p>
                </>
              )}
              {slide.type === 'story' && (
                <>
                  <p className="text-[11px] font-semibold uppercase tracking-widest opacity-85 mb-1">
                    {slide.sub}
                  </p>
                  <p className="text-lg font-bold">{slide.label}</p>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 인디케이터 */}
      <div className="absolute bottom-2 inset-x-0 flex justify-center gap-1.5 z-10">
        {SLIDES.map((_, i) => (
          <div
            key={i}
            style={{
              width: i === idx ? 18 : 6,
              height: 6,
              borderRadius: 9999,
              background: i === idx ? 'var(--color-primary)' : 'rgba(255,255,255,0.6)',
              transition: 'all 0.25s',
              boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
            }}
          />
        ))}
      </div>
    </div>
  )
}
