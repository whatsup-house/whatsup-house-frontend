'use client'

import { Suspense, use } from 'react'
import { useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { fetchGuestApplicationDetail, fetchMyApplicationDetail } from '@/lib/api/application'
import { useGatheringDetail } from '@/lib/hooks/useGatherings'
import { LoadingSpinner } from '@/components/ui'
import ApplicationResultView from '@/components/gathering/ApplicationResultView'
import { readGuestLookupSession } from '@/lib/utils/guestLookupSession'

function ApplyConfirmedContent({ id }: { id: string }) {
  const searchParams = useSearchParams()
  const bookingNumber = searchParams.get('bookingNumber')
  const applicationId = searchParams.get('applicationId')
  const guestSession = readGuestLookupSession()
  const { data: gathering, isLoading } = useGatheringDetail(id)
  const memberApplication = useQuery({
    queryKey: ['application', applicationId],
    queryFn: () => fetchMyApplicationDetail(applicationId!),
    enabled: Boolean(applicationId),
    retry: false,
  })
  const guestApplication = useQuery({
    queryKey: ['guest-application-detail', guestSession?.phone, bookingNumber],
    queryFn: () => fetchGuestApplicationDetail(guestSession!.phone, bookingNumber!),
    enabled: Boolean(bookingNumber && guestSession?.phone),
    retry: false,
  })
  const paymentConfirmed = searchParams.get('payment') === 'confirmed'
    || memberApplication.data?.paymentStatus === 'CONFIRMED'
    || guestApplication.data?.paymentStatus === 'CONFIRMED'

  if (isLoading || memberApplication.isLoading || guestApplication.isLoading || !gathering) {
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
      applicationId={applicationId}
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
