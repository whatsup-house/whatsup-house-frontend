'use client'

import { Suspense, use } from 'react'
import { useSearchParams } from 'next/navigation'
import { useGatheringDetail } from '@/lib/hooks/useGatherings'
import { LoadingSpinner } from '@/components/ui'
import ApplicationResultView from '@/components/gathering/ApplicationResultView'

function ApplyCompleteContent({ id }: { id: string }) {
  const searchParams = useSearchParams()
  const bookingNumber = searchParams.get('bookingNumber')
  const { data: gathering, isLoading } = useGatheringDetail(id)

  if (isLoading || !gathering) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-background">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <ApplicationResultView
      gathering={gathering}
      mode="completed"
      bookingNumber={bookingNumber}
    />
  )
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
