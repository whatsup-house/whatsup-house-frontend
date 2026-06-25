'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LoadingSpinner } from '@/components/ui'

interface TokenApplicationCheckProps {
  token: string
}

export default function TokenApplicationCheck({ token }: TokenApplicationCheckProps) {
  const router = useRouter()

  useEffect(() => {
    router.replace(`/applications/result?token=${encodeURIComponent(token)}`)
  }, [router, token])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <LoadingSpinner size="lg" />
    </div>
  )
}
