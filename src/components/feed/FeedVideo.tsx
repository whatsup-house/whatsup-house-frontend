'use client'

import { useEffect, useRef, useState } from 'react'
import type { PointerEvent } from 'react'
import { FastForward, Play, Volume2, VolumeX } from 'lucide-react'
import { useTranslations } from 'next-intl'

const HOLD_MS = 250
const MOVE_TOLERANCE_PX = 10
const EDGE_RATIO = 0.25

type HoldMode = 'fast' | 'pause'

interface FeedVideoProps {
  src: string
  posterUrl?: string | null
  isActive: boolean
  muted: boolean
  onToggleMute: () => void
  onHoldChange: (holding: boolean) => void
}

// 릴스 영상. 화면에 있는 것만 재생. 짧게 탭 = 음소거 토글, 좌우 가장자리 길게 누름 = 2배속, 가운데 길게 누름 = 일시정지.
export default function FeedVideo({ src, posterUrl, isActive, muted, onToggleMute, onHoldChange }: FeedVideoProps) {
  const t = useTranslations('feed')
  const videoRef = useRef<HTMLVideoElement>(null)
  const pressRef = useRef<{ x: number; y: number; timer: ReturnType<typeof setTimeout> | null; wasPlaying: boolean; mode: HoldMode | null } | null>(null)
  const activeRef = useRef(isActive)
  const [hold, setHold] = useState<HoldMode | null>(null)
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
      video.playbackRate = 1
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
    const video = videoRef.current
    if (video) {
      video.playbackRate = 1
      if (mode === 'pause' && press.wasPlaying && activeRef.current) play()
    }
    setHold(null)
    onHoldChange(false)
  }

  const handlePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = (e.clientX - rect.left) / rect.width
    const mode: HoldMode = ratio < EDGE_RATIO || ratio > 1 - EDGE_RATIO ? 'fast' : 'pause'
    const video = videoRef.current
    const press = { x: e.clientX, y: e.clientY, timer: null as ReturnType<typeof setTimeout> | null, wasPlaying: !!video && !video.paused, mode: null as HoldMode | null }
    press.timer = setTimeout(() => {
      press.timer = null
      if (!video) return
      if (mode === 'fast') video.playbackRate = 2
      else video.pause()
      press.mode = mode
      setHold(mode)
      onHoldChange(true)
    }, HOLD_MS)
    pressRef.current = press
  }

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const press = pressRef.current
    // 누르기 전에 움직이면 스크롤/스와이프 — 탭도 홀드도 아니다
    if (press?.timer && Math.hypot(e.clientX - press.x, e.clientY - press.y) > MOVE_TOLERANCE_PX) endHold()
  }

  const handlePointerUp = () => {
    const isTap = !!pressRef.current?.timer
    endHold()
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
        data-testid="feed-gesture-layer"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={endHold}
        onPointerLeave={endHold}
        onContextMenu={(e) => e.preventDefault()}
        className="absolute inset-0 select-none [-webkit-touch-callout:none]"
      />

      {hold === 'fast' && (
        <div className="pointer-events-none absolute left-1/2 top-4 flex -translate-x-1/2 items-center gap-1 rounded-full bg-black/50 px-3 py-1 text-sm font-semibold text-white">
          2x <FastForward size={14} fill="currentColor" />
        </div>
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
