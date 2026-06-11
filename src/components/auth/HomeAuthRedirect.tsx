'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store/authStore'
import { hasSeenWelcome, markWelcomeSeen } from '@/lib/utils/welcomeCookie'
import { isDesktopViewport } from '@/lib/utils/viewport'

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
