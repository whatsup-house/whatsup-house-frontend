'use client'

import { useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { useGatheringDetail, useGatheringsByTitle } from '@/lib/hooks/useGatherings'
import { useRequireAuth } from '@/lib/hooks/useRequireAuth'
import { LoadingSpinner, ApiErrorMessage, Button } from '@/components/ui'
import GatheringDetail from '@/components/gathering/GatheringDetail'
import ApplyModal from '@/components/gathering/ApplyModal'
import GatheringDateSheet from '@/components/gathering/GatheringDateSheet'
import { getEffectiveStatus } from '@/lib/utils/gatheringStatus'

export default function GatheringDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const t = useTranslations('gathering.detail')
  const locale = useLocale()
  const { id } = use(params)
  const router = useRouter()
  const { isLoggedIn, requireAuth } = useRequireAuth()
  const { data: gathering, isLoading, isError, refetch } = useGatheringDetail(id)
  const { data: sameNameGatherings } = useGatheringsByTitle(gathering?.title ?? '')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDateSheetOpen, setIsDateSheetOpen] = useState(false)

  if (isLoading) {
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

  // 과거 모집중 게더링은 진행 완료로 보정해 신청하기 CTA를 숨긴다 (KAN-164)
  const isRecruiting = getEffectiveStatus(gathering.status, gathering.eventDate) === 'OPEN'
  // 동명 게더링이 여러 날짜에 걸쳐 있으면 달력으로 다른 날짜를 선택할 수 있게 한다. 단일 날짜면 비노출. (KAN-253)
  const hasMultipleDates =
    new Set((sameNameGatherings ?? []).map((g) => g.eventDate)).size > 1

  const handleApplyClick = () => {
    if (isLoggedIn) {
      router.push(`/gatherings/${id}/apply`)
      return
    }
    setIsModalOpen(true)
  }

  const handleLoginApply = () => {
    setIsModalOpen(false)
    if (isLoggedIn) {
      router.push(`/gatherings/${id}/apply`)
    } else {
      requireAuth(`/gatherings/${id}`)
    }
  }

  const handleGuestApply = () => {
    setIsModalOpen(false)
    router.push(`/gatherings/${id}/apply?type=guest`)
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* 상세 본문 */}
      <div className="flex-1">
        <GatheringDetail gathering={gathering} />
      </div>

      {/* 하단 고정 바 (앱 카드/뷰포트 하단에 고정) */}
      <div className="sticky bottom-0 z-40 bg-card border-t border-tag-bg/50 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-tag-text">{t('priceLabel')}</p>
            <p className="text-lg font-bold text-foreground">{t('price', { price: gathering.price.toLocaleString(locale) })}</p>
          </div>
          <div className="flex items-center gap-2">
            {isRecruiting ? (
              <>
                {hasMultipleDates && (
                  <Button
                    variant="outlined"
                    size="default"
                    className="px-4"
                    onClick={() => setIsDateSheetOpen(true)}
                  >
                    {t('otherDate')}
                  </Button>
                )}
                <Button
                  variant="primary"
                  size="default"
                  className="px-8"
                  onClick={handleApplyClick}
                >
                  {t('apply')}
                </Button>
              </>
            ) : hasMultipleDates ? (
              <Button
                variant="outlined"
                size="default"
                className="px-6"
                onClick={() => setIsDateSheetOpen(true)}
              >
                {t('viewOtherDate')}
              </Button>
            ) : (
              <Button
                variant="secondary"
                size="default"
                className="px-6"
                disabled
              >
                {t('closed')}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 신청 방법 선택 모달 */}
      <ApplyModal
        gathering={gathering}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onLoginApply={handleLoginApply}
        onGuestApply={handleGuestApply}
      />

      {/* 다른 날짜 보기 바텀 시트 */}
      <GatheringDateSheet
        title={gathering.title}
        currentGatheringId={gathering.id}
        currentEventDate={gathering.eventDate}
        isOpen={isDateSheetOpen}
        onClose={() => setIsDateSheetOpen(false)}
      />
    </div>
  )
}
