'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store/authStore'

interface AuthOnlyRedirectProps {
  redirectTo?: string
}

export default function AuthOnlyRedirect({ redirectTo = '/' }: AuthOnlyRedirectProps) {
  const router = useRouter()
  const { isInitialized, isLoggedIn } = useAuthStore()

  useEffect(() => {
    if (isInitialized && isLoggedIn) {
      router.replace(redirectTo)
    }
  }, [isInitialized, isLoggedIn, redirectTo, router])

  return null
}
