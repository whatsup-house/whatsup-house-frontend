'use client'

import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { ApiErrorMessage, Button, LoadingSpinner } from '@/components/ui'
import DiningRegionChips, { toggleInOrder } from '@/components/gathering/DiningRegionChips'
import GatheringSessionList from '@/components/gathering/GatheringSessionList'
import { useDiningRegions, useUpdateDiningWishes } from '@/lib/hooks/useApplications'
import { useGatheringDetail } from '@/lib/hooks/useGatherings'
import { useToastStore } from '@/lib/store/toastStore'
import { getUpcomingSessions, isSessionApplicable } from '@/lib/utils/gatheringStatus'

interface DiningWishSheetProps {
  applicationId: string
  gatheringId: string
  initialSessionIds: string[]
  initialRegions: string[]
  onClose: () => void
}

// 매칭 대기 중 희망 회차·지역 바꾸기 바텀시트 — 신청 1단계와 같은 지역 칩·회차 우선순위 목록 (KAN-439)
// 부모가 열 때만 마운트한다 → 열 때마다 지금 희망값으로 다시 시작한다.
export default function DiningWishSheet({ applicationId, gatheringId, initialSessionIds, initialRegions, onClose }: DiningWishSheetProps) {
  const t = useTranslations('mypage.applications.dining')
  const tApply = useTranslations('gathering.diningApply')
  const tCommon = useTranslations('common')
  const showToast = useToastStore((s) => s.show)
  const gatheringQuery = useGatheringDetail(gatheringId)
  const regionsQuery = useDiningRegions()
  const updateWishes = useUpdateDiningWishes()
  const [sessionIds, setSessionIds] = useState(initialSessionIds)
  const [regions, setRegions] = useState(initialRegions)
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  // 포커스: 열리면 닫기 버튼으로, Tab은 시트 안에서만 돌고, 닫히면 연 버튼으로 되돌린다 (GatheringDateSheet 와 같은 방식)
  useEffect(() => {
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null
    // preventScroll: 슬라이드 애니메이션 중 포커스로 데스크탑 프레임(overflow-hidden)이 스크롤돼 시트가 밀리지 않게
    closeButtonRef.current?.focus({ preventScroll: true })
    const handleTab = (e: KeyboardEvent) => {
      const dialog = dialogRef.current
      if (e.key !== 'Tab' || !dialog) return
      const focusables = [...dialog.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')]
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (!first) return
      const active = document.activeElement
      if (!dialog.contains(active) || (e.shiftKey && active === first) || (!e.shiftKey && active === last)) {
        e.preventDefault()
        const target = e.shiftKey ? last : first
        target.focus()
      }
    }
    document.addEventListener('keydown', handleTab)
    return () => {
      document.removeEventListener('keydown', handleTab)
      trigger?.focus({ preventScroll: true })
    }
  }, [])

  // ESC 닫기, body 스크롤 잠금(닫으면 복원)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [onClose])

  const upcomingSessions = getUpcomingSessions(gatheringQuery.data?.sessions ?? [])
  // 그새 마감된 회차·목록에 없는 지역은 고른 순서를 지킨 채 뺀다 (신청 1단계와 같은 기준)
  const selectedIds = sessionIds.filter((id) => upcomingSessions.some((session) => session.id === id && isSessionApplicable(session)))
  const regionOptions = regionsQuery.data
  const selectedRegions = regionOptions ? regions.filter((region) => regionOptions.includes(region)) : regions
  const canSubmit = selectedIds.length > 0 && selectedRegions.length > 0

  const handleSubmit = () => {
    updateWishes.mutate(
      { id: applicationId, data: { candidateSessionIds: selectedIds, candidateRegions: selectedRegions } },
      {
        onSuccess: () => {
          showToast(t('wishes.done'))
          onClose()
        },
        // 회차가 그새 마감됐을 수 있어 목록을 다시 받는다 (토스트는 훅이 띄운다)
        onError: () => {
          gatheringQuery.refetch()
          regionsQuery.refetch()
        },
      },
    )
  }

  const isLoading = gatheringQuery.isPending || regionsQuery.isPending
  const isError = gatheringQuery.isError || regionsQuery.isError

  return (
    <div className="fixed lg:absolute inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={t('wishes.button')}
        className="relative flex w-full md:max-w-[430px] max-h-[85vh] flex-col rounded-t-2xl bg-card animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-tag-bg" />
        </div>
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          className="absolute top-2 right-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-tag-text"
          aria-label={tCommon('close')}
        >
          <X size={18} />
        </button>
        <h2 className="px-5 pt-2 pb-4 text-base font-bold text-foreground">{t('wishes.button')}</h2>

        <div className="flex-1 overflow-y-auto px-5">
          {isLoading ? (
            <div className="flex justify-center py-8"><LoadingSpinner /></div>
          ) : isError || !regionOptions ? (
            <ApiErrorMessage
              message={t('errors.failed')}
              onRetry={() => {
                if (gatheringQuery.isError) gatheringQuery.refetch()
                if (regionsQuery.isError) regionsQuery.refetch()
              }}
            />
          ) : (
            <>
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1 h-5 bg-primary rounded-full" />
                  <h3 className="text-base font-bold text-foreground">{tApply('regionsTitle')}</h3>
                </div>
                <DiningRegionChips
                  regions={regionOptions}
                  selected={selectedRegions}
                  label={tApply('regionsTitle')}
                  onToggle={(region) => setRegions((prev) => toggleInOrder(prev, region))}
                />
              </div>
              <GatheringSessionList
                sessions={upcomingSessions}
                selectedSessionId={null}
                onSelect={(sessionId) => setSessionIds((prev) => toggleInOrder(prev, sessionId))}
                priorityIds={selectedIds}
              />
            </>
          )}
        </div>

        <div className="border-t border-tag-bg/50 px-5 pt-3 pb-[max(env(safe-area-inset-bottom),12px)]">
          <Button className="w-full" disabled={!canSubmit || isLoading || isError} isLoading={updateWishes.isPending} onClick={handleSubmit}>
            {t('wishes.submit')}
          </Button>
        </div>
      </div>
    </div>
  )
}
