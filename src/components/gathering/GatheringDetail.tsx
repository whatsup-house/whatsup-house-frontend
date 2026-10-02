'use client'

import { useEffect, useRef, useState } from 'react'
import dayjs from 'dayjs'
import { Share2, CreditCard, AlertTriangle, ChevronLeft, ChevronRight, X, MapPin, CalendarDays } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { Card, Badge } from '@/components/ui'
import AppImage from '@/components/ui/AppImage'
import GatheringReviewSection from './GatheringReviewSection'
import MapLinkButton from './MapLinkButton'
import TicketPassSection from './TicketPassSection'
import type { GatheringDetail as GatheringDetailType, GatheringSession } from '@/lib/api/types'
import { formatLocalizedShortDate, formatTimeRange } from '@/lib/utils/date'
import { isSessionApplicable, toBadgeStatus } from '@/lib/utils/gatheringStatus'
import { getKakaoMapUrl, getNaverMapUrl } from '@/lib/utils/mapUrl'

const SWIPE_THRESHOLD = 50

interface GatheringDetailProps {
  gathering: GatheringDetailType
  // 보고 있는 회차 (지났거나 마감됐어도 보여준다, KAN-370). 예정 회차가 없으면 null
  session: GatheringSession | null
  price: number
  // 고를 수 있는 다른 회차가 있을 때만 준다 → 카드에 '다른 날짜' 버튼 (KAN-386)
  onShowOtherDates?: () => void
}

