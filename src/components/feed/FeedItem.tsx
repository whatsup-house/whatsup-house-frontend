'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import dayjs from 'dayjs'
import { useTranslations } from 'next-intl'
import AppImage from '@/components/ui/AppImage'
import CarouselArrows from '@/components/ui/CarouselArrows'
import { useHorizontalSwipe } from '@/lib/hooks/useHorizontalSwipe'
import { useWheelStep } from '@/lib/hooks/useWheelStep'
import FeedVideo from './FeedVideo'
import type { FeedItemKind, FeedMedia } from '@/lib/api/types'

interface FeedItemProps {
  kind: FeedItemKind
  media: FeedMedia[]
  caption: string | null
  postedAt: string
  gathering: { id: string; title: string } | null
  instagramUrl?: string | null
  reviewId?: string | null
  isActive: boolean
  muted: boolean
  onToggleMute: () => void
  speedLocked: boolean
  onToggleSpeedLock: () => void
}

const MEDIA_SIZES = '(min-width: 1024px) 390px, 100vw'
const pillCls = 'pointer-events-auto rounded-full bg-white/20 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm'

export default function FeedItem({
  kind, media, caption, postedAt, gathering, instagramUrl, reviewId, isActive, muted, onToggleMute, speedLocked, onToggleSpeedLock,
}: FeedItemProps) {
  const t = useTranslations('feed')
  const tScroll = useTranslations('ui.scroll')
  const [holding, setHolding] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [slide, setSlide] = useState(0)
  const slidesRef = useRef<HTMLDivElement>(null)
  const step = (dir: 1 | -1) => setSlide((s) => Math.max(0, Math.min(media.length - 1, s + dir)))
  const swipe = useHorizontalSwipe({ onSwipeLeft: () => step(1), onSwipeRight: () => step(-1) })
  useWheelStep(slidesRef, step)

  const kindLabel = kind === 'REVIEW' ? t('kind.review') : media[0]?.type === 'VIDEO' ? t('kind.reels') : t('kind.post')

  const renderMedia = (m: FeedMedia, index: number) =>
    m.type === 'VIDEO' ? (
      <FeedVideo
        src={m.url}
        posterUrl={m.posterUrl}
        isActive={isActive && index === slide}
        muted={muted}
        onToggleMute={onToggleMute}
        onHoldChange={setHolding}
        speedLocked={speedLocked}
        onToggleSpeedLock={onToggleSpeedLock}
      />
    ) : (
      <AppImage src={m.url} alt={caption ?? kindLabel} sizes={MEDIA_SIZES} className="select-none object-contain" draggable={false} />
    )

  return (
    <div
      className="relative h-full w-full snap-start snap-always overflow-hidden bg-black select-none [-webkit-touch-callout:none]"
      onContextMenu={(e) => e.preventDefault()}
    >
      {media.length > 1 ? (
        // 홈 히어로 캐러셀과 같은 방식: 한 번 밀면 한 칸, translateX 로 감속하며 붙는다
        <div ref={slidesRef} className="relative h-full touch-pan-y overflow-hidden" {...swipe}>
          <div
            className="flex h-full transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none"
            style={{ transform: `translateX(-${slide * 100}%)` }}
          >
            {media.map((m, i) => (
              <div key={m.url + i} inert={i !== slide} className="relative h-full w-full shrink-0">
                {renderMedia(m, i)}
              </div>
            ))}
          </div>
          <CarouselArrows
            canPrev={slide > 0}
            canNext={slide < media.length - 1}
            onPrev={() => step(-1)}
            onNext={() => step(1)}
            prevLabel={tScroll('previous')}
            nextLabel={tScroll('next')}
          />
        </div>
      ) : (
        media[0] && renderMedia(media[0], 0)
      )}

      <div
        className={`pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent px-4 pb-4 pt-20 text-white transition-opacity ${
          holding ? 'opacity-0 [&_*]:pointer-events-none' : ''
        }`}
      >
        {media.length > 1 && (
          <div className="mb-3 flex justify-center gap-1">
            {media.map((m, i) => (
              <span key={m.url + i} className={`size-1.5 rounded-full ${i === slide ? 'bg-white' : 'bg-white/40'}`} />
            ))}
          </div>
        )}
        <div className="flex items-center gap-2">
          <Image src="/assets/whatsup-logo.png" alt="" width={32} height={32} className="size-8 rounded-full bg-white object-cover" />
          <span className="text-sm font-semibold">whatsup.house</span>
          <span className="rounded border border-white/60 px-1.5 py-0.5 text-[10px] font-semibold">{kindLabel}</span>
        </div>
        {caption && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className="pointer-events-auto mt-2 block w-full text-left text-sm leading-snug"
          >
            <span data-testid="feed-caption" className={`whitespace-pre-line ${expanded ? 'block' : 'line-clamp-2'}`}>{caption}</span>
          </button>
        )}
        <p className="mt-1 text-xs text-white/70">{dayjs(postedAt).format(t('dateFormat'))}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {gathering && (
            <Link href={`/gatherings/${gathering.id}`} className={pillCls}>
              {t('viewGathering')}
            </Link>
          )}
          {kind === 'POST' && instagramUrl && (
            <a href={instagramUrl} target="_blank" rel="noopener noreferrer" className={pillCls}>
              {t('viewInstagram')}
            </a>
          )}
          {kind === 'REVIEW' && reviewId && gathering && (
            <Link href={`/reviews?highlight=${reviewId}&gathering=${gathering.id}`} className={pillCls}>
              {t('viewReview')}
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
