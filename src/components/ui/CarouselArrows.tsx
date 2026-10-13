import { ChevronLeft, ChevronRight } from 'lucide-react'

interface CarouselArrowsProps {
  canPrev: boolean
  canNext: boolean
  onPrev: () => void
  onNext: () => void
  prevLabel: string
  nextLabel: string
}

const base =
  'absolute top-1/2 z-20 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-opacity lg:flex'

/** 슬라이드형 캐러셀의 좌/우 버튼 (데스크탑 전용). 부모는 position: relative 여야 한다. */
export default function CarouselArrows({ canPrev, canNext, onPrev, onNext, prevLabel, nextLabel }: CarouselArrowsProps) {
  return (
    <>
      <button
        type="button"
        aria-label={prevLabel}
        onClick={onPrev}
        className={`${base} left-2 ${canPrev ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
      >
        <ChevronLeft size={20} />
      </button>
      <button
        type="button"
        aria-label={nextLabel}
        onClick={onNext}
        className={`${base} right-2 ${canNext ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
      >
        <ChevronRight size={20} />
      </button>
    </>
  )
}
