'use client'

import { useState } from 'react'
import { Share2, CreditCard, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { Card } from '@/components/ui'
import AppImage from '@/components/ui/AppImage'
import GatheringReviewSection from './GatheringReviewSection'
import GatheringSessionList from './GatheringSessionList'
import TicketPassSection from './TicketPassSection'
import type { GatheringDetail as GatheringDetailType, GatheringSession } from '@/lib/api/types'

interface GatheringDetailProps {
  gathering: GatheringDetailType
  // 예정된 회차 + ?session=으로 온 지난 회차 (KAN-370)
  sessions: GatheringSession[]
  // 강조할(보고 있는) 회차
  selectedSessionId: string | null
  price: number
  onSelectSession: (sessionId: string) => void
}

export default function GatheringDetail({
  gathering, sessions, selectedSessionId, price, onSelectSession,
}: GatheringDetailProps) {
  const t = useTranslations('gathering.detail')
  const locale = useLocale()
  const { title, thumbnailUrl, description, howToRun, gatheringType } = gathering

  const photos = thumbnailUrl ? [thumbnailUrl] : []
  const [photoIndex, setPhotoIndex] = useState(0)
  const [shareToast, setShareToast] = useState(false)

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
    } catch {
      const el = document.createElement('input')
      el.value = window.location.href
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    setShareToast(true)
    setTimeout(() => setShareToast(false), 2500)
  }

  const handlePrevPhoto = () => setPhotoIndex((i) => (i - 1 + photos.length) % photos.length)
  const handleNextPhoto = () => setPhotoIndex((i) => (i + 1) % photos.length)

  const isRandomTable = gatheringType === 'RANDOM_TABLE'
  const isFreeGathering = price === 0

  return (
    <>
    <div className="bg-card">
      {/* 헤더 */}
      <div className="relative">
        {/* 이미지 슬라이더 */}
        <div className="relative w-full aspect-[390/260] bg-tag-bg overflow-hidden">
          {photos.length > 0 ? (
            <AppImage src={photos[photoIndex]} alt={`${title} ${photoIndex + 1}`} className="object-cover" sizes="(max-width: 390px) 100vw, 390px" />
          ) : (
            <div className="w-full h-full bg-gradient-to-b from-tag-bg to-background" />
          )}

          {/* 헤더 오버레이 */}
          <div className="absolute top-0 left-0 right-0 flex items-center justify-end px-4 py-3">
            <button
              onClick={handleShare}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-black/30 backdrop-blur-sm min-h-[44px] min-w-[44px]"
              aria-label={t('share')}
            >
              <Share2 size={18} className="text-white" />
            </button>
          </div>

          {/* 슬라이더 화살표 (2장 이상) */}
          {photos.length > 1 && (
            <>
              <button
                onClick={handlePrevPhoto}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full bg-black/30 backdrop-blur-sm"
                aria-label={t('previousPhoto')}
              >
                <ChevronLeft size={18} className="text-white" />
              </button>
              <button
                onClick={handleNextPhoto}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full bg-black/30 backdrop-blur-sm"
                aria-label={t('nextPhoto')}
              >
                <ChevronRight size={18} className="text-white" />
              </button>
            </>
          )}

          {/* 하단 영역: 뱃지 + 도트 인디케이터 */}
          <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between">
            <span className="bg-primary text-white text-xs font-medium px-3 py-1.5 rounded-full">
              {t('hostedBy')}
            </span>
            {photos.length > 1 && (
              <div className="flex items-center gap-1.5 mr-1">
                {photos.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPhotoIndex(i)}
                    className={`w-1.5 h-1.5 rounded-full transition-all ${i === photoIndex ? 'bg-white' : 'bg-white/40'}`}
                    aria-label={t('photoLabel', { index: i + 1 })}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 본문 영역 */}
      <div className="px-4 pt-5 pb-4">
        {/* 제목 */}
        <div className="mb-5">
          <h1 className="text-xl font-bold text-foreground leading-tight">{title}</h1>
        </div>

        {/* 회차 목록 — 날짜·시간·지역·잔여 정원·마감, 신청할 회차 선택 (KAN-339) */}
        <GatheringSessionList
          sessions={sessions}
          selectedSessionId={selectedSessionId}
          onSelect={onSelectSession}
        />

        {/* 정보 카드 */}
        <Card className="p-4 mb-6 border border-tag-bg/50">
          <div className="flex flex-col gap-3.5">
            {/* 참가비 / 우연한 식탁 이용권 */}
            <div className="flex items-start gap-3">
              <CreditCard size={18} className="text-tag-text mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-tag-text mb-0.5">{isRandomTable && !isFreeGathering ? '필요 이용권' : t('priceLabel')}</p>
                <p className="text-lg font-bold text-foreground">
                  {isRandomTable && !isFreeGathering ? (
                    <>
                      1회 <span className="text-xs font-normal text-tag-text">({price.toLocaleString(locale)}원 상당)</span>
                    </>
                  ) : isFreeGathering ? (
                    '무료'
                  ) : (
                    <>
                      {t('price', { price: price.toLocaleString(locale) })} <span className="text-xs font-normal text-tag-text">{t('onsitePayment')}</span>
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* 우연한 식탁 이용권 선결제 (KAN-260) */}
        {isRandomTable && !isFreeGathering && <TicketPassSection />}

        {/* 게더링 설명 */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-5 bg-primary rounded-full" />
            <h2 className="text-base font-bold text-foreground">{t('descriptionTitle')}</h2>
          </div>
          <p className="text-sm text-tag-text leading-relaxed whitespace-pre-line">{description}</p>
        </div>

        {/* 진행방식 */}
        {howToRun && howToRun.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-5 bg-primary rounded-full" />
              <h2 className="text-base font-bold text-foreground">{t('howToRunTitle')}</h2>
            </div>
            <div className="flex flex-col gap-4">
              {howToRun.map((step, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-primary-light text-primary text-sm font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {index + 1}
                  </div>
                  <p className="text-sm text-tag-text leading-relaxed pt-1">{step}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 주의사항 */}
        <div className="mb-6">
          <Card className="p-4 bg-[#FFF8F0] border border-[#FFE0B2]">
            <div className="flex items-start gap-2.5">
              <AlertTriangle size={18} className="text-[#E65100] mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-bold text-foreground mb-2">{t('cautionTitle')}</p>
                <ul className="text-sm text-tag-text space-y-1.5">
                  <li>{t('caution1')}</li>
                  <li>{t('caution2')}</li>
                  <li>{t('caution3')}</li>
                </ul>
              </div>
            </div>
          </Card>
        </div>

        {/* 후기 섹션 */}
        <div className="mb-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-1 h-5 bg-primary rounded-full" />
              <h2 className="text-base font-bold text-foreground">{t('reviewsTitle')}</h2>
            </div>
          </div>
          <GatheringReviewSection gatheringId={gathering.id} sessionIds={gathering.sessions.map((session) => session.id)} />
        </div>
      </div>
    </div>

    {shareToast && (
      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-foreground/90 text-white text-sm px-4 py-2.5 rounded-full shadow-lg z-50 whitespace-nowrap pointer-events-none">
        {t('linkCopied')}
      </div>
    )}
    </>
  )
}
