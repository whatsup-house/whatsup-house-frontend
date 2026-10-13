import { useEffect, useRef, type RefObject } from 'react'

const GESTURE_GAP = 100
const SWIPE_THRESHOLD = 40

// 트랙패드 가로 스와이프 한 번 = 한 칸. 관성 휠 이벤트가 이어져도 같은 제스처면 한 번만 넘긴다.
// 세로가 더 큰 휠은 건드리지 않아 바깥 세로 스크롤은 그대로 동작한다.
export function useWheelStep(ref: RefObject<HTMLElement | null>, onStep: (dir: 1 | -1) => void) {
  const onStepRef = useRef(onStep)
  useEffect(() => { onStepRef.current = onStep })

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let accum = 0
    let gestureDir = 0
    let lastTime = 0
    let triggered = false

    const handleWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) < Math.abs(e.deltaY)) return
      e.preventDefault()

      const now = Date.now()
      const dir = e.deltaX > 0 ? 1 : -1
      if (now - lastTime > GESTURE_GAP || (gestureDir !== 0 && dir !== gestureDir)) {
        accum = 0
        triggered = false
        gestureDir = 0
      }
      lastTime = now
      if (gestureDir === 0) gestureDir = dir
      if (triggered) return

      accum += e.deltaX
      if (Math.abs(accum) >= SWIPE_THRESHOLD) {
        onStepRef.current(gestureDir as 1 | -1)
        triggered = true
        accum = 0
      }
    }

    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [ref])
}
