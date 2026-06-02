'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store/authStore'
import { hasSeenWelcome, markWelcomeSeen } from '@/lib/utils/welcomeCookie'

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

    router.replace(`/welcome?returnUrl=${encodeURIComponent(pathname)}`)
  }, [isInitialized, isLoggedIn, pathname, router])

  return null
}
