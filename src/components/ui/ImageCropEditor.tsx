'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import type { CropContext, CropRatio } from '@/lib/api/types'

interface ImageCropEditorProps {
  file: File
  cropRatio: CropRatio
  context: CropContext
  onConfirm: (blob: Blob) => void
  onCancel: () => void
}

type Rotation = 0 | 90 | 180 | 270

const OUTPUT: Record<CropRatio, { w: number; h: number }> = {
  '4:3': { w: 1080, h: 810 },
  '9:16': { w: 1080, h: 1920 },
  '1:1': { w: 1080, h: 1080 },
}

const RATIO_NUM: Record<CropRatio, number> = {
  '4:3': 4 / 3,
  '9:16': 9 / 16,
  '1:1': 1,
}

const CONTEXT_TITLE_KEY: Record<CropContext, string> = {
  review: 'contextTitle.review',
  carousel: 'contextTitle.carousel',
  avatar: 'contextTitle.avatar',
}

function computeFrame(cropRatio: CropRatio): { fw: number; fh: number } {
  const ratio = RATIO_NUM[cropRatio]
  const maxW = Math.min(window.innerWidth - 48, 360)
  const maxH = window.innerHeight * 0.55
  let fw = maxW
  let fh = fw / ratio
  if (fh > maxH) {
    fh = maxH
    fw = fh * ratio
  }
  return { fw: Math.round(fw), fh: Math.round(fh) }
}

const ZOOM_MIN = 1
const ZOOM_MAX = 4
const ZOOM_STEP = 0.25

