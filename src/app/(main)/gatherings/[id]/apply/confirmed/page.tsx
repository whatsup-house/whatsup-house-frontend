'use client'

import { Suspense, use } from 'react'
import { LoadingSpinner } from '@/components/ui'
import ApplicationResultRoute from '@/components/gathering/ApplicationResultRoute'

function ApplyConfirmedContent({ id }: { id: string }) {
  return <ApplicationResultRoute gatheringId={id} fallbackMode="confirmed" />
}

export default function ApplyConfirmedPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center min-h-screen bg-background">
          <LoadingSpinner size="lg" />
        </div>
      }
    >
      <ApplyConfirmedContent id={id} />
    </Suspense>
  )
}
