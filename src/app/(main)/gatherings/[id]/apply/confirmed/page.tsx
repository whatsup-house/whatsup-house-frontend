'use client'

import { Suspense, use } from 'react'
import { useSearchParams } from 'next/navigation'
import { useGatheringDetail } from '@/lib/hooks/useGatherings'
import { LoadingSpinner } from '@/components/ui'
import ApplicationResultView from '@/components/gathering/ApplicationResultView'

function ApplyConfirmedContent({ id }: { id: string }) {
  const searchParams = useSearchParams()
  const bookingNumber = searchParams.get('bookingNumber')
  const paymentConfirmed = searchParams.get('payment') === 'confirmed'
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
      mode="confirmed"
      bookingNumber={bookingNumber}
      paymentConfirmed={paymentConfirmed}
    />
  )
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