export default function ImageCropEditor({
  file,
  cropRatio,
  context,
  onConfirm,
  onCancel,
}: ImageCropEditorProps) {
  const t = useTranslations('ui.imageCrop')
  const [stage, setStage] = useState<'edit' | 'preview'>('edit')
  const [imgSrc, setImgSrc] = useState('')
  const [imgSize, setImgSize] = useState({ w: 1, h: 1 })
  const [frameSize, setFrameSize] = useState({ fw: 300, fh: 300 })
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [scale, setScale] = useState(1)
  const [baseScale, setBaseScale] = useState(1)
  const [rotation, setRotation] = useState<Rotation>(0)
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [isCropping, setIsCropping] = useState(false)

  const dragRef = useRef<{ startX: number; startY: number; px: number; py: number } | null>(null)

  // 회전을 반영한 effective 치수
  const sideways = rotation % 180 !== 0
  const effW = sideways ? imgSize.h : imgSize.w
  const effH = sideways ? imgSize.w : imgSize.h

  const clampPos = useCallback(
    (px: number, py: number, sc: number, frame: { fw: number; fh: number }) => {
      const maxX = Math.max(0, (effW * sc - frame.fw) / 2)
      const maxY = Math.max(0, (effH * sc - frame.fh) / 2)
      return {
        x: Math.max(-maxX, Math.min(maxX, px)),
        y: Math.max(-maxY, Math.min(maxY, py)),
      }
    },
    [effW, effH],
  )

  // 파일 로드
  useEffect(() => {
    const url = URL.createObjectURL(file)
    setImgSrc(url)
    setRotation(0)
    const img = new window.Image()
    img.onload = () => setImgSize({ w: img.naturalWidth, h: img.naturalHeight })
    img.src = url
    return () => URL.revokeObjectURL(url)
  }, [file])

  // 비율 변경 → 프레임 재계산
  useEffect(() => {
    setFrameSize(computeFrame(cropRatio))
  }, [cropRatio])

  // 회전/이미지/프레임 변경 → baseScale 재계산 + 위치 리셋
  useEffect(() => {
    if (imgSize.w <= 1 || imgSize.h <= 1) return
    const side = rotation % 180 !== 0
    const eW = side ? imgSize.h : imgSize.w
    const eH = side ? imgSize.w : imgSize.h
    const bs = Math.max(frameSize.fw / eW, frameSize.fh / eH)
    setBaseScale(bs)
    setScale(bs)
    setPos({ x: 0, y: 0 })
  }, [rotation, imgSize.w, imgSize.h, frameSize.fw, frameSize.fh])

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = { startX: e.clientX, startY: e.clientY, px: pos.x, py: pos.y }
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return
    const dx = e.clientX - dragRef.current.startX
    const dy = e.clientY - dragRef.current.startY
    setPos(clampPos(dragRef.current.px + dx, dragRef.current.py + dy, scale, frameSize))
  }

  const handlePointerUp = () => {
    dragRef.current = null
  }

  const zoomMultiplier = baseScale > 0 ? scale / baseScale : 1

  const setZoom = (z: number) => {
    const clamped = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, z))
    const sc = baseScale * clamped
    setScale(sc)
    setPos((p) => clampPos(p.x, p.y, sc, frameSize))
  }

  const handleReset = () => {
    setScale(baseScale)
    setPos({ x: 0, y: 0 })
    setRotation(0)
  }

  const handleRotate = () => {
    setRotation((r) => ((r + 90) % 360) as Rotation)
  }

  const cropToBlob = useCallback((): Promise<Blob> => {
    const { fw } = frameSize
    const { w: outW, h: outH } = OUTPUT[cropRatio]
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas')
      canvas.width = outW
      canvas.height = outH
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Canvas not supported'))
        return
      }
      const img = new window.Image()
      img.onload = () => {
        const dispScale = outW / fw
        const rad = (rotation * Math.PI) / 180
        ctx.imageSmoothingQuality = 'high'
        ctx.translate(outW / 2, outH / 2)
        ctx.translate(pos.x * dispScale, pos.y * dispScale)
        ctx.rotate(rad)
        const total = scale * dispScale
        ctx.scale(total, total)
        ctx.drawImage(img, -imgSize.w / 2, -imgSize.h / 2)
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob)
            else reject(new Error('Crop failed'))
          },
          'image/jpeg',
          0.92,
        )
      }
      img.onerror = () => reject(new Error('Image load failed'))
      img.src = imgSrc
    })
  }, [frameSize, cropRatio, scale, imgSize, pos, imgSrc, rotation])

  const handlePreview = async () => {
    setIsCropping(true)
    try {
      const blob = await cropToBlob()
      const url = URL.createObjectURL(blob)
      setPreviewBlob(blob)
      setPreviewUrl(url)
      setStage('preview')
    } catch (err) {
      console.error('Crop failed:', err)
    } finally {
      setIsCropping(false)
    }
  }

  const handleConfirm = () => {
    if (previewBlob) {
      onConfirm(previewBlob)
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }

  const handleBackToEdit = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl('')
    setPreviewBlob(null)
    setStage('edit')
  }

  if (stage === 'preview') {
    return (
      <PreviewStage
        previewUrl={previewUrl}
        cropRatio={cropRatio}
        context={context}
        onBack={handleBackToEdit}
        onConfirm={handleConfirm}
      />
    )
  }

  const { fw, fh } = frameSize
  const { w: outW, h: outH } = OUTPUT[cropRatio]

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#0E0A08] text-white select-none">
      {/* 헤더 */}
      <EditorHeader
        onBack={onCancel}
        onDone={handlePreview}
        doneLabel={isCropping ? t('processing') : t('apply')}
        doneDisabled={isCropping}
        title={t(CONTEXT_TITLE_KEY[context])}
        dark
      />

      {/* 캔버스 영역 */}
      <div className="relative flex-1 min-h-0 overflow-hidden">
        {/* 드래그 가능한 이미지 */}
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="absolute inset-0 flex items-center justify-center cursor-grab active:cursor-grabbing"
          style={{ touchAction: 'none' }}
        >
          {imgSrc && (
            <img
              src={imgSrc}
              alt=""
              draggable={false}
              className="pointer-events-none select-none max-w-none max-h-none"
              style={{
                width: imgSize.w * scale,
                height: imgSize.h * scale,
                transform: `translate(${pos.x}px, ${pos.y}px) rotate(${rotation}deg)`,
                transformOrigin: 'center center',
              }}
            />
          )}
        </div>

        {/* 4-side dim + 프레임 오버레이 */}
        <FrameOverlay fw={fw} fh={fh} />

        {/* 상단 hint chip */}
        <div className="absolute top-4 left-0 right-0 flex justify-center pointer-events-none">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-white/10 bg-[rgba(20,15,12,0.7)] backdrop-blur-md text-xs font-medium text-white/90 whitespace-nowrap">
            <HandIcon className="text-white/90" size={15} />
            <span>{t('dragHint')}</span>
          </div>
        </div>

        {/* 좌하단 dimensions chip */}
        <div className="absolute left-3 bottom-3 px-2 py-1 rounded bg-[rgba(20,15,12,0.65)] backdrop-blur text-[10px] font-bold text-white/85 tracking-wider pointer-events-none font-mono">
          {cropRatio} · {outW} × {outH}
        </div>
      </div>

      {/* 하단 컨트롤 */}
      <div className="shrink-0 border-t border-white/5 bg-gradient-to-t from-[rgba(20,15,12,0.95)] to-[rgba(20,15,12,0.85)] px-5 pt-4 pb-7 flex flex-col gap-4">
        {/* 줌 슬라이더 */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setZoom(zoomMultiplier - ZOOM_STEP)}
            className="flex items-center justify-center w-8 h-8 rounded-full bg-white/[0.08] shrink-0"
            aria-label={t('zoomOut')}
          >
            <MinusGlyph className="text-white" size={14} />
          </button>
          <div className="flex-1 flex items-center h-6">
            <input
              type="range"
              min={ZOOM_MIN}
              max={ZOOM_MAX}
              step={0.05}
              value={zoomMultiplier}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="zoom-slider w-full h-1 rounded-full outline-none appearance-none"
              style={{
                background: `linear-gradient(to right, var(--color-primary) 0%, var(--color-primary) ${
                  ((zoomMultiplier - ZOOM_MIN) / (ZOOM_MAX - ZOOM_MIN)) * 100
                }%, rgba(255,255,255,0.18) ${
                  ((zoomMultiplier - ZOOM_MIN) / (ZOOM_MAX - ZOOM_MIN)) * 100
                }%, rgba(255,255,255,0.18) 100%)`,
              }}
            />
          </div>
          <button
            type="button"
            onClick={() => setZoom(zoomMultiplier + ZOOM_STEP)}
            className="flex items-center justify-center w-8 h-8 rounded-full bg-white/[0.08] shrink-0"
            aria-label={t('zoomIn')}
          >
            <PlusGlyph className="text-white" size={14} />
          </button>
        </div>

        {/* Quick actions */}
        <div className="flex items-center justify-between gap-2">
          <Pill label={t('ratio', { ratio: cropRatio })} Icon={CropIcon} disabled />
          <Pill label={t('rotate')} Icon={RotateIcon} onClick={handleRotate} />
          <Pill label={t('originalSize')} Icon={ResetIcon} onClick={handleReset} />
        </div>
      </div>

      <style>{`
        .zoom-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: #fff;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
          cursor: pointer;
          border: 2px solid var(--color-primary);
        }
        .zoom-slider::-moz-range-thumb {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: #fff;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
          cursor: pointer;
          border: 2px solid var(--color-primary);
        }
      `}</style>
    </div>
  )
}

