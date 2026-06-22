'use client'

import { useEffect, useState, type RefObject } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface HScrollButtonsProps {
  /** 가로 스크롤 컨테이너 ref. 부모는 position: relative 여야 한다. */
  scrollRef: RefObject<HTMLDivElement | null>
}

/**
 * 가로 스크롤 영역의 좌/우 이동 버튼 (데스크탑 전용).
 * - lg↑에서만 노출 (모바일은 스와이프로 이동)
 * - 더 스크롤할 수 있을 때만 해당 방향 버튼이 보인다.
 */
export default function HScrollButtons({ scrollRef }: HScrollButtonsProps) {
  const t = useTranslations('ui.scroll')
  const [canPrev, setCanPrev] = useState(false)
  const [canNext, setCanNext] = useState(false)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    const update = () => {
      setCanPrev(el.scrollLeft > 4)
      setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
    }

    update()
    el.addEventListener('scroll', update, { passive: true })
    const observer = new ResizeObserver(update)
    observer.observe(el)

    return () => {
      el.removeEventListener('scroll', update)
      observer.disconnect()
    }
  }, [scrollRef])

  const scrollByDir = (dir: -1 | 1) => {
    const el = scrollRef.current
    if (!el) return
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' })
  }

  const base =
    'absolute top-1/2 z-20 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-tag-bg/60 bg-card/90 text-foreground shadow-md backdrop-blur transition-opacity lg:flex'

  return (
    <>
      <button
        type="button"
        aria-label={t('previous')}
        onClick={() => scrollByDir(-1)}
        className={`${base} left-1 ${canPrev ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
      >
        <ChevronLeft size={20} />
      </button>
      <button
        type="button"
        aria-label={t('next')}
        onClick={() => scrollByDir(1)}
        className={`${base} right-1 ${canNext ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
      >
        <ChevronRight size={20} />
      </button>
    </>
  )
}
