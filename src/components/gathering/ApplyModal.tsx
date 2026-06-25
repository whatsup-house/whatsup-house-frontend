'use client'

import { useEffect } from 'react'
import { useLocale, useTranslations } from 'next-intl'

import { Button } from '@/components/ui'
import AppImage from '@/components/ui/AppImage'
import type { GatheringDetail } from '@/lib/api/types'
import { formatLocalizedShortDate, formatTime } from '@/lib/utils/date'

interface ApplyModalProps {
  gathering: GatheringDetail
  isOpen: boolean
  onClose: () => void
  onLoginApply: () => void
  onGuestApply: () => void
}

export default function ApplyModal({
  gathering,
  isOpen,
  onClose,
  onLoginApply,
  onGuestApply,
}: ApplyModalProps) {
  const t = useTranslations('gathering.apply.modal')
  const tCommon = useTranslations('common')
  const locale = useLocale()
  // body 스크롤 방지
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  const formattedDate = formatLocalizedShortDate(gathering.eventDate, locale)
  const formattedTime = formatTime(gathering.startTime)

  return (
    <div className="fixed lg:absolute inset-0 z-50 flex items-end justify-center">
      {/* 오버레이 */}
      <div
        className="absolute inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />

      {/* 바텀시트 */}
      <div className="relative w-full md:max-w-[430px] bg-card rounded-t-[24px] px-5 pt-6 pb-8 animate-slide-up">
        {/* 핸들바 */}
        <div className="flex justify-center mb-4">
          <div className="w-10 h-1 rounded-full bg-tag-bg" />
        </div>

        {/* 제목 */}
        <h2 className="text-lg font-bold text-foreground text-center mb-5">
          {t('title')}
        </h2>

        {/* 게더링 정보 */}
        <div className="flex items-center gap-3 bg-background rounded-card p-3 mb-6">
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
            <p className="text-xs text-tag-text mt-1">
              {formattedDate} · {formattedTime}
            </p>
          </div>
        </div>

        {/* 버튼들 */}
        <div className="flex flex-col gap-3">
          <Button
            variant="primary"
            size="lg"
            className="w-full flex-col gap-0.5 !py-3.5"
            onClick={onLoginApply}
          >
            <span className="font-bold">{t('memberApply')}</span>
            <span className="text-xs font-normal opacity-80">{t('memberApplyDescription')}</span>
          </Button>

          <Button
            variant="outlined"
            size="lg"
            className="w-full flex-col gap-0.5 !py-3.5"
            onClick={onGuestApply}
          >
            <span className="font-bold">{t('guestApply')}</span>
            <span className="text-xs font-normal opacity-60">{t('guestApplyDescription')}</span>
          </Button>
        </div>

        {/* 취소 */}
        <button
          onClick={onClose}
          className="w-full text-center text-sm text-tag-text mt-5 py-2 min-h-[44px]"
        >
          {tCommon('cancel')}
        </button>
      </div>
    </div>
  )
}
