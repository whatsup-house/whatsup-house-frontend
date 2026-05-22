'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { CropContext, CropRatio } from '@/lib/api/types'

interface ImageCropEditorProps {
  file: File
  cropRatio: CropRatio
  context: CropContext
  onConfirm: (blob: Blob) => void
  onCancel: () => void
}

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

const CONTEXT_LABEL: Record<CropContext, string> = {
  review: '후기 카드',
  carousel: '캐러셀 슬라이드',
  avatar: '프로필 아바타',
}

function computeFrame(cropRatio: CropRatio): { fw: number; fh: number } {
  const ratio = RATIO_NUM[cropRatio]
  const maxW = Math.min(window.innerWidth - 48, 400)
  const maxH = window.innerHeight * 0.55
  let fw = maxW
  let fh = fw / ratio
  if (fh > maxH) {
    fh = maxH
    fw = fh * ratio
  }
  return { fw: Math.round(fw), fh: Math.round(fh) }
}

export default function ImageCropEditor({
  file,
  cropRatio,
  context,
  onConfirm,
  onCancel,
}: ImageCropEditorProps) {
  const [stage, setStage] = useState<'edit' | 'preview'>('edit')
  const [imgSrc, setImgSrc] = useState('')
  const [imgSize, setImgSize] = useState({ w: 1, h: 1 })
  const [frameSize, setFrameSize] = useState({ fw: 300, fh: 300 })
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [scale, setScale] = useState(1)
  const [baseScale, setBaseScale] = useState(1)
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [isCropping, setIsCropping] = useState(false)

  const dragRef = useRef<{ startX: number; startY: number; px: number; py: number } | null>(null)

  const clampPos = useCallback(
    (
      px: number,
      py: number,
      sc: number,
      frame: { fw: number; fh: number },
      img: { w: number; h: number },
    ) => {
      const maxX = Math.max(0, (img.w * sc - frame.fw) / 2)
      const maxY = Math.max(0, (img.h * sc - frame.fh) / 2)
      return {
        x: Math.max(-maxX, Math.min(maxX, px)),
        y: Math.max(-maxY, Math.min(maxY, py)),
      }
    },
    [],
  )

  useEffect(() => {
    const url = URL.createObjectURL(file)
    setImgSrc(url)
    const frame = computeFrame(cropRatio)
    setFrameSize(frame)

    const img = new window.Image()
    img.onload = () => {
      const iw = img.naturalWidth
      const ih = img.naturalHeight
      const bs = Math.max(frame.fw / iw, frame.fh / ih)
      setImgSize({ w: iw, h: ih })
      setBaseScale(bs)
      setScale(bs)
      setPos({ x: 0, y: 0 })
    }
    img.src = url
    return () => URL.revokeObjectURL(url)
  }, [file, cropRatio])

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = { startX: e.clientX, startY: e.clientY, px: pos.x, py: pos.y }
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return
    const dx = e.clientX - dragRef.current.startX
    const dy = e.clientY - dragRef.current.startY
    setPos(clampPos(dragRef.current.px + dx, dragRef.current.py + dy, scale, frameSize, imgSize))
  }

  const handlePointerUp = () => {
    dragRef.current = null
  }

  const handleScaleChange = (v: number) => {
    setScale(v)
    setPos((p) => clampPos(p.x, p.y, v, frameSize, imgSize))
  }

  const handleReset = () => {
    setScale(baseScale)
    setPos({ x: 0, y: 0 })
  }

  const cropToBlob = useCallback((): Promise<Blob> => {
    const { fw, fh } = frameSize
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
        const srcW = fw / scale
        const srcH = fh / scale
        const srcX = (imgSize.w - srcW) / 2 - pos.x / scale
        const srcY = (imgSize.h - srcH) / 2 - pos.y / scale
        ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, outW, outH)
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
  }, [frameSize, cropRatio, scale, imgSize, pos, imgSrc])

  const handlePreview = async () => {
    setIsCropping(true)
    try {
      const blob = await cropToBlob()
      const url = URL.createObjectURL(blob)
      setPreviewBlob(blob)
      setPreviewUrl(url)
      setStage('preview')
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

  const { fw, fh } = frameSize

  /* ── 미리보기 단계 ── */
  if (stage === 'preview') {
    return (
      <div className="fixed inset-0 z-[100] bg-black flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 shrink-0">
          <button onClick={handleBackToEdit} className="text-white/80 text-sm">
            ← 다시 편집
          </button>
          <span className="text-white text-sm font-medium">
            {CONTEXT_LABEL[context]} 미리보기
          </span>
          <button onClick={handleConfirm} className="text-primary font-bold text-sm">
            적용
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center px-6">
          {context === 'avatar' && (
            <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-white/20">
              {previewUrl && (
                <img src={previewUrl} alt="미리보기" className="w-full h-full object-cover" />
              )}
            </div>
          )}
          {context === 'review' && (
            <div className="w-full max-w-sm bg-card rounded-2xl overflow-hidden">
              <div className="aspect-[4/3] w-full overflow-hidden">
                {previewUrl && (
                  <img src={previewUrl} alt="미리보기" className="w-full h-full object-cover" />
                )}
              </div>
              <div className="p-3">
                <p className="text-xs text-tag-text">후기 카드에서 이렇게 보여요</p>
              </div>
            </div>
          )}
          {context === 'carousel' && (
            <div
              className="rounded-2xl overflow-hidden"
              style={{ width: 144, aspectRatio: '9/16' }}
            >
              {previewUrl && (
                <img src={previewUrl} alt="미리보기" className="w-full h-full object-cover" />
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  /* ── 편집 단계 ── */
  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col select-none">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0">
        <button onClick={onCancel} className="text-white/80 text-sm">
          취소
        </button>
        <span className="text-white text-sm font-medium">{cropRatio} 크롭</span>
        <button
          onClick={handlePreview}
          disabled={isCropping}
          className="text-primary font-bold text-sm disabled:opacity-50"
        >
          {isCropping ? '처리 중...' : '다음 →'}
        </button>
      </div>

      {/* 크롭 영역 */}
      <div className="flex-1 flex items-center justify-center overflow-hidden">
        <div
          className="relative cursor-grab active:cursor-grabbing"
          style={{ width: fw, height: fh, overflow: 'hidden', touchAction: 'none' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          {/* 이미지 */}
          {imgSrc && (
            <img
              src={imgSrc}
              alt=""
              draggable={false}
              className="absolute pointer-events-none"
              style={{
                width: imgSize.w * scale,
                height: imgSize.h * scale,
                left: '50%',
                top: '50%',
                transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px))`,
              }}
            />
          )}

          {/* 프레임 테두리 */}
          <div className="absolute inset-0 border-2 border-white/80 pointer-events-none" />

          {/* 3등분 격자 */}
          <div className="absolute inset-0 pointer-events-none">
            <div
              className="absolute left-0 right-0 h-px bg-white/25"
              style={{ top: '33.33%' }}
            />
            <div
              className="absolute left-0 right-0 h-px bg-white/25"
              style={{ top: '66.67%' }}
            />
            <div
              className="absolute top-0 bottom-0 w-px bg-white/25"
              style={{ left: '33.33%' }}
            />
            <div
              className="absolute top-0 bottom-0 w-px bg-white/25"
              style={{ left: '66.67%' }}
            />
          </div>
        </div>
      </div>

      {/* 하단 컨트롤 */}
      <div className="shrink-0 px-6 pb-10 pt-4">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-white/50 text-xs">−</span>
          <input
            type="range"
            min={baseScale}
            max={baseScale * 3}
            step={baseScale * 0.005}
            value={scale}
            onChange={(e) => handleScaleChange(Number(e.target.value))}
            className="flex-1 accent-primary"
          />
          <span className="text-white/50 text-xs">+</span>
        </div>
        <button onClick={handleReset} className="w-full text-white/50 text-xs text-center">
          원본 크기로 초기화
        </button>
      </div>
    </div>
  )
}
