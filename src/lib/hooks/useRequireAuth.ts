'use client'

import { useCallback } from 'react'
import { useAuthStore } from '@/lib/store/authStore'
import { useRouter, usePathname } from 'next/navigation'
import { useHydration } from './useHydration'

export function useRequireAuth() {
  const { isLoggedIn } = useAuthStore()
  const router = useRouter()
  const pathname = usePathname()
  const hydrated = useHydration()

  const requireAuth = useCallback((returnUrl?: string): boolean => {
    if (!isLoggedIn) {
      const target = returnUrl ?? pathname
      router.push(`/login?returnUrl=${encodeURIComponent(target)}`)
      return false
    }
    return true
  }, [isLoggedIn, pathname, router])

  return { isLoggedIn, hydrated, requireAuth }
}
