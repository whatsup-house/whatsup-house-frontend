'use client'

import { useRef, useState } from 'react'
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
  { type: 'gathering', src: '/home/home-1.png', label: '전국 대학생 게더링', date: '5월 21일 수', gatheringId: '1' },
  { type: 'calendar',  src: '/home/home-2.png', label: '5월 게더링 일정' },
  { type: 'gathering', src: '/home/home-3.png', label: '경찰과 도둑', date: '5월 11일 일', gatheringId: '2' },
  { type: 'story',     src: '/home/home-4.png', label: '우리 젊다', sub: 'Whatsup house story' },
  { type: 'story',     src: '/home/home-5.png', label: '퇴근 게더링', sub: '와썹하우스' },
]

export default function HeroCarousel() {
  const [idx, setIdx] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const handleScroll = () => {
    if (!ref.current) return
    const w = ref.current.offsetWidth
    setIdx(Math.round(ref.current.scrollLeft / w))
  }

  const handleSlideClick = (slide: Slide) => {
    if (slide.type === 'calendar') {
      router.push('/gatherings')
    } else if (slide.type === 'gathering' && slide.gatheringId) {
      router.push(`/gatherings/${slide.gatheringId}`)
    }
    // story: 1차 릴리즈 비활성
  }

  return (
    <div className="relative w-full aspect-[9/16] max-h-[520px]">
      {/* 카운터 pill */}
      <div className="absolute top-3.5 right-3.5 z-10 bg-black/45 backdrop-blur-sm text-white rounded-full px-3 py-1 text-[11px] font-semibold">
        {idx + 1} / {SLIDES.length}
      </div>

      {/* 슬라이드 컨테이너 */}
      <div
        ref={ref}
        onScroll={handleScroll}
        className="flex overflow-x-auto scrollbar-hide snap-x snap-mandatory w-full h-full"
      >
        {SLIDES.map((slide, i) => (
          <div
            key={i}
            className="flex-none w-full h-full relative overflow-hidden snap-start cursor-pointer bg-tag-bg"
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
            {/* 하단 그라디언트 + 레이블 */}
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
