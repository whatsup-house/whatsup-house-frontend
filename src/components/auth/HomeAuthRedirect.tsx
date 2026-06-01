'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store/authStore'

const AUTH_EXPIRED_KEY = 'whatsup-auth-expired'

export default function HomeAuthRedirect() {
  const pathname = usePathname()
  const router = useRouter()
  const { isInitialized, isLoggedIn } = useAuthStore()

  useEffect(() => {
    const hasExpiredAuth = sessionStorage.getItem(AUTH_EXPIRED_KEY) === 'true'

    if (!isInitialized || isLoggedIn || pathname !== '/') return

    if (hasExpiredAuth) {
      router.replace(`/login?returnUrl=${encodeURIComponent(pathname)}`)
    }
  }, [isInitialized, isLoggedIn, pathname, router])

  return null
}
