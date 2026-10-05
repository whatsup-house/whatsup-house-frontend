'use client'

import { useEffect, useRef, useState } from 'react'
import type { PointerEvent } from 'react'
import { FastForward, Lock, Play, Volume2, VolumeX } from 'lucide-react'
import { useTranslations } from 'next-intl'

const HOLD_MS = 250
const MOVE_TOLERANCE_PX = 10
const EDGE_RATIO = 0.25
const LOCK_DRAG_PX = 60

type HoldMode = 'fast' | 'pause'

interface FeedVideoProps {
  src: string
  posterUrl?: string | null
  isActive: boolean
  muted: boolean
  onToggleMute: () => void
  onHoldChange: (holding: boolean) => void
  speedLocked: boolean
  onToggleSpeedLock: () => void
}

// 안드로이드 크롬만 진동한다. 사용자 활성화 전 호출은 콘솔 경고가 나서 막는다.
// Vibration API는 세기 조절이 없어 길이만 조절할 수 있다 — 10ms 펄스는 많은 안드로이드 모터에서 느껴지지 않는다.
const vibrate = (pattern: number | number[]) => {
  if (navigator.userActivation?.hasBeenActive) navigator.vibrate?.(pattern)
}

// 릴스 영상. 화면에 있는 것만 재생. 짧게 탭 = 음소거 토글, 좌우 가장자리 길게 누름 = 2배속(누른 채 아래로 밀었다가 떼면 2배속 고정/해제), 가운데 길게 누름 = 일시정지.
export default function FeedVideo({ src, posterUrl, isActive, muted, onToggleMute, onHoldChange, speedLocked, onToggleSpeedLock }: FeedVideoProps) {
  const t = useTranslations('feed')
  const videoRef = useRef<HTMLVideoElement>(null)
  const layerRef = useRef<HTMLDivElement>(null)
  const pressRef = useRef<{ x: number; y: number; timer: ReturnType<typeof setTimeout> | null; wasPlaying: boolean; mode: HoldMode | null; armed: boolean } | null>(null)
  const activeRef = useRef(isActive)
  const [hold, setHold] = useState<HoldMode | null>(null)
  const [armed, setArmed] = useState(false)  // 아래로 민 상태 — 떼는 순간 고정/해제
  const [blocked, setBlocked] = useState(false)  // 자동재생 거부·모션 줄이기·로드 실패 → 재생 버튼
  const [flash, setFlash] = useState(false)

  // 비활성화로 pause()되며 나는 AbortError나 이미 지나간 칸의 실패는 무시
  const onPlayFail = (err: unknown) => {
    if ((err as Error)?.name !== 'AbortError' && activeRef.current) setBlocked(true)
  }

  const play = () => {
    videoRef.current?.play().then(() => setBlocked(false), onPlayFail)
  }

  useEffect(() => {
    activeRef.current = isActive
    const video = videoRef.current
    if (!video) return
    if (!isActive) {
      video.pause()
      return
    }
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ;(reduced ? Promise.reject(new Error('reduced-motion')) : video.play()).then(
      () => setBlocked(false),
      onPlayFail,
    )
  }, [isActive])

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted
  }, [muted])

  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = isActive && (speedLocked || hold === 'fast') ? 2 : 1
  }, [isActive, speedLocked, hold])

  // 홀드가 걸린 뒤의 드래그는 피드 스크롤이 아니라 고정 제스처다. React의 onTouchMove는 passive라 직접 등록한다.
  // touch-action은 기본값(auto)이어야 홀드 전 스와이프로 피드가 스크롤되고, touchmove를 막으면 스크롤이 시작되지 않아 pointercancel도 오지 않는다.
  useEffect(() => {
    const layer = layerRef.current
    if (!layer) return
    const onTouchMove = (e: TouchEvent) => {
      if (pressRef.current?.mode && e.cancelable) e.preventDefault()
    }
    layer.addEventListener('touchmove', onTouchMove, { passive: false })
    return () => layer.removeEventListener('touchmove', onTouchMove)
  }, [])

  useEffect(() => {
    if (!flash) return
    const timer = setTimeout(() => setFlash(false), 600)
    return () => clearTimeout(timer)
  }, [flash])

  const endHold = () => {
    const press = pressRef.current
    pressRef.current = null
    if (press?.timer) clearTimeout(press.timer)
    // 렌더 클로저의 hold state는 타이머 직후 아직 커밋 전일 수 있어 ref로 판단
    const mode = press?.mode
    if (!mode) return
    if (mode === 'pause' && press.wasPlaying && activeRef.current) play()
    setHold(null)
    setArmed(false)
    onHoldChange(false)
  }

  const handlePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = (e.clientX - rect.left) / rect.width
    const mode: HoldMode = ratio < EDGE_RATIO || ratio > 1 - EDGE_RATIO ? 'fast' : 'pause'
    const video = videoRef.current
    const press = { x: e.clientX, y: e.clientY, timer: null as ReturnType<typeof setTimeout> | null, wasPlaying: !!video && !video.paused, mode: null as HoldMode | null, armed: false }
    press.timer = setTimeout(() => {
      press.timer = null
      if (!video) return
      if (mode === 'fast') vibrate(15)
      else video.pause()
      press.mode = mode
      setHold(mode)
      onHoldChange(true)
    }, HOLD_MS)
    pressRef.current = press
  }

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const press = pressRef.current
    if (!press) return
    const dx = e.clientX - press.x
    const dy = e.clientY - press.y
    // 누르기 전에 움직이면 스크롤/스와이프 — 탭도 홀드도 아니다
    if (press.timer) {
      if (Math.hypot(dx, dy) > MOVE_TOLERANCE_PX) endHold()
      return
    }
    // 2배속 홀드 중 아래로 밀면 대기(armed), 다시 올리면 취소. 실제 고정/해제는 손을 뗄 때
    if (press.mode !== 'fast') return
    const nextArmed = dy >= LOCK_DRAG_PX && dy > Math.abs(dx)
    if (nextArmed !== press.armed) {
      press.armed = nextArmed
      setArmed(nextArmed)
    }
  }

  const handlePointerUp = () => {
    const press = pressRef.current
    const isTap = !!press?.timer
    const commit = press?.mode === 'fast' && press.armed && activeRef.current
    endHold()
    if (commit) {
      vibrate(30)  // 2배속 진입(15ms)보다 조금 강하게
      onToggleSpeedLock()
    }
    if (isTap) {
      onToggleMute()
      setFlash(true)
    }
  }

  return (
    <div className="absolute inset-0">
      <video
        ref={videoRef}
        src={src}
        poster={posterUrl ?? undefined}
        muted={muted}
        playsInline
        loop
        preload="none"
        onError={() => setBlocked(true)}
        className="h-full w-full object-cover"
      />
      <div
        ref={layerRef}
        data-testid="feed-gesture-layer"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={endHold}
        onPointerLeave={endHold}
        onContextMenu={(e) => e.preventDefault()}
        className="absolute inset-0 select-none [-webkit-touch-callout:none]"
      />

      {(hold === 'fast' || (speedLocked && isActive)) && (
        <div
          data-testid="feed-speed-pill"
          className="pointer-events-none absolute left-1/2 top-4 flex -translate-x-1/2 items-center gap-1 rounded-full bg-black/50 px-3 py-1 text-sm font-semibold text-white"
        >
          2x {speedLocked ? <Lock size={13} strokeWidth={2.5} /> : <FastForward size={14} fill="currentColor" />}
        </div>
      )}

      {hold === 'fast' && (
        <p className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center px-4 transition-opacity duration-300 starting:opacity-0">
          <span className="rounded-full bg-black/25 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm [text-shadow:0_1px_2px_rgb(0_0_0/0.6)]">
            {t(armed ? (speedLocked ? 'unlockReleaseHint' : 'lockReleaseHint') : speedLocked ? 'unlockHint' : 'lockHint')}
          </span>
        </p>
      )}

      {flash && (
        <div className="pointer-events-none absolute left-1/2 top-1/2 flex size-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white">
          {muted ? <VolumeX size={28} /> : <Volume2 size={28} />}
        </div>
      )}

      {blocked && !hold && (
        <button
          type="button"
          onClick={play}
          aria-label={t('play')}
          className="absolute left-1/2 top-1/2 flex size-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white"
        >
          <Play size={30} fill="currentColor" />
        </button>
      )}

      <button
        type="button"
        onClick={onToggleMute}
        aria-label={muted ? t('unmute') : t('mute')}
        className={`absolute right-3 top-3 flex size-9 items-center justify-center rounded-full bg-black/40 text-white transition-opacity ${hold ? 'opacity-0' : ''}`}
      >
        {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
      </button>
    </div>
  )
}
