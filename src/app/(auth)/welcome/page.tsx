import type { Viewport } from 'next'
import { Suspense } from 'react'
import WelcomePageClient from '@/components/auth/WelcomePageClient'

// 헤더 없는 어두운 풀스크린 랜딩이라 안드로이드 상단바를 배경(bg-foreground, --color-foreground)에 맞춘다. (KAN-385)
export const viewport: Viewport = {
  themeColor: '#171717',
}

export default function WelcomePage() {
  return (
    <Suspense>
      <WelcomePageClient />
    </Suspense>
  )
}
