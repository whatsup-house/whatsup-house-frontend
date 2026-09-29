'use client'

import { useEffect, useState, use } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { useGatheringDetail } from '@/lib/hooks/useGatherings'
import { useRequireAuth } from '@/lib/hooks/useRequireAuth'
import { LoadingSpinner, ApiErrorMessage, Button } from '@/components/ui'
import GatheringDetail from '@/components/gathering/GatheringDetail'
import ApplyModal from '@/components/gathering/ApplyModal'
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
  // 마감된 회차는 선택 불가. 신청 가능한 회차가 하나뿐이면 자동 선택.
  const selectedSession = applicableSessions.find((session) => session.id === requestedSessionId)
    ?? (applicableSessions.length === 1 ? applicableSessions[0] : undefined)
  const price = selectedSession?.price ?? gathering.basePrice ?? 0
  const selectedPath = selectedSession ? `/gatherings/${gathering.id}?session=${selectedSession.id}` : `/gatherings/${gathering.id}`
  const applyPath = selectedSession ? `/gatherings/${gathering.id}/apply?session=${selectedSession.id}` : ''

  const handleApplyClick = () => {
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

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* 상세 본문 */}
      <div className="flex-1">
        <GatheringDetail
          gathering={gathering}
          upcomingSessions={upcomingSessions}
          selectedSessionId={selectedSession?.id ?? null}
          price={price}
          onSelectSession={setPickedSessionId}
        />
      </div>

      {/* 하단 고정 바 (앱 카드/뷰포트 하단에 고정) */}
      <div className="sticky bottom-0 z-40 bg-card border-t border-tag-bg/50 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-tag-text">{t('priceLabel')}</p>
            <p className="text-lg font-bold text-foreground">{t('price', { price: price.toLocaleString(locale) })}</p>
          </div>
          {applicableSessions.length > 0 ? (
            <Button
              variant="primary"
              size="default"
              className="px-6"
              disabled={!selectedSession}
              onClick={handleApplyClick}
            >
              {selectedSession ? t('apply') : t('selectSession')}
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
