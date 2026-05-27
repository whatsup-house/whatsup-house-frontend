'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store/authStore'

const WELCOME_SEEN_KEY = 'whatsup-has-seen-welcome'
const AUTH_EXPIRED_KEY = 'whatsup-auth-expired'

export default function HomeAuthRedirect() {
  const pathname = usePathname()
  const router = useRouter()
  const { isInitialized, isLoggedIn } = useAuthStore()

  useEffect(() => {
    const isGuestEntry = new URLSearchParams(window.location.search).get('guest') === '1'
    const hasSeenWelcome = localStorage.getItem(WELCOME_SEEN_KEY) === 'true'
    const hasExpiredAuth = sessionStorage.getItem(AUTH_EXPIRED_KEY) === 'true'

    if (!isInitialized || isLoggedIn || isGuestEntry || pathname !== '/') return

    if (hasExpiredAuth) {
      router.replace(`/login?returnUrl=${encodeURIComponent(pathname)}`)
      return
    }

    if (hasSeenWelcome) return

    router.replace(`/welcome?returnUrl=${encodeURIComponent(pathname)}`)
  }, [isInitialized, isLoggedIn, pathname, router])

  return null
}
