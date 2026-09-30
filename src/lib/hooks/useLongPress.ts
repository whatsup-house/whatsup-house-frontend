import { useRef } from 'react'
import type { MouseEvent, PointerEvent } from 'react'

const LONG_PRESS_MS = 500
const MOVE_TOLERANCE_PX = 10

// 500ms 누르고 있으면 onLongPress. 손가락이 움직이면(스크롤) 취소한다.
// 길게 누른 직후의 click은 삼켜서 행 이동 등이 같이 일어나지 않게 한다. 데스크톱 우클릭도 길게 누르기로 취급.
export function useLongPress(onLongPress: () => void) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const startRef = useRef<{ x: number; y: number } | null>(null)
  const firedRef = useRef(false)

  const cancel = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = null
    startRef.current = null
  }

  return {
    onPointerDown: (e: PointerEvent) => {
      if (e.button !== 0) return
      firedRef.current = false
      startRef.current = { x: e.clientX, y: e.clientY }
      timerRef.current = setTimeout(() => {
        firedRef.current = true
        cancel()
        onLongPress()
      }, LONG_PRESS_MS)
    },
    onPointerMove: (e: PointerEvent) => {
      const start = startRef.current
      if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > MOVE_TOLERANCE_PX) cancel()
    },
    onPointerUp: cancel,
    onPointerLeave: cancel,
    onPointerCancel: cancel,
    onContextMenu: (e: MouseEvent) => {
      e.preventDefault()
      cancel()
      if (firedRef.current) return
      firedRef.current = true
      onLongPress()
    },
    onClickCapture: (e: MouseEvent) => {
      if (firedRef.current) {
        e.preventDefault()
        e.stopPropagation()
        firedRef.current = false
      }
    },
  }
}
