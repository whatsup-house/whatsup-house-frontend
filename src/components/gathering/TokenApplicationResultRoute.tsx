'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { fetchApplicationByToken } from '@/lib/api/application'
import { useGatheringDetail } from '@/lib/hooks/useGatherings'
import { LoadingSpinner } from '@/components/ui'
import ApplicationResultView from '@/components/gathering/ApplicationResultView'
import type { ApplicationStatus } from '@/lib/api/types'

function isConfirmedStatus(status: string | null | undefined) {
  return status === 'CONFIRMED' || status === 'ATTENDED'
}

export default function TokenApplicationResultRoute() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const t = useTranslations('mypage.guestApplication')

  const tokenApplication = useQuery({
    queryKey: ['application', 'token', token],
    queryFn: () => fetchApplicationByToken(token!),
    enabled: Boolean(token),
    retry: false,
  })

  const gatheringId = tokenApplication.data?.gathering.id ?? ''
  const { data: gathering, isLoading: isGatheringLoading } = useGatheringDetail(gatheringId)

  if (!token) {
    return (
      <div className="px-5 py-16 flex flex-col items-center text-center">
        <p className="text-4xl mb-4">🔗</p>
        <h1 className="text-lg font-bold text-foreground mb-2">{t('invalidTitle')}</h1>
        <p className="text-sm text-tag-text mb-8">{t('invalidDescription')}</p>
        <Link href="/applications/check" className="text-sm text-primary underline text-center">
          {t('checkDirectly')}
        </Link>
      </div>
    )
  }

  if (tokenApplication.isLoading || isGatheringLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-background">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (tokenApplication.isError || !tokenApplication.data || !gathering) {
    return (
      <div className="px-5 py-16 flex flex-col items-center text-center">
        <p className="text-4xl mb-4">🔗</p>
        <h1 className="text-lg font-bold text-foreground mb-2">{t('invalidTitle')}</h1>
        <p className="text-sm text-tag-text mb-8">{t('invalidDescription')}</p>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Link href="/applications/check" className="text-sm text-primary underline text-center">
            {t('checkDirectly')}
          </Link>
          <Link href="/" className="text-sm text-tag-text text-center">
            {t('goHome')}
          </Link>
        </div>
      </div>
    )
  }

  const application = tokenApplication.data
  const mode = isConfirmedStatus(application.status) ? 'confirmed' : 'completed'
  const paymentConfirmed = searchParams.get('payment') === 'confirmed'
    || application.paymentStatus === 'CONFIRMED'

  return (
    <ApplicationResultView
      gathering={gathering}
      mode={mode}
      bookingNumber={application.bookingNumber}
      applicationStatus={application.status as ApplicationStatus}
      paymentConfirmed={paymentConfirmed}
      ticketRemainingCount={application.ticketRemainingCount}
    />
  )
}
