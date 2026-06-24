'use client'

import { Suspense, use } from 'react'
import { LoadingSpinner } from '@/components/ui'
import ApplicationResultRoute from '@/components/gathering/ApplicationResultRoute'

function ApplyCompleteContent({ id }: { id: string }) {
  return <ApplicationResultRoute gatheringId={id} fallbackMode="completed" />
}

export default function ApplyCompletePage({
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
      <ApplyCompleteContent id={id} />
    </Suspense>
  )
}
