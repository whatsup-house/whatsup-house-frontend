import dayjs from 'dayjs'
import { MapPin } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import Badge from '@/components/ui/Badge'
import MapLinkButton from './MapLinkButton'
import type { GatheringSession } from '@/lib/api/types'
import { formatLocalizedShortDate, formatTimeRange } from '@/lib/utils/date'
import { isSessionApplicable, toBadgeStatus } from '@/lib/utils/gatheringStatus'
import { getKakaoMapUrl, getNaverMapUrl } from '@/lib/utils/mapUrl'

interface GatheringSessionListProps {
  sessions: GatheringSession[]
  selectedSessionId: string | null
  onSelect: (sessionId: string) => void
}

// 종류 상세의 회차 목록: 날짜·시간·지역·잔여 정원·마감을 보여주고 신청할 회차 1개를 고른다. (KAN-339)
export default function GatheringSessionList({ sessions, selectedSessionId, onSelect }: GatheringSessionListProps) {
  const t = useTranslations('gathering.detail')
  const locale = useLocale()
  const selected = sessions.find((session) => session.id === selectedSessionId)

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-1 h-5 bg-primary rounded-full" />
        <h2 className="text-base font-bold text-foreground">{t('scheduleTitle')}</h2>
      </div>

      {sessions.length === 0 ? (
        <p className="rounded-card border border-dashed border-tag-bg py-6 text-center text-sm text-tag-text">
          {t('noSchedule')}
        </p>
      ) : (
        <div role="radiogroup" aria-label={t('scheduleTitle')} className="flex flex-col gap-2">
          {sessions.map((session) => {
            const applicable = isSessionApplicable(session)
            const isSelected = session.id === selectedSessionId
            const deadline = applicable && session.applyDeadlineAt
              ? t('applyDeadline', {
                date: `${formatLocalizedShortDate(session.applyDeadlineAt, locale)} ${dayjs(session.applyDeadlineAt).format('HH:mm')}`,
              })
              : null

            return (
              <button
                key={session.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                disabled={!applicable}
                onClick={() => onSelect(session.id)}
                className={`w-full rounded-card border p-3 text-left transition-colors disabled:opacity-50 ${
                  isSelected ? 'border-primary bg-primary-light' : 'border-tag-bg bg-card'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground">
                    {formatLocalizedShortDate(session.eventDate, locale)} {formatTimeRange(session.startTime, session.endTime)}
                  </p>
                  {applicable ? (
                    <span className="shrink-0 text-xs font-medium text-primary">
                      {t('remainingSeats', { count: session.maxAttendees - session.confirmedCount })}
                    </span>
                  ) : (
                    // 모집중이어도 신청 마감이 지났거나 정원이 찼으면 마감
                    <Badge variant={session.status === 'OPEN' ? 'CLOSED' : toBadgeStatus(session.status)} />
                  )}
                </div>
                {(session.location || deadline) && (
                  <p className="mt-1 text-xs text-tag-text">
                    {[session.location?.name, deadline].filter(Boolean).join(' · ')}
                  </p>
                )}
              </button>
            )
          })}
        </div>
      )}

      {selected?.location && (
        <div className="mt-3 flex items-start gap-3">
          <MapPin size={18} className="text-tag-text mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">{selected.location.name}</p>
            {selected.location.address && (
              <p className="text-xs text-tag-text mt-0.5 break-keep">{selected.location.address}</p>
            )}
            <div className="flex flex-wrap items-center gap-2 mt-2.5">
              <MapLinkButton provider="naver" href={getNaverMapUrl(selected.location, selected.location.address)} />
              <MapLinkButton provider="kakao" href={getKakaoMapUrl(selected.location, selected.location.address)} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
