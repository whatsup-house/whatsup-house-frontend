import Link from 'next/link'
import { MapPin, Clock, CalendarDays } from 'lucide-react'
import dayjs from 'dayjs'
import Badge from '@/components/ui/Badge'
import type { GatheringListItem } from '@/lib/api/types'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

function formatEventDate(date: string): string {
  const d = dayjs(date)
  return `${d.month() + 1}월 ${d.date()}일 (${WEEKDAYS[d.day()]})`
}

interface GatheringCardProps {
  gathering: GatheringListItem
}

export default function GatheringCard({ gathering }: GatheringCardProps) {
  const {
    id, title, eventDate, startTime, price,
    maxAttendees, thumbnailUrl,
    status, location,
  } = gathering

  return (
    <Link href={`/gatherings/${id}`}>
      <div className="rounded-card bg-card shadow-sm overflow-hidden">
        {/* 썸네일 */}
        <div className="relative w-full aspect-video bg-tag-bg">
          {thumbnailUrl ? (
            <img src={thumbnailUrl} alt={title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-tag-bg" />
          )}
          {status !== 'OPEN' && (
            <div className="absolute inset-0 bg-black/40" />
          )}
          <div className="absolute top-3 right-3">
            <Badge variant={status} />
          </div>
        </div>

        {/* 내용 */}
        <div className="p-4">
          <h3 className="font-semibold text-foreground text-base leading-snug mb-2 line-clamp-2">
            {title}
          </h3>

          <div className="flex flex-col gap-1 text-sm text-tag-text mb-3">
            <div className="flex items-center gap-1.5">
              <CalendarDays size={13} />
              <span>{formatEventDate(eventDate)}</span>
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
            <span className="font-bold text-foreground">{price.toLocaleString()}원</span>
            <span className="text-xs text-tag-text">최대 {maxAttendees}명</span>
          </div>
        </div>
      </div>
    </Link>
  )
}