// ─────────────────────────────────────────────
// 헤더
// ─────────────────────────────────────────────
interface EditorHeaderProps {
  onBack: () => void
  onDone: () => void
  doneLabel?: string
  doneDisabled?: boolean
  title: string
  dark?: boolean
}

function EditorHeader({
  onBack,
  onDone,
  doneLabel,
  doneDisabled = false,
  title,
  dark = true,
}: EditorHeaderProps) {
  const t = useTranslations('ui.imageCrop')

  return (
    <header
      className={`flex items-center justify-between h-14 px-2 shrink-0 z-10 backdrop-blur ${
        dark
          ? 'bg-[rgba(20,15,12,0.85)] border-b border-white/10 text-white'
          : 'bg-background border-b border-tag-bg/50 text-foreground'
      }`}
    >
      <button
        type="button"
        onClick={onBack}
        className={`flex items-center gap-0.5 min-h-[44px] px-2 text-sm font-medium whitespace-nowrap ${
          dark ? 'text-white' : 'text-foreground'
        }`}
      >
        <ChevronLeftIcon size={22} />
        <span>{t('cancel')}</span>
      </button>
      <h1 className={`text-base font-bold whitespace-nowrap ${dark ? 'text-white' : 'text-foreground'}`}>
        {title}
      </h1>
      <button
        type="button"
        onClick={onDone}
        disabled={doneDisabled}
        className={`min-h-[44px] px-3.5 text-sm font-bold whitespace-nowrap ${
          doneDisabled
            ? dark
              ? 'text-white/35 cursor-default'
              : 'text-tag-text/40 cursor-default'
            : dark
            ? 'text-white'
            : 'text-primary'
        }`}
      >
        {doneLabel ?? t('apply')}
      </button>
    </header>
  )
}

