'use client'

import { useEffect } from 'react'
import { useToastStore } from '@/lib/store/toastStore'

// 전역 토스트 호스트. Providers에 마운트되어 페이지 이동과 무관하게 토스트를 표시한다. (KAN-227)
export default function ToastHost() {
  const message = useToastStore((s) => s.message)
  const clear = useToastStore((s) => s.clear)

  useEffect(() => {
    if (!message) return
    const timer = setTimeout(clear, 3000)
    return () => clearTimeout(timer)
  }, [message, clear])

  if (!message) return null

  return (
    <div className="fixed inset-x-0 bottom-8 z-[100] flex justify-center px-6 pointer-events-none">
      <div className="max-w-[430px] w-full rounded-input bg-foreground/90 text-white text-sm font-medium px-4 py-3 text-center shadow-lg">
        {message}
      </div>
    </div>
  )
}
