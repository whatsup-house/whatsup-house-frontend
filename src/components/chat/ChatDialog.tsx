'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

interface ChatDialogProps {
  title: string
  description?: string
  // 있으면 textarea 를 보여주고 입력값을 onConfirm 으로 넘긴다 (수정·신고 사유)
  input?: { initialValue: string; placeholder?: string; maxLength: number }
  confirmLabel: string
  isPending: boolean
  onConfirm: (value: string) => void
  onClose: () => void
}

// 확인 / 한 줄 입력 다이얼로그 (조용히 나가기, 메시지 삭제·수정·신고)
export default function ChatDialog({
  title,
  description,
  input,
  confirmLabel,
  isPending,
  onConfirm,
  onClose,
}: ChatDialogProps) {
  const tCommon = useTranslations('common')
  const [value, setValue] = useState(input?.initialValue ?? '')
  const canConfirm = !isPending && (!input || value.trim().length > 0)

  return (
    <div className="fixed lg:absolute inset-0 z-50 flex items-center justify-center bg-foreground/30 px-6" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-[340px] rounded-card bg-card p-5 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-bold text-foreground">{title}</h2>
        {description && <p className="mt-2 text-sm leading-relaxed text-tag-text">{description}</p>}
        {input && (
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={input.placeholder}
            maxLength={input.maxLength}
            rows={4}
            autoFocus
            className="mt-4 w-full resize-none rounded-input border border-tag-bg bg-card px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-tag-text/70 focus:border-primary"
          />
        )}
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-[44px] items-center justify-center rounded-button bg-tag-bg text-sm font-bold text-tag-text"
          >
            {tCommon('cancel')}
          </button>
          <button
            type="button"
            onClick={() => onConfirm(value.trim())}
            disabled={!canConfirm}
            className="flex min-h-[44px] items-center justify-center rounded-button bg-primary text-sm font-bold text-white disabled:opacity-50"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
