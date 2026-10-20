'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useToastStore } from '@/lib/store/toastStore'

interface ToastHostProps {
  /** AppShell의 .mobile-layout(relative) 안에 마운트될 때 true — lg↑에서 뷰포트 대신 앱 프레임 기준으로 가운데 정렬한다. (KAN-424) */
  inFrame?: boolean
}

// 전역 토스트 호스트. 스토어가 전역이라 레이아웃(AppShell·admin·welcome)이 바뀌어도 토스트가 이어진다. (KAN-227, KAN-424)
export default function ToastHost({ inFrame = false }: ToastHostProps) {
  const t = useTranslations('ui.toast')
  const message = useToastStore((s) => s.message)
  const variant = useToastStore((s) => s.variant)
  const clear = useToastStore((s) => s.clear)
  const [isPaused, setIsPaused] = useState(false)

  useEffect(() => {
    if (!message || isPaused) return
    const timer = setTimeout(clear, 3000)
    return () => clearTimeout(timer)
  }, [message, variant, clear, isPaused])

  if (!message) return null

  const position = inFrame ? 'fixed lg:absolute' : 'fixed'

  if (variant === 'welcome') {
    const [title, ...bodyLines] = message.split('\n').filter(Boolean)
    return (
      <div className={`${position} inset-0 z-[100] flex items-center justify-center bg-foreground/30 px-6`}>
        <div className="relative w-full max-w-[360px] rounded-card bg-card px-6 py-7 text-center shadow-xl">
          <button
            onClick={clear}
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center text-tag-text transition-opacity hover:opacity-70"
            aria-label={t('close')}
          >
            <X size={18} />
          </button>
          <Image src="/assets/wassup-mascot.png" alt="" width={66} height={86} className="mx-auto mb-4" />
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
    <div className={`${position} inset-x-0 bottom-8 z-[100] flex justify-center px-6 pointer-events-none`}>
      <div
        className={`max-w-[430px] w-full rounded-input ${bgClass} text-white text-sm font-medium px-4 py-3 shadow-lg pointer-events-auto flex items-center gap-2`}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <span className="flex-1 text-center">{message}</span>
        <button
          onClick={clear}
          className="flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity"
          aria-label={t('close')}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
