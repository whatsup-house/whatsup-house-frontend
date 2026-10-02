import { useRef } from 'react'
import type { TouchEvent } from 'react'

const MIN_DISTANCE_PX = 60
const DIRECTION_RATIO = 1.5      // 가로 이동이 세로의 1.5배를 넘어야 스와이프 (세로 스크롤 중 옆으로 살짝 밀린 건 무시)
const EDGE_GUARD_PX = 24         // iOS 사파리 가장자리 뒤로/앞으로 가기 제스처 영역
const EDITABLE_SELECTOR = 'input, textarea, select, [contenteditable]:not([contenteditable="false"])'

// 가로로 스크롤되는 영역(캐러셀 등) 안에서 시작한 터치인지 — root 까지만 올라가며 본다.
function isInHorizontalScroller(target: Element, root: Element): boolean {
  for (let el: Element | null = target; el && el !== root; el = el.parentElement) {
    const { overflowX } = window.getComputedStyle(el)
    if ((overflowX === 'auto' || overflowX === 'scroll') && el.scrollWidth > el.clientWidth) return true
  }
  return false
}

interface HorizontalSwipeHandlers {
  onSwipeLeft: () => void    // 손가락을 왼쪽으로 밂
  onSwipeRight: () => void   // 손가락을 오른쪽으로 밂
}

// 터치 기기(pointer: coarse)에서만 좌우 스와이프를 인식한다. 입력칸·가로 스크롤 영역·화면 좌우 가장자리에서 시작한 터치는 무시. (KAN-389)
export function useHorizontalSwipe({ onSwipeLeft, onSwipeRight }: HorizontalSwipeHandlers) {
  const startRef = useRef<{ x: number; y: number } | null>(null)

  return {
    onTouchStart: (e: TouchEvent<HTMLElement>) => {
      startRef.current = null
      // 두 손가락(확대 등)은 스와이프가 아니다
      if (e.touches.length !== 1 || !window.matchMedia('(pointer: coarse)').matches) return
      const { clientX, clientY } = e.touches[0]
      if (clientX < EDGE_GUARD_PX || clientX > window.innerWidth - EDGE_GUARD_PX) return
      const target = e.target
      if (!(target instanceof Element)) return
      if (target.closest(EDITABLE_SELECTOR) || isInHorizontalScroller(target, e.currentTarget)) return
      startRef.current = { x: clientX, y: clientY }
    },
    onTouchEnd: (e: TouchEvent<HTMLElement>) => {
      const start = startRef.current
      startRef.current = null
      if (!start) return
      if (window.getSelection()?.isCollapsed === false) return   // 길게 눌러 텍스트를 선택한 채 끈 건 스와이프가 아니다
      const dx = e.changedTouches[0].clientX - start.x
      const dy = e.changedTouches[0].clientY - start.y
      if (Math.abs(dx) < MIN_DISTANCE_PX || Math.abs(dx) <= DIRECTION_RATIO * Math.abs(dy)) return
      if (dx < 0) onSwipeLeft()
      else onSwipeRight()
    },
    onTouchCancel: () => { startRef.current = null },
  }
}
