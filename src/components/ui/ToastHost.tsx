'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { useToastStore } from '@/lib/store/toastStore'

// 전역 토스트 호스트. Providers에 마운트되어 페이지 이동과 무관하게 토스트를 표시한다. (KAN-227)
export default function ToastHost() {
  const message = useToastStore((s) => s.message)
  const variant = useToastStore((s) => s.variant)
  const clear = useToastStore((s) => s.clear)
  const [isPaused, setIsPaused] = useState(false)

  useEffect(() => {
    if (!message || isPaused) return
    const timer = setTimeout(clear, variant === 'welcome' ? 4200 : 3000)
    return () => clearTimeout(timer)
  }, [message, variant, clear, isPaused])

  if (!message) return null

  if (variant === 'welcome') {
    const [title, ...bodyLines] = message.split('\n').filter(Boolean)
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/30 px-6">
        <div className="w-full max-w-[360px] rounded-card bg-card px-6 py-7 text-center shadow-xl">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary-light text-[24px] text-primary">
            M
          </div>
          <p className="text-lg font-bold text-foreground">{title}</p>
          <div className="mt-3 space-y-1.5 text-sm leading-relaxed text-tag-text">
            {bodyLines.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const bgClass = variant === 'error' ? 'bg-primary' : 'bg-foreground/90'

  return (
    <div className="fixed inset-x-0 bottom-8 z-[100] flex justify-center px-6 pointer-events-none">
      <div
        className={`max-w-[430px] w-full rounded-input ${bgClass} text-white text-sm font-medium px-4 py-3 shadow-lg pointer-events-auto flex items-center gap-2`}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <span className="flex-1 text-center">{message}</span>
        <button
          onClick={clear}
          className="flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity"
          aria-label="닫기"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