export default function GatheringDetail({
  gathering, session, price, onShowOtherDates,
}: GatheringDetailProps) {
  const t = useTranslations('gathering.detail')
  const tCommon = useTranslations('common')
  const locale = useLocale()
  const { title, thumbnailUrl, imageUrls, description, howToRun, gatheringType } = gathering

  // 썸네일 + 상세 사진. imageUrls는 BE 배포 전엔 없을 수 있다. (KAN-372)
  const photos = [thumbnailUrl, ...(imageUrls ?? [])].filter((url): url is string => !!url)
  const [photoIndex, setPhotoIndex] = useState(0)
  // 재조회로 사진 수가 줄어도 범위를 벗어나지 않게
  const activeIndex = photoIndex < photos.length ? photoIndex : 0
  const activePhoto = photos[activeIndex]
  // 로드 실패한 사진은 그리지 않아 배경색이 보이게 한다
  const [brokenPhotos, setBrokenPhotos] = useState<string[]>([])
  const markBroken = (url: string) => setBrokenPhotos((prev) => (prev.includes(url) ? prev : [...prev, url]))
  // 전체 화면 뷰어는 슬라이더와 같은 photoIndex를 쓴다 → 누른 사진부터 열리고, 닫으면 마지막에 본 사진이 남는다
  const [isViewerOpen, setIsViewerOpen] = useState(false)
  const touchStartX = useRef(0)
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

  const photoCount = photos.length
  const handlePrevPhoto = () => setPhotoIndex((i) => (i - 1 + photoCount) % photoCount)
  const handleNextPhoto = () => setPhotoIndex((i) => (i + 1) % photoCount)

  // 슬라이더·뷰어 공용 좌우 스와이프
  const swipeHandlers = {
    onTouchStart: (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX },
    onTouchEnd: (e: React.TouchEvent) => {
      const diff = touchStartX.current - e.changedTouches[0].clientX
      if (photoCount < 2 || Math.abs(diff) < SWIPE_THRESHOLD) return
      if (diff > 0) handleNextPhoto()
      else handlePrevPhoto()
    },
  }

  // 뷰어 열린 동안: ESC 닫기, 좌우 방향키 넘김, body 스크롤 잠금(닫으면 복원)
  useEffect(() => {
    if (!isViewerOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsViewerOpen(false)
      else if (photoCount > 1 && e.key === 'ArrowLeft') setPhotoIndex((i) => (i - 1 + photoCount) % photoCount)
      else if (photoCount > 1 && e.key === 'ArrowRight') setPhotoIndex((i) => (i + 1) % photoCount)
    }
    document.addEventListener('keydown', handleKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [isViewerOpen, photoCount])

  const isRandomTable = gatheringType === 'RANDOM_TABLE'
  const isFreeGathering = price === 0
  const isApplicable = !!session && isSessionApplicable(session)
  const deadline = isApplicable && session.applyDeadlineAt
    ? t('applyDeadline', {
      date: `${formatLocalizedShortDate(session.applyDeadlineAt, locale)} ${dayjs(session.applyDeadlineAt).format('HH:mm')}`,
    })
    : null

  return (
    <>
    <div className="bg-card">
      {/* 헤더 */}
      <div className="relative">
        {/* 이미지 슬라이더 */}
        <div className="relative w-full aspect-[390/260] bg-tag-bg overflow-hidden" {...swipeHandlers}>
          {activePhoto ? (
            <button
              type="button"
              onClick={() => setIsViewerOpen(true)}
              className="absolute inset-0"
              aria-label={t('photoLabel', { index: activeIndex + 1 })}
            >
              {!brokenPhotos.includes(activePhoto) && (
                <AppImage key={activePhoto} src={activePhoto} alt={`${title} ${activeIndex + 1}`} className="object-cover" sizes="(max-width: 390px) 100vw, 390px" onError={() => markBroken(activePhoto)} />
              )}
            </button>
          ) : (
            <div className="w-full h-full bg-gradient-to-b from-tag-bg to-background" />
          )}

          {/* 헤더 오버레이 — 빈 영역 탭은 아래 사진으로 통과 */}
          <div className="absolute top-0 left-0 right-0 flex items-center justify-end px-4 py-3 pointer-events-none">
            <button
              onClick={handleShare}
              className="pointer-events-auto w-10 h-10 flex items-center justify-center rounded-full bg-black/30 backdrop-blur-sm min-h-[44px] min-w-[44px]"
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
          <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between pointer-events-none">
            <span className="bg-primary text-white text-xs font-medium px-3 py-1.5 rounded-full">
              {t('hostedBy')}
            </span>
            {photos.length > 1 && (
              <div className="pointer-events-auto flex items-center gap-1.5 mr-1">
                {photos.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPhotoIndex(i)}
                    className={`w-1.5 h-1.5 rounded-full transition-all ${i === activeIndex ? 'bg-white' : 'bg-white/40'}`}
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

        {/* 일정 — 보고 있는 회차 1개 요약. 다른 회차는 달력 바텀시트에서 고른다 (KAN-386) */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-5 bg-primary rounded-full" />
            <h2 className="text-base font-bold text-foreground">{t('scheduleTitle')}</h2>
          </div>
          {session ? (
            <Card className="border border-tag-bg/50 overflow-hidden">
              <div className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground">
                    {formatLocalizedShortDate(session.eventDate, locale)} {formatTimeRange(session.startTime, session.endTime)}
                  </p>
                  {isApplicable ? (
                    <span className="shrink-0 text-xs font-medium text-primary">
                      {t('remainingSeats', { count: session.maxAttendees - session.confirmedCount })}
                    </span>
                  ) : (
                    // 모집중이어도 신청 마감이 지났거나 정원이 찼으면 마감
                    <Badge variant={session.status === 'OPEN' ? 'CLOSED' : toBadgeStatus(session.status)} />
                  )}
                </div>
                {deadline && <p className="mt-1 text-xs text-tag-text">{deadline}</p>}
                {session.location && (
                  <div className="mt-3 flex items-start gap-3">
                    <MapPin size={18} className="text-tag-text mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-foreground">{session.location.name}</p>
                      {session.location.address && (
                        <p className="text-xs text-tag-text mt-0.5 break-keep">{session.location.address}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-2 mt-2.5">
                        <MapLinkButton provider="naver" href={getNaverMapUrl(session.location, session.location.address)} />
                        <MapLinkButton provider="kakao" href={getKakaoMapUrl(session.location, session.location.address)} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
              {onShowOtherDates && (
                <button
                  type="button"
                  onClick={onShowOtherDates}
                  className="flex w-full min-h-[44px] items-center justify-center gap-1.5 border-t border-tag-bg/50 text-sm font-medium text-tag-text active:bg-tag-bg"
                >
                  <CalendarDays size={16} />
                  {t('otherDate')}
                  <ChevronRight size={16} />
                </button>
              )}
            </Card>
          ) : (
            <p className="rounded-card border border-dashed border-tag-bg py-6 text-center text-sm text-tag-text">
              {t('noSchedule')}
            </p>
          )}
        </div>

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

    {/* 전체 화면 사진 뷰어 — 채팅 이미지 뷰어와 같은 모양 (KAN-372) */}
    {isViewerOpen && activePhoto && (
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="fixed lg:absolute inset-0 z-50 flex items-center justify-center bg-black/90"
        onClick={() => setIsViewerOpen(false)}
        {...swipeHandlers}
      >
        <div className="relative h-full w-full">
          {!brokenPhotos.includes(activePhoto) && (
            <AppImage key={activePhoto} src={activePhoto} alt={`${title} ${activeIndex + 1}`} className="object-contain" sizes="100vw" onError={() => markBroken(activePhoto)} />
          )}
        </div>
        <span className="absolute left-1/2 top-5 -translate-x-1/2 text-sm text-white tabular-nums">
          {activeIndex + 1} / {photoCount}
        </span>
        <button
          type="button"
          onClick={() => setIsViewerOpen(false)}
          className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center text-white transition-transform duration-150 ease-out active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label={tCommon('close')}
        >
          <X size={24} />
        </button>
        {photoCount > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handlePrevPhoto() }}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-black/30 text-white"
              aria-label={t('previousPhoto')}
            >
              <ChevronLeft size={24} />
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleNextPhoto() }}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-black/30 text-white"
              aria-label={t('nextPhoto')}
            >
              <ChevronRight size={24} />
            </button>
          </>
        )}
      </div>
    )}

    {shareToast && (
      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-foreground/90 text-white text-sm px-4 py-2.5 rounded-full shadow-lg z-50 whitespace-nowrap pointer-events-none">
        {t('linkCopied')}
      </div>
    )}
    </>
  )
}
