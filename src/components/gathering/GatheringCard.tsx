import Link from 'next/link'
import { MapPin, Clock, CalendarDays } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import Badge from '@/components/ui/Badge'
import AppImage from '@/components/ui/AppImage'
import type { GatheringListItem } from '@/lib/api/types'
import { formatLocalizedShortDate } from '@/lib/utils/date'
import { getEffectiveStatus } from '@/lib/utils/gatheringStatus'

interface GatheringCardProps {
  gathering: GatheringListItem
}

export default function GatheringCard({ gathering }: GatheringCardProps) {
  const t = useTranslations('gathering.card')
  const locale = useLocale()
  const {
    id, title, eventDate, startTime, price,
    maxAttendees, thumbnailUrl,
    status, location, tags,
  } = gathering

  // 과거 모집중 게더링은 진행 완료로 보정해 표시 (KAN-164)
  const effectiveStatus = getEffectiveStatus(status, eventDate)

  const hasChips = (tags?.length ?? 0) > 0
  const thumbnailPosition = title === '우연한 식탁' ? 'center 32%' : undefined

  return (
    <Link href={`/gatherings/${id}`}>
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
              <span>{startTime.slice(0, 5)}</span>
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
