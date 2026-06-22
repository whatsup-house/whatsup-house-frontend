'use client'

/**
 * ImageMultiCropField — 게더링 관리자 폼 미래 대응용 (UI 스켈레톤)
 *
 * 백엔드가 thumbnailUrl 단일 필드만 지원하므로 API 연결은 보류.
 * 현재는 UI 구조만 구현하며, 추후 백엔드에 썸네일/상세/정사각 필드 추가 시 연결.
 *
 * 위저드 흐름:
 *   step1 (1:1 크롭) → step2 (4:3 크롭) → 완료
 */

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import type { CropRatio } from '@/lib/api/types'
import ImageCropEditor from './ImageCropEditor'

interface CropStep {
  ratio: CropRatio
}

const STEPS: CropStep[] = [
  { ratio: '1:1' },
  { ratio: '4:3' },
]

interface CropResult {
  square: Blob | null
  landscape: Blob | null
}

interface ImageMultiCropFieldProps {
  onComplete?: (results: CropResult) => void
  disabled?: boolean
}

export default function ImageMultiCropField({
  onComplete,
  disabled = false,
}: ImageMultiCropFieldProps) {
  const t = useTranslations('ui.multiCrop')
  const stepCopies = t.raw('steps') as Array<{ label: string; description: string }>
  const [step, setStep] = useState<0 | 1 | 2>(0)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [results, setResults] = useState<CropResult>({ square: null, landscape: null })
  const [previewUrls, setPreviewUrls] = useState<{ square: string; landscape: string }>({
    square: '',
    landscape: '',
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setPendingFile(file)
    setStep(0)
  }

  const handleCropConfirm = (blob: Blob) => {
    const url = URL.createObjectURL(blob)
    if (step === 0) {
      if (previewUrls.square) URL.revokeObjectURL(previewUrls.square)
      setResults((r) => ({ ...r, square: blob }))
      setPreviewUrls((u) => ({ ...u, square: url }))
      setStep(1)
    } else if (step === 1) {
      if (previewUrls.landscape) URL.revokeObjectURL(previewUrls.landscape)
      const next = { ...results, landscape: blob }
      setResults(next)
      setPreviewUrls((u) => ({ ...u, landscape: url }))
      setPendingFile(null)
      setStep(2)
      onComplete?.(next)
    }
  }

  const handleCropCancel = () => {
    setPendingFile(null)
  }

  const handleReset = () => {
    if (previewUrls.square) URL.revokeObjectURL(previewUrls.square)
    if (previewUrls.landscape) URL.revokeObjectURL(previewUrls.landscape)
    setResults({ square: null, landscape: null })
    setPreviewUrls({ square: '', landscape: '' })
    setPendingFile(null)
    setStep(0)
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-foreground">{t('title')}</p>
          {/* 백엔드 미지원 안내 */}
          <span className="text-[10px] text-tag-text bg-tag-bg px-2 py-0.5 rounded-full">
            {t('pending')}
          </span>
        </div>

        {/* 진행 단계 표시 */}
        <div className="flex gap-2">
          {STEPS.map((s, i) => (
            <div
              key={i}
              className={`flex-1 rounded-lg border p-2 text-center transition-colors ${
                step > i
                  ? 'border-primary bg-primary/5'
                  : 'border-tag-bg/60 bg-tag-bg/10'
              }`}
            >
              <p className={`text-xs font-medium ${step > i ? 'text-primary' : 'text-tag-text'}`}>
                {step > i ? '✓ ' : `${i + 1}. `}{stepCopies[i]?.label}
              </p>
              <p className="text-[10px] text-tag-text mt-0.5">{stepCopies[i]?.description}</p>
            </div>
          ))}
        </div>

        {/* 파일 선택 버튼 */}
        {step === 0 && !pendingFile && (
          <label className="cursor-pointer">
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={handleFileChange}
              disabled={disabled}
            />
            <div className="w-full h-20 rounded-xl border-2 border-dashed border-tag-bg/60 flex items-center justify-center text-tag-text text-sm hover:border-primary/40 transition-colors">
              {t('select')}
            </div>
          </label>
        )}

        {/* 완료 미리보기 */}
        {step === 2 && (
          <div className="flex gap-3">
            {previewUrls.square && (
              <div className="flex flex-col items-center gap-1">
                <div className="w-16 h-16 rounded-lg overflow-hidden border border-tag-bg">
                  <img src={previewUrls.square} alt="1:1" className="w-full h-full object-cover" />
                </div>
                <span className="text-[10px] text-tag-text">1:1</span>
              </div>
            )}
            {previewUrls.landscape && (
              <div className="flex flex-col items-center gap-1">
                <div className="w-[calc(4/3*64px)] h-16 rounded-lg overflow-hidden border border-tag-bg">
                  <img
                    src={previewUrls.landscape}
                    alt="4:3"
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="text-[10px] text-tag-text">4:3</span>
              </div>
            )}
            <button
              type="button"
              onClick={handleReset}
              className="text-xs text-tag-text hover:text-red-500 transition-colors self-end ml-auto"
            >
              {t('selectAgain')}
            </button>
          </div>
        )}
      </div>

      {/* 크롭 에디터 */}
      {pendingFile && step < 2 && (
        <ImageCropEditor
          file={pendingFile}
          cropRatio={STEPS[step].ratio}
          context={step === 0 ? 'avatar' : 'review'}
          onConfirm={handleCropConfirm}
          onCancel={handleCropCancel}
        />
      )}
    </>
  )
}
