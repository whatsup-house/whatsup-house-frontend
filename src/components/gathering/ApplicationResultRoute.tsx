'use client'

import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'
import { fetchApplicationByToken, fetchGuestApplicationDetail, fetchMyApplicationDetail } from '@/lib/api/application'
import { useGatheringDetail } from '@/lib/hooks/useGatherings'
import { readGuestLookupSession } from '@/lib/utils/guestLookupSession'
import { LoadingSpinner } from '@/components/ui'
import ApplicationResultView from '@/components/gathering/ApplicationResultView'
import type { ApplicationStatus } from '@/lib/api/types'

interface ApplicationResultRouteProps {
  gatheringId: string
  fallbackMode: 'completed' | 'confirmed'
}

function isConfirmedStatus(status: string | null | undefined) {
  return status === 'CONFIRMED' || status === 'ATTENDED'
}

export default function ApplicationResultRoute({
  gatheringId,
  fallbackMode,
}: ApplicationResultRouteProps) {
  const searchParams = useSearchParams()
  const bookingNumber = searchParams.get('bookingNumber')
  const applicationId = searchParams.get('applicationId')
  const initialStatus = searchParams.get('status')
  const token = searchParams.get('token')
  const guestSession = readGuestLookupSession()
  // 경로 ID는 종류 ID 또는 옛 회차 ID. 종류 상세의 회차 중 신청 회차를 고른다. (KAN-339)
  const { data: gathering, isLoading: isGatheringLoading } = useGatheringDetail(gatheringId)
  const sessionId = searchParams.get('session') ?? gatheringId
  const session = gathering?.sessions.find((item) => item.id === sessionId)

  const memberApplication = useQuery({
    queryKey: ['application', applicationId],
    queryFn: () => fetchMyApplicationDetail(applicationId!),
    enabled: Boolean(applicationId),
    retry: false,
  })

  const guestApplication = useQuery({
    queryKey: ['guest-application-detail', guestSession?.phone, bookingNumber],
    queryFn: () => fetchGuestApplicationDetail(guestSession!.phone, bookingNumber!),
    enabled: Boolean(bookingNumber && guestSession?.phone && !token),
    retry: false,
  })

  const tokenApplication = useQuery({
    queryKey: ['application', 'token', token],
    queryFn: () => fetchApplicationByToken(token!),
    enabled: Boolean(token),
    retry: false,
  })

  const application = memberApplication.data ?? guestApplication.data ?? tokenApplication.data
  const latestStatus = application?.status ?? initialStatus
  const mode = latestStatus
    ? isConfirmedStatus(latestStatus) ? 'confirmed' : 'completed'
    : fallbackMode
  const paymentConfirmed = searchParams.get('payment') === 'confirmed'
    || application?.paymentStatus === 'CONFIRMED'

  if (isGatheringLoading || memberApplication.isLoading || guestApplication.isLoading || tokenApplication.isLoading || !gathering) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-background">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <ApplicationResultView
      gathering={gathering}
      session={session}
      mode={mode}
      bookingNumber={bookingNumber}
      applicationId={applicationId}
      applicationStatus={latestStatus as ApplicationStatus | null}
      paymentConfirmed={paymentConfirmed}
      ticketRemainingCount={application?.ticketRemainingCount}
    />
  )
}
