'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CheckCircle2, MapPin, Utensils } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import dayjs from 'dayjs'
import { ApiErrorMessage, EmptyState, LoadingSpinner } from '@/components/ui'
import { useDiningRecommendations, useMyDiningHistory } from '@/lib/hooks/useApplications'
import { useRequireAuth } from '@/lib/hooks/useRequireAuth'
import { formatLocalizedShortDate } from '@/lib/utils/date'

const linkClass = 'mt-3 flex min-h-[44px] w-full items-center justify-center rounded-button px-4 text-sm font-bold'

// 내 우연한 식탁 참가 이력: 회차·지역·식당·테이블 상태·피드백 제출 여부 (KAN-356)
export default function DiningHistoryList() {
  const t = useTranslations('mypage.diningHistory')
  const tAttendance = useTranslations('gathering.diningTable.attendance')
  const locale = useLocale()
  const router = useRouter()
  const { isLoggedIn, isInitialized } = useRequireAuth()
  const historyQuery = useMyDiningHistory(isLoggedIn)
  const recommendations = useDiningRecommendations(isLoggedIn).data?.slice(0, 3) ?? []

  // 회원 전용. 비로그인은 로그인 후 이 화면으로 돌아오게 한다.
  useEffect(() => {
    if (isInitialized && !isLoggedIn) {
      router.replace(`/login?returnUrl=${encodeURIComponent('/dining/history')}`)
    }
  }, [isInitialized, isLoggedIn, router])

  if (!isInitialized || !isLoggedIn || historyQuery.isPending) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-background">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background px-4 py-5">
      <h1 className="mb-4 text-lg font-bold text-foreground">{t('title')}</h1>
      {recommendations.length > 0 && (
        <section className="mb-5">
          <h2 className="mb-2 text-sm font-bold text-foreground">{t('recommendTitle')}</h2>
          <ul className="space-y-2">
            {recommendations.map((rec) => (
              <li key={rec.sessionId} className="flex items-center justify-between gap-3 rounded-card bg-card p-4">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-foreground">
                    {formatLocalizedShortDate(rec.eventDate, locale)}
                    {rec.startTime && ` ${rec.startTime.slice(0, 5)}`}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-tag-text">{rec.title}</p>
                  {rec.region && (
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-tag-text">
                      <MapPin size={14} className="shrink-0" />
                      {rec.region}
                    </p>
                  )}
                </div>
                <Link
                  href={`/gatherings/${rec.gatheringId}?session=${rec.sessionId}`}
                  className="flex min-h-[44px] shrink-0 items-center rounded-button bg-primary px-4 text-sm font-bold text-white"
                >
                  {t('recommendApply')}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      {historyQuery.isError ? (
        <ApiErrorMessage message={t('loadFailed')} onRetry={() => { historyQuery.refetch() }} />
      ) : historyQuery.data.length === 0 ? (
        <EmptyState icon={Utensils} title={t('empty')} />
      ) : (
        <ul className="space-y-3">
          {historyQuery.data.map((item) => {
            // 아직 열리지 않은 회차는 피드백 대신 테이블 상세로 보낸다. 당일 이후 판단은 폼(BE FEEDBACK_NOT_OPEN)이 한다.
            const isUpcoming = dayjs(item.eventDate).isAfter(dayjs(), 'day')
            const tablePath = `/dining/tables/${encodeURIComponent(item.tableId)}`
            return (
              <li key={item.tableId} className="bg-card rounded-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-bold text-foreground">{formatLocalizedShortDate(item.eventDate, locale)}</p>
                  <div className="flex shrink-0 flex-wrap justify-end gap-1">
                    {item.attendanceStatus && (
                      <span className="rounded-full bg-tag-bg px-2 py-1 text-xs font-medium text-tag-text">
                        {tAttendance(item.attendanceStatus)}
                      </span>
                    )}
                    <span className="rounded-full bg-primary-light px-2 py-1 text-xs font-medium text-primary">
                      {t(`tableStatus.${item.tableStatus}`)}
                    </span>
                  </div>
                </div>
                <div className="mt-2 space-y-1 text-xs text-tag-text">
                  {item.region && (
                    <p className="flex items-center gap-1.5">
                      <MapPin size={14} className="shrink-0" />
                      {item.region}
                    </p>
                  )}
                  <p className="flex items-center gap-1.5">
                    <Utensils size={14} className="shrink-0" />
                    {item.venueName ?? t('venuePending')}
                  </p>
                </div>
                {item.feedbackSubmitted ? (
                  <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-primary">
                    <CheckCircle2 size={14} />
                    {t('feedbackSubmitted')}
                  </p>
                ) : isUpcoming ? (
                  <Link href={tablePath} className={`${linkClass} bg-tag-bg text-tag-text`}>{t('viewTable')}</Link>
                ) : (
                  <Link href={`${tablePath}/feedback`} className={`${linkClass} bg-primary text-white`}>{t('writeFeedback')}</Link>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
