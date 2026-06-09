'use client'

import { useState, use } from 'react'
import { useRouter } from 'next/navigation'
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
          message="게더링 정보를 불러올 수 없습니다."
          onRetry={() => { refetch() }}
        />
      </div>
    )
  }

  // 과거 모집중 게더링은 진행 완료로 보정해 신청하기 CTA를 숨긴다 (KAN-164)
  const isRecruiting = getEffectiveStatus(gathering.status, gathering.eventDate) === 'OPEN'
  const today = new Date().toISOString().split('T')[0]
  const hasFutureDates = sameNameGatherings?.some(
    g => g.id !== gathering.id && g.eventDate > today
  ) ?? false

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
    <div className="min-h-screen bg-background pb-[72px]">
      {/* 상세 본문 */}
      <GatheringDetail gathering={gathering} />

      {/* 하단 고정 바 */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[390px] bg-card border-t border-tag-bg/50 px-4 py-3 z-40">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-tag-text">참가비</p>
            <p className="text-lg font-bold text-foreground">{gathering.price.toLocaleString()}원</p>
          </div>
          {isRecruiting ? (
            <Button
              variant="primary"
              size="default"
              className="px-8"
              onClick={handleApplyClick}
            >
              신청하기
            </Button>
          ) : hasFutureDates ? (
            <Button
              variant="outlined"
              size="default"
              className="px-6"
              onClick={() => setIsDateSheetOpen(true)}
            >
              다른 날짜 보기
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="default"
              className="px-6"
              disabled
            >
              운영 종료
            </Button>
          )}
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
