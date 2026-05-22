'use client'

import { useRef, useState } from 'react'
import type { CropContext, CropRatio } from '@/lib/api/types'
import ImageCropEditor from './ImageCropEditor'

interface ImageUploadFieldProps {
  /** 현재 표시할 이미지 URL (서버 URL 또는 Object URL) */
  previewUrl?: string | null
  /** 크롭 비율. 미설정 시 크롭 에디터 생략하고 바로 파일 반환 */
  cropRatio?: CropRatio
  /** 크롭 미리보기 컨텍스트 */
  cropContext?: CropContext
  /** 크롭 완료 후 Blob 반환 */
  onConfirm: (blob: Blob) => void
  /** 이미지 제거 */
  onClear?: () => void
  /** 업로드 진행 중 여부 */
  isUploading?: boolean
  /** 컨테이너 비율 클래스 (예: 'aspect-[9/16]', 'aspect-[4/3]', 'aspect-square') */
  aspectClassName?: string
  /** 라벨 텍스트 */
  label?: string
  /** 원형 미리보기 (아바타 등) */
  rounded?: boolean
}

export default function ImageUploadField({
  previewUrl,
  cropRatio,
  cropContext = 'review',
  onConfirm,
  onClear,
  isUploading = false,
  aspectClassName = 'aspect-[4/3]',
  label,
  rounded = false,
}: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    // 같은 파일 재선택 허용을 위해 value 초기화
    e.target.value = ''

    if (cropRatio) {
      setPendingFile(file)
    } else {
      // 크롭 없이 바로 Blob 반환
      onConfirm(file)
    }
  }

  const handleCropConfirm = (blob: Blob) => {
    setPendingFile(null)
    onConfirm(blob)
  }

  const handleCropCancel = () => {
    setPendingFile(null)
  }

  const containerClass = rounded
    ? 'rounded-full overflow-hidden'
    : `w-full ${aspectClassName} rounded-xl overflow-hidden`

  return (
    <>
      <div>
        {label && (
          <p className="text-sm font-medium text-foreground mb-1">{label}</p>
        )}

        <label className="block cursor-pointer">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={handleFileChange}
          />

          <div
            className={`relative border-2 border-dashed border-tag-bg/60 bg-tag-bg/20 flex items-center justify-center ${containerClass}`}
          >
            {/* 현재 이미지 미리보기 */}
            {previewUrl && (
              <img
                src={previewUrl}
                alt="업로드 이미지"
                className={`absolute inset-0 w-full h-full object-cover ${rounded ? 'rounded-full' : ''}`}
              />
            )}

            {/* 업로드 중 스피너 */}
            {isUploading && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {/* 빈 상태 아이콘 */}
            {!previewUrl && !isUploading && (
              <div className="flex flex-col items-center gap-1.5 text-tag-text">
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                <span className="text-xs">사진 선택</span>
              </div>
            )}

            {/* 호버 편집 힌트 (이미지 있을 때) */}
            {previewUrl && !isUploading && (
              <div className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
                <span className="text-white text-xs font-medium">변경</span>
              </div>
            )}
          </div>
        </label>

        {/* 삭제 버튼 */}
        {previewUrl && onClear && !isUploading && (
          <button
            type="button"
            onClick={onClear}
            className="mt-1.5 text-xs text-tag-text hover:text-red-500 transition-colors"
          >
            이미지 제거
          </button>
        )}
      </div>

      {/* 크롭 에디터 */}
      {pendingFile && cropRatio && (
        <ImageCropEditor
          file={pendingFile}
          cropRatio={cropRatio}
          context={cropContext}
          onConfirm={handleCropConfirm}
          onCancel={handleCropCancel}
        />
      )}
    </>
  )
}