// ─────────────────────────────────────────────
// 프레임 오버레이 (4-side dim + 흰 테두리 + 격자 + corner ticks)
// ─────────────────────────────────────────────
function FrameOverlay({ fw, fh }: { fw: number; fh: number }) {
  const sides = [
    { top: 0, left: 0, right: 0, height: `calc(50% - ${fh / 2}px)` },
    { bottom: 0, left: 0, right: 0, height: `calc(50% - ${fh / 2}px)` },
    {
      top: `calc(50% - ${fh / 2}px)`,
      left: 0,
      height: fh,
      width: `calc(50% - ${fw / 2}px)`,
    },
    {
      top: `calc(50% - ${fh / 2}px)`,
      right: 0,
      height: fh,
      width: `calc(50% - ${fw / 2}px)`,
    },
  ]
  return (
    <>
      {sides.map((s, i) => (
        <div
          key={i}
          className="absolute bg-[rgba(14,10,8,0.62)] pointer-events-none"
          style={s}
        />
      ))}
      {/* 프레임 */}
      <div
        className="absolute left-1/2 top-1/2 pointer-events-none border-2 border-white rounded-[4px]"
        style={{
          width: fw,
          height: fh,
          transform: 'translate(-50%, -50%)',
          boxShadow: '0 0 0 1px rgba(0,0,0,0.25), 0 8px 32px rgba(0,0,0,0.4)',
        }}
      >
        {/* 3등분 격자 */}
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${fw} ${fh}`}
          preserveAspectRatio="none"
          className="absolute inset-0 opacity-55"
        >
          <line x1={fw / 3} y1="0" x2={fw / 3} y2={fh} stroke="#FFF" strokeWidth="0.7" />
          <line x1={(fw * 2) / 3} y1="0" x2={(fw * 2) / 3} y2={fh} stroke="#FFF" strokeWidth="0.7" />
          <line x1="0" y1={fh / 3} x2={fw} y2={fh / 3} stroke="#FFF" strokeWidth="0.7" />
          <line x1="0" y1={(fh * 2) / 3} x2={fw} y2={(fh * 2) / 3} stroke="#FFF" strokeWidth="0.7" />
        </svg>
        {/* corner ticks */}
        <div
          className="absolute w-[18px] h-[18px]"
          style={{ top: -2, left: -2, borderTop: '3px solid #FFF', borderLeft: '3px solid #FFF' }}
        />
        <div
          className="absolute w-[18px] h-[18px]"
          style={{ top: -2, right: -2, borderTop: '3px solid #FFF', borderRight: '3px solid #FFF' }}
        />
        <div
          className="absolute w-[18px] h-[18px]"
          style={{ bottom: -2, left: -2, borderBottom: '3px solid #FFF', borderLeft: '3px solid #FFF' }}
        />
        <div
          className="absolute w-[18px] h-[18px]"
          style={{
            bottom: -2,
            right: -2,
            borderBottom: '3px solid #FFF',
            borderRight: '3px solid #FFF',
          }}
        />
      </div>
    </>
  )
}

// ─────────────────────────────────────────────
// 액션 Pill
// ─────────────────────────────────────────────
interface PillProps {
  label: string
  Icon: React.ComponentType<{ className?: string; size?: number }>
  onClick?: () => void
  disabled?: boolean
}

function Pill({ label, Icon, onClick, disabled = false }: PillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex-1 min-w-0 flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-full border border-white/10 bg-white/[0.06] text-xs font-semibold text-white/90 whitespace-nowrap ${
        disabled ? 'cursor-default opacity-90' : 'cursor-pointer hover:bg-white/[0.1]'
      }`}
    >
      <Icon className="text-white/90" size={14} />
      <span className="whitespace-nowrap">{label}</span>
    </button>
  )
}

