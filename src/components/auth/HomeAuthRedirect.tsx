'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store/authStore'
import { hasSeenWelcome, markWelcomeSeen } from '@/lib/utils/welcomeCookie'
import { isDesktopViewport } from '@/lib/utils/viewport'

// 모바일로 판별된 첫 진입은 src/proxy.ts가 서버에서 먼저 /welcome으로 보낸다. (KAN-323)
// 이 컴포넌트는 proxy가 거르지 못한 케이스(모바일 판별 불가 UA·태블릿 등)와 ?guest=1 처리를 맡는 폴백이다.
export default function HomeAuthRedirect() {
  const pathname = usePathname()
  const router = useRouter()
  const { isInitialized, isLoggedIn } = useAuthStore()

  useEffect(() => {
    const isGuestEntry = new URLSearchParams(window.location.search).get('guest') === '1'
    if (!isInitialized || isLoggedIn || pathname !== '/') return

    if (isGuestEntry) {
      markWelcomeSeen()
      router.replace('/')
      return
    }

    if (hasSeenWelcome()) return

    // 웰컴 랜딩은 모바일 전용. 데스크탑(lg↑)은 바로 홈을 보여준다.
    if (isDesktopViewport()) return

    router.replace(`/welcome?returnUrl=${encodeURIComponent(pathname)}`)
  }, [isInitialized, isLoggedIn, pathname, router])

  return null
}
