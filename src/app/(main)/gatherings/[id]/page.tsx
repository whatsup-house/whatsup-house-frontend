'use client'

import { useEffect, useState, use } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { useGatheringDetail } from '@/lib/hooks/useGatherings'
import { useRequireAuth } from '@/lib/hooks/useRequireAuth'
import { LoadingSpinner, ApiErrorMessage, Button } from '@/components/ui'
import GatheringDetail from '@/components/gathering/GatheringDetail'
import ApplyModal from '@/components/gathering/ApplyModal'
import GatheringDateSheet from '@/components/gathering/GatheringDateSheet'
import { getUpcomingSessions, isSessionApplicable } from '@/lib/utils/gatheringStatus'

// 모임 종류 페이지. 회차를 골라 신청한다. (KAN-339)
export default function GatheringDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const t = useTranslations('gathering.detail')
  const locale = useLocale()
  const { id } = use(params)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isLoggedIn, requireAuth } = useRequireAuth()
  const { data: gathering, isLoading, isError, refetch } = useGatheringDetail(id)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [pickedSessionId, setPickedSessionId] = useState<string | null>(null)
  const [isDateSheetOpen, setIsDateSheetOpen] = useState(false)

  // 옛 회차 ID(= 옛 게더링 ID)로 들어오면 BE가 그 회차의 종류로 응답한다 → 종류 페이지로 바꾸고 그 회차를 미리 선택
  const legacySessionId = gathering && gathering.id !== id ? id : null
  useEffect(() => {
    if (gathering && legacySessionId) {
      router.replace(`/gatherings/${gathering.id}?session=${legacySessionId}`)
    }
  }, [gathering, legacySessionId, router])

  if (isLoading || legacySessionId) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-background">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (isError || !gathering) {
    return (
      <div className="min-h-screen bg-background px-4 pt-20">
        <ApiErrorMessage
          message={t('loadFailed')}
          onRetry={() => { refetch() }}
        />
      </div>
    )
  }

  const upcomingSessions = getUpcomingSessions(gathering.sessions)
  const applicableSessions = upcomingSessions.filter(isSessionApplicable)
  const requestedSessionId = pickedSessionId ?? searchParams.get('session')
  // 보고 있는 회차: ?session=·달력에서 고른 회차(지난 회차도, KAN-370) → 없으면 가장 가까운 신청 가능 회차 → 가장 가까운 예정 회차.
  // 없는 ID·다른 종류 회차는 무시. sessions는 날짜·시작 시간 순. (KAN-386)
  const viewedSession = gathering.sessions.find((session) => session.id === requestedSessionId)
    ?? applicableSessions[0] ?? upcomingSessions[0]
  // 신청은 보고 있는 회차가 신청 가능할 때만 (진행완료·마감 회차를 보면서 신청하기가 눌리던 버그, KAN-386)
  const selectedSession = viewedSession && isSessionApplicable(viewedSession) ? viewedSession : undefined
  const hasOtherApplicable = applicableSessions.some((session) => session.id !== viewedSession?.id)
  const price = viewedSession?.price ?? gathering.basePrice ?? 0
  const selectedPath = selectedSession ? `/gatherings/${gathering.id}?session=${selectedSession.id}` : `/gatherings/${gathering.id}`
  const applyPath = selectedSession ? `/gatherings/${gathering.id}/apply?session=${selectedSession.id}` : ''
  // 우연한 식탁은 회원 전용 단계형 신청(회차 복수 선택)으로 간다. 고른 회차가 있으면 1지망으로 넘긴다. (KAN-344)
  const isRandomTable = gathering.gatheringType === 'RANDOM_TABLE'
  const diningApplyPath = `/gatherings/${gathering.id}/apply/dining${selectedSession ? `?session=${selectedSession.id}` : ''}`

  const handleApplyClick = () => {
    if (isRandomTable) {
      if (requireAuth(diningApplyPath)) router.push(diningApplyPath)
      return
    }
    if (!selectedSession) return
    if (isLoggedIn) {
      router.push(applyPath)
      return
    }
    setIsModalOpen(true)
  }

  const handleLoginApply = () => {
    setIsModalOpen(false)
    if (isLoggedIn) {
      router.push(applyPath)
    } else {
      requireAuth(selectedPath)
    }
  }

  const handleGuestApply = () => {
    setIsModalOpen(false)
    router.push(`${applyPath}&type=guest`)
  }

  // 달력에서 고른 회차는 URL에도 맞춰 공유 링크가 그 회차를 가리키게 한다
  const handlePickSession = (sessionId: string) => {
    setPickedSessionId(sessionId)
    setIsDateSheetOpen(false)
    router.replace(`/gatherings/${gathering.id}?session=${sessionId}`, { scroll: false })
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* 상세 본문 */}
      <div className="flex-1">
        <GatheringDetail
          gathering={gathering}
          session={viewedSession ?? null}
          price={price}
          onShowOtherDates={hasOtherApplicable ? () => setIsDateSheetOpen(true) : undefined}
        />
      </div>

      {/* 하단 고정 바 (앱 카드/뷰포트 하단에 고정) */}
      <div className="sticky bottom-0 z-40 bg-card border-t border-tag-bg/50 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-tag-text">{t('priceLabel')}</p>
            <p className="text-lg font-bold text-foreground">{t('price', { price: price.toLocaleString(locale) })}</p>
          </div>
          {selectedSession ? (
            <Button variant="primary" size="default" className="px-6" onClick={handleApplyClick}>
              {t('apply')}
            </Button>
          ) : hasOtherApplicable ? (
            <Button variant="outlined" size="default" className="px-6" onClick={() => setIsDateSheetOpen(true)}>
              {t('selectOtherDate')}
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="default"
              className="px-6"
              disabled
            >
              {upcomingSessions.length === 0 ? t('noSchedule') : t('closed')}
            </Button>
          )}
        </div>
      </div>

      {isDateSheetOpen && (
        <GatheringDateSheet
          sessions={gathering.sessions}
          currentSessionId={viewedSession?.id ?? null}
          onSelect={handlePickSession}
          onClose={() => setIsDateSheetOpen(false)}
        />
      )}

      {/* 신청 방법 선택 모달 */}
      {selectedSession && (
        <ApplyModal
          gathering={gathering}
          session={selectedSession}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onLoginApply={handleLoginApply}
          onGuestApply={handleGuestApply}
        />
      )}
    </div>
  )
}
