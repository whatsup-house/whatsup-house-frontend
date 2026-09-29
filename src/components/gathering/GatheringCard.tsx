import Link from 'next/link'
import { MapPin, Clock, CalendarDays } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import Badge from '@/components/ui/Badge'
import AppImage from '@/components/ui/AppImage'
import type { GatheringListItem, GatheringSession } from '@/lib/api/types'
import { formatLocalizedShortDate, formatTime } from '@/lib/utils/date'
import { toBadgeStatus } from '@/lib/utils/gatheringStatus'

// 날짜별 목록의 한 줄: 종류 정보 + 그 날의 회차 (KAN-339)
interface GatheringCardProps {
  gathering: GatheringListItem
  session: GatheringSession
}

export default function GatheringCard({ gathering, session }: GatheringCardProps) {
  const t = useTranslations('gathering.card')
  const locale = useLocale()
  const { id, title, thumbnailUrl, tags, basePrice } = gathering
  const { eventDate, startTime, maxAttendees, location } = session
  const price = session.price ?? basePrice ?? 0

  // 회차 상태는 BE가 보정(지난 모집중 → DONE)해서 내려준다
  const effectiveStatus = toBadgeStatus(session.status)

  const hasChips = (tags?.length ?? 0) > 0
  const thumbnailPosition = title === '우연한 식탁' ? 'center 32%' : undefined

  return (
    <Link href={`/gatherings/${id}?session=${session.id}`}>
      <div className="rounded-card bg-card shadow-sm overflow-hidden">
        {/* 썸네일 */}
        <div className="relative w-full aspect-video bg-tag-bg">
          {thumbnailUrl ? (
            <AppImage
              src={thumbnailUrl}
              alt={title}
              className="object-cover"
              style={thumbnailPosition ? { objectPosition: thumbnailPosition } : undefined}
              sizes="(max-width: 390px) 100vw, 390px"
            />
          ) : (
            <div className="w-full h-full bg-tag-bg" />
          )}
          {effectiveStatus !== 'OPEN' && (
            <div className="absolute inset-0 bg-black/40" />
          )}
          <div className="absolute top-3 right-3">
            <Badge variant={effectiveStatus} />
          </div>
        </div>

        {/* 내용 */}
        <div className="p-4">
          <h3 className="font-semibold text-foreground text-base leading-snug mb-2 line-clamp-2">
            {title}
          </h3>

          {hasChips && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {tags?.map((tag) => (
                <span key={tag} className="rounded-full bg-tag-bg px-2 py-0.5 text-xs text-tag-text">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-1 text-sm text-tag-text mb-3">
            <div className="flex items-center gap-1.5">
              <CalendarDays size={13} />
              <span>{formatLocalizedShortDate(eventDate, locale)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock size={13} />
              <span>{formatTime(startTime)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin size={13} />
              <span>{location?.name}</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="font-bold text-foreground">{t('price', { price: price.toLocaleString(locale) })}</span>
            <span className="text-xs text-tag-text">{t('capacity', { count: maxAttendees })}</span>
          </div>
        </div>
      </div>
    </Link>
  )
}