// ─────────────────────────────────────────────
// Preview Stage
// ─────────────────────────────────────────────
interface PreviewStageProps {
  previewUrl: string
  cropRatio: CropRatio
  context: CropContext
  onBack: () => void
  onConfirm: () => void
}

function PreviewStage({ previewUrl, cropRatio, context, onBack, onConfirm }: PreviewStageProps) {
  const t = useTranslations('ui.imageCrop')
  const aspectStyle = {
    aspectRatio: cropRatio === '4:3' ? '4 / 3' : cropRatio === '9:16' ? '9 / 16' : '1 / 1',
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-background">
      <EditorHeader
        onBack={onBack}
        onDone={onConfirm}
        doneLabel={t('confirm')}
        title={t('previewTitle')}
        dark={false}
      />

      <div className="flex-1 min-h-0 overflow-y-auto px-5 pt-4 pb-6 flex flex-col gap-5">
        <p className="text-center text-xs text-tag-text">
          {t(`previewContext.${context}`)}
        </p>

        {context === 'avatar' ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-tag-bg/60 bg-tag-bg">
              {previewUrl && (
                <img
                  src={previewUrl}
                  alt={t('avatarAlt')}
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            <p className="text-xs text-tag-text">{t('avatarMask')}</p>
          </div>
        ) : (
          <>
            {/* Hero card mock */}
            <div className="bg-card rounded-card overflow-hidden border border-tag-bg/50 shadow-[0_8px_24px_rgba(89,65,62,0.06)]">
              <div className="w-full bg-tag-bg overflow-hidden" style={aspectStyle}>
                {previewUrl && (
                  <img
                    src={previewUrl}
                    alt={t('cardAlt')}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <div className="px-4 py-3.5">
                <p className="text-[15px] font-bold text-foreground mb-1">
                  {t('sampleTitle')}
                </p>
                <p className="text-xs text-tag-text">{t('sampleDate')}</p>
              </div>
            </div>

            {/* Compact list-row mock */}
            <div className="flex items-center gap-3 p-3 bg-card rounded-2xl border border-tag-bg/50 shadow-[0_4px_16px_rgba(89,65,62,0.04)]">
              <div
                className="rounded-[10px] overflow-hidden shrink-0 bg-tag-bg"
                style={{ width: 72, ...aspectStyle }}
              >
                {previewUrl && (
                  <img
                    src={previewUrl}
                    alt={t('listAlt')}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold text-foreground mb-0.5">
                  {t('sampleListTitle')}
                </p>
                <p className="text-[11.5px] text-tag-text leading-snug">
                  {t('sampleListBody')}
                </p>
              </div>
            </div>
          </>
        )}

        <button
          type="button"
          onClick={onBack}
          className="self-center px-5 py-2.5 rounded-full bg-transparent border border-tag-bg/50 text-[13px] font-semibold text-tag-text"
        >
          {t('editAgain')}
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// 아이콘
// ─────────────────────────────────────────────
interface IconProps {
  className?: string
  size?: number
}

function ChevronLeftIcon({ size = 22 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}

function HandIcon({ className, size = 20 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M9 11V5.5a1.5 1.5 0 0 1 3 0V11" />
      <path d="M12 11V4a1.5 1.5 0 0 1 3 0v7" />
      <path d="M15 11V5.5a1.5 1.5 0 0 1 3 0V14a6 6 0 0 1-12 0v-4a1.5 1.5 0 0 1 3 0V14" />
    </svg>
  )
}

function CropIcon({ className, size = 18 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M6.13 1L6 16a2 2 0 0 0 2 2h15" />
      <path d="M1 6.13L16 6a2 2 0 0 1 2 2v15" />
    </svg>
  )
}

function RotateIcon({ className, size = 18 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polyline points="23 4 23 10 17 10" />
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
  )
}

function ResetIcon({ className, size = 16 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polyline points="1 4 1 10 7 10" />
      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
    </svg>
  )
}

function MinusGlyph({ className, size = 14 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

function PlusGlyph({ className, size = 14 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}
