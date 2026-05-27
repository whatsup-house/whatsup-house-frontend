'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store/authStore'

export default function AuthOnlyRedirect() {
  const router = useRouter()
  const { isInitialized, isLoggedIn } = useAuthStore()

  useEffect(() => {
    if (isInitialized && isLoggedIn) {
      router.replace('/')
    }
  }, [isInitialized, isLoggedIn, router])

  return null
}
