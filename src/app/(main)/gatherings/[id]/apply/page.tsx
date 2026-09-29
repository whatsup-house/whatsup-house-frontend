'use client'

import { use, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { useGatheringSession } from '@/lib/hooks/useGatherings'
import { LoadingSpinner, ApiErrorMessage } from '@/components/ui'
import DynamicApplicationForm from '@/components/gathering/DynamicApplicationForm'
import AppImage from '@/components/ui/AppImage'
import { formatLocalizedNumericDate, formatTime } from '@/lib/utils/date'

export default function ApplyPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const t = useTranslations('gathering.apply.form')
  const locale = useLocale()
  const { id } = use(params)
  const router = useRouter()
  const searchParams = useSearchParams()
  const forceGuest = searchParams.get('type') === 'guest'
  // 신청할 회차 (KAN-339). 회차 없이 들어오면 종류 페이지에서 고르게 한다.
  const sessionId = searchParams.get('session') ?? ''

  const { data: gathering, isLoading, isError, refetch } = useGatheringSession(sessionId)
  const session = gathering?.sessions[0]

  useEffect(() => {
    if (!sessionId) router.replace(`/gatherings/${id}`)
  }, [sessionId, id, router])

  if (!sessionId || isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-background">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (isError || !gathering || !session) {
    return (
      <div className="min-h-screen bg-background px-4 pt-20">
        <ApiErrorMessage
          message={t('gatheringLoadFailed')}
          onRetry={() => { refetch() }}
        />
      </div>
    )
  }

  const formattedDate = formatLocalizedNumericDate(session.eventDate, locale)
  const formattedTime = formatTime(session.startTime)

  return (
    <div className="min-h-screen bg-background">
      <div className="px-4 pt-4 pb-6">
        <div className="flex items-center gap-3 bg-card rounded-card p-3 mb-5 shadow-sm">
          <div className="relative w-16 h-16 rounded-[12px] overflow-hidden shrink-0 bg-tag-bg">
            {gathering.thumbnailUrl ? (
              <AppImage
                src={gathering.thumbnailUrl}
                alt={gathering.title}
                className="object-cover"
                sizes="64px"
              />
            ) : (
              <div className="w-full h-full bg-tag-bg" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground truncate">{gathering.title}</p>
            <p className="text-xs text-tag-text mt-0.5">
              📅 {formattedDate} {formattedTime}
            </p>
          </div>
        </div>

        <DynamicApplicationForm gathering={gathering} sessionId={session.id} forceGuest={forceGuest} />
      </div>
    </div>
  )
}
