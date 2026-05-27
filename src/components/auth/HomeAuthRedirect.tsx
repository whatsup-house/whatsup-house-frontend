'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store/authStore'

export default function HomeAuthRedirect() {
  const pathname = usePathname()
  const router = useRouter()
  const { isInitialized, isLoggedIn } = useAuthStore()

  useEffect(() => {
    const isGuestEntry = new URLSearchParams(window.location.search).get('guest') === '1'
    if (!isInitialized || isLoggedIn || isGuestEntry || pathname !== '/') return

    router.replace(`/welcome?returnUrl=${encodeURIComponent(pathname)}`)
  }, [isInitialized, isLoggedIn, pathname, router])

  return null
}
