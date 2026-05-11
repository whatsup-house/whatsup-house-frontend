'use client'

import { useState } from 'react'
import { useCreateReview } from '@/lib/hooks/useReview'
import type { ReviewType } from '@/lib/api/types'

const MAX_CHARS = 300

interface ReviewWriteFormProps {
  gatheringId: string
  mileageReward?: number
}

function StarRating({ rating, onChange }: { rating: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-0.5 mb-3">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className="w-8 h-8 flex items-center justify-center"
          aria-label={`${star}점`}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill={star <= rating ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="1.5"
            className={star <= rating ? 'text-primary' : 'text-tag-bg'}
          >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </button>
      ))}
    </div>
  )
}

export default function ReviewWriteForm({ gatheringId, mileageReward }: ReviewWriteFormProps) {
  const [tab, setTab] = useState<ReviewType>('TEXT')
  const [content, setContent] = useState('')
  const [rating, setRating] = useState(5)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const { mutate, isPending } = useCreateReview(gatheringId, (mileageEarned) => {
    const base = '후기가 등록됐어요!'
    const reward = mileageEarned > 0 ? ` +${mileageEarned}M 적립` : ''
    showToast(base + reward)
    setContent('')
    setPreviewUrl(null)
    setRating(5)
  })

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPreviewUrl(URL.createObjectURL(file))
  }

  const handleSubmit = () => {
    if (!content.trim()) return
    mutate({
      type: tab,
      content,
      rating,
      imageUrl: tab === 'PHOTO' ? previewUrl : null,
    })
  }

  const canSubmit = content.trim().length > 0 && !isPending

  return (
    <div className="mt-5 bg-card rounded-2xl border border-tag-bg/40 p-4">
      <p className="text-sm font-bold text-foreground mb-3">후기 남기기</p>

      {/* 탭 */}
      <div className="flex gap-2 mb-4">
        {(['TEXT', 'PHOTO'] as ReviewType[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-full text-xs font-semibold transition-colors ${
              tab === t ? 'bg-primary text-white' : 'bg-tag-bg text-tag-text'
            }`}
          >
            {t === 'TEXT' ? '텍스트' : '사진'}
          </button>
        ))}
      </div>

      {/* 별점 */}
      <StarRating rating={rating} onChange={setRating} />

      {/* 사진 업로드 (PHOTO 탭) */}
      {tab === 'PHOTO' && (
        <label className="block w-full mb-3 cursor-pointer">
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={handleImageChange}
          />
          <div className="w-full aspect-video rounded-xl border-2 border-dashed border-tag-bg/60 overflow-hidden flex items-center justify-center bg-tag-bg/30">
            {previewUrl ? (
              <img src={previewUrl} alt="업로드 사진" className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-1 text-tag-text text-sm">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                <span className="text-xs">사진 추가</span>
              </div>
            )}
          </div>
        </label>
      )}

      {/* 텍스트 입력 */}
      <div className="relative mb-3">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value.slice(0, MAX_CHARS))}
          placeholder="게더링에서의 경험을 자유롭게 작성해주세요"
          rows={4}
          className="w-full resize-none rounded-xl bg-tag-bg text-sm text-foreground placeholder:text-tag-text p-3 pb-6 outline-none"
        />
        <span className="absolute bottom-3 right-3 text-[10px] text-tag-text select-none">
          {content.length}/{MAX_CHARS}
        </span>
      </div>

      {/* 마일리지 안내 */}
      {(mileageReward ?? 0) > 0 && (
        <p className="text-xs text-primary mb-3 font-medium">
          후기 등록 시 +{mileageReward}M 마일리지가 적립돼요
        </p>
      )}

      {/* 제출 버튼 */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!canSubmit}
        className="w-full py-3 rounded-xl bg-primary text-white text-sm font-bold disabled:opacity-40 transition-opacity"
      >
        {isPending ? '등록 중...' : '후기 등록'}
      </button>

      {/* 토스트 */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-foreground/90 text-white text-sm px-4 py-2.5 rounded-full shadow-lg z-50 whitespace-nowrap pointer-events-none">
          {toast}
        </div>
      )}
    </div>
  )
}
