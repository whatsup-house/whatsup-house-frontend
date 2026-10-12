import type { GatheringDetail, GatheringSession } from '@/lib/api/types'
import { SITE_URL } from '@/lib/constants/site'
import { getUpcomingSessions } from '@/lib/utils/gatheringStatus'

// 검색 결과 설명 길이(네이버·구글 모두 대략 80~160자에서 잘린다)
export function toMetaDescription(text: string | null, fallback: string): string {
  const flat = text?.replace(/\s+/g, ' ').trim()
  if (!flat) return fallback
  return flat.length > 150 ? `${flat.slice(0, 149)}…` : flat
}

// 회차 날짜·시간은 KST 기준 값이다.
function toKstDateTime(date: string, time: string | null): string {
  return time ? `${date}T${time}+09:00` : date
}

const SESSION_STATUS_TO_EVENT: Record<GatheringSession['status'], string> = {
  OPEN: 'https://schema.org/EventScheduled',
  CLOSED: 'https://schema.org/EventScheduled',
  DONE: 'https://schema.org/EventScheduled',
  CANCELLED: 'https://schema.org/EventCancelled',
}

// schema.org Event — 다가오는 회차 1개 = Event 1개. 검색·AI가 일시·장소·가격을 읽는다. (KAN-395)
export function buildGatheringJsonLd(gathering: GatheringDetail, brand: string) {
  const url = `${SITE_URL}/gatherings/${gathering.id}`
  const images = [gathering.thumbnailUrl, ...(gathering.imageUrls ?? [])].filter((src): src is string => !!src)

  return getUpcomingSessions(gathering.sessions).map((session) => ({
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: gathering.title,
    description: gathering.description ?? undefined,
    url: `${url}?session=${session.id}`,
    image: images.length > 0 ? images : undefined,
    startDate: toKstDateTime(session.eventDate, session.startTime),
    endDate: session.endTime ? toKstDateTime(session.eventDate, session.endTime) : undefined,
    eventStatus: SESSION_STATUS_TO_EVENT[session.status],
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    maximumAttendeeCapacity: session.maxAttendees,
    location: session.location
      ? { '@type': 'Place', name: session.location.name, address: session.location.address ?? session.location.name }
      : undefined,
    organizer: { '@type': 'Organization', name: brand, url: SITE_URL },
    offers: {
      '@type': 'Offer',
      price: session.price ?? gathering.basePrice ?? 0,
      priceCurrency: 'KRW',
      availability: session.status === 'OPEN' && session.confirmedCount < session.maxAttendees
        ? 'https://schema.org/InStock'
        : 'https://schema.org/SoldOut',
      url: `${url}?session=${session.id}`,
    },
  }))
}
