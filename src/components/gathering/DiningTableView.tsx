'use client'

import { useEffect, useState } from 'react'
import { notFound, useRouter } from 'next/navigation'
import { Calendar, CheckCircle2, Clock, MapPin, MessageCircle, Users, Utensils } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import dayjs from 'dayjs'
import { ApiErrorMessage, Button, Card, LoadingSpinner } from '@/components/ui'
import ErrorView from '@/components/layout/ErrorView'
import MapLinkButton from './MapLinkButton'
import { useDiningCheckIn, useDiningTableDetail } from '@/lib/hooks/useApplications'
import { useRequireAuth } from '@/lib/hooks/useRequireAuth'
import { useToastStore } from '@/lib/store/toastStore'
import { getApiErrorCode, getApiErrorMessage, getApiErrorStatus } from '@/lib/utils/apiError'
import { formatLocalizedFullDate, formatTimeRange } from '@/lib/utils/date'
import { getKakaoMapUrl, getNaverMapUrl } from '@/lib/utils/mapUrl'
import type { DiningAttendanceStatus } from '@/lib/api/types'

const ATTENDANCE_STYLE: Record<DiningAttendanceStatus, string> = {
  SCHEDULED: 'bg-primary-light text-primary',
  ATTENDED: 'bg-teal-100 text-teal-700',
  CANCELED_EARLY: 'bg-tag-bg text-tag-text',
  CANCELED_LATE: 'bg-tag-bg text-tag-text',
  NO_SHOW: 'bg-tag-bg text-tag-text',
}

interface DiningTableViewProps {
  tableId: string
}

// 우연한 식탁 테이블 상세: 일정·식당·구성원 제한 소개·단체방·취소 정책·체크인 (KAN-355)
export default function DiningTableView({ tableId }: DiningTableViewProps) {
  const t = useTranslations('gathering.diningTable')
  const locale = useLocale()
  const router = useRouter()
  const { isLoggedIn, isInitialized } = useRequireAuth()
  const tableQuery = useDiningTableDetail(tableId, isLoggedIn)

  // 회원 전용. 비로그인은 로그인 후 이 화면으로 돌아오게 한다.
  useEffect(() => {
    if (isInitialized && !isLoggedIn) {
      router.replace(`/login?returnUrl=${encodeURIComponent(`/dining/tables/${tableId}`)}`)
    }
  }, [isInitialized, isLoggedIn, router, tableId])

  if (!isInitialized || !isLoggedIn || tableQuery.isPending) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-background">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (tableQuery.isError) {
    const status = getApiErrorStatus(tableQuery.error)
    if (status === 404) notFound()
    if (status === 403) {
      return <ErrorView code="403" title={t('notMemberTitle')} description={t('notMemberDescription')} showBack />
    }
    return (
      <div className="min-h-screen bg-background px-4 pt-20">
        <ApiErrorMessage message={t('loadFailed')} onRetry={() => { tableQuery.refetch() }} />
      </div>
    )
  }

  const { session, venue, chatRoomId, cancelPolicy, myAttendance } = tableQuery.data
  const members = tableQuery.data.members ?? []
  const eventDate = formatLocalizedFullDate(session?.eventDate, locale)
  const timeRange = formatTimeRange(session?.startTime, session?.endTime)

  return (
    <div className="min-h-screen bg-background px-5 py-7 space-y-4">
      <Card className="border border-primary/20 bg-primary-light p-5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-bold text-primary">{t('label')}</p>
          {myAttendance?.status && (
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${ATTENDANCE_STYLE[myAttendance.status]}`}>
              {t(`attendance.${myAttendance.status}`)}
            </span>
          )}
        </div>
        <div className="mt-3 space-y-2 text-sm text-foreground">
          {eventDate && (
            <p className="flex items-center gap-2 text-lg font-bold">
              <Calendar size={18} className="shrink-0 text-primary" />
              {eventDate}
            </p>
          )}
          {timeRange && (
            <p className="flex items-center gap-2 font-medium">
              <Clock size={16} className="shrink-0 text-tag-text" />
              {timeRange}
            </p>
          )}
          {session?.region && (
            <p className="flex items-center gap-2 font-medium">
              <MapPin size={16} className="shrink-0 text-tag-text" />
              {session.region}
            </p>
          )}
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="mb-3 flex items-center gap-2 font-bold text-foreground">
          <Utensils size={18} className="text-primary" />
          {t('venueTitle')}
        </h2>
        {venue ? (
          <>
            <p className="text-sm font-semibold text-foreground">{venue.name}</p>
            {venue.address && <p className="mt-0.5 text-xs text-tag-text break-keep">{venue.address}</p>}
            {venue.priceRange && <p className="mt-1 text-xs text-tag-text">{t('priceRange', { price: venue.priceRange })}</p>}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {/* 운영자가 등록하는 지도 링크는 네이버(naver.me) 기준. 없으면 이름·주소 검색으로 폴백 */}
              <MapLinkButton provider="naver" href={getNaverMapUrl({ name: venue.name, naverMapUrl: venue.mapUrl }, venue.address)} />
              <MapLinkButton provider="kakao" href={getKakaoMapUrl({ name: venue.name }, venue.address)} />
            </div>
          </>
        ) : (
          <p className="text-sm text-tag-text">{t('venuePending')}</p>
        )}
      </Card>

      <Card className="p-5">
        <h2 className="mb-3 flex items-center gap-2 font-bold text-foreground">
          <Users size={18} className="text-primary" />
          {t('membersTitle', { count: members.length })}
        </h2>
        <ul className="divide-y divide-tag-bg">
          {members.map((member, index) => (
            <li key={`${member.nickname}-${index}`} className="py-3 first:pt-0 last:pb-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">{member.nickname}</span>
                {member.mbti && (
                  <span className="rounded-full bg-primary-light px-2 py-0.5 text-[11px] font-bold text-primary">{member.mbti}</span>
                )}
              </div>
              {member.interests && member.interests.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {member.interests.map((interest) => (
                    <span key={interest} className="rounded-full bg-tag-bg px-2.5 py-1 text-xs text-tag-text">{interest}</span>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      </Card>

      <Card className="p-5">
        <h2 className="mb-2 flex items-center gap-2 font-bold text-foreground">
          <MessageCircle size={18} className="text-primary" />
          {t('topicsTitle')}
        </h2>
        <p className="text-sm leading-relaxed text-tag-text">{t('topicsGuide')}</p>
        <Button
          className="mt-4 w-full"
          variant={chatRoomId ? 'primary' : 'secondary'}
          disabled={!chatRoomId}
          onClick={() => { if (chatRoomId) router.push(`/chat/${chatRoomId}`) }}
        >
          {chatRoomId ? t('enterChat') : t('chatPreparing')}
        </Button>
      </Card>

      {cancelPolicy && (
        <Card className="p-5">
          <h2 className="mb-2 font-bold text-foreground">{t('cancelPolicyTitle')}</h2>
          <p className="whitespace-pre-line text-sm leading-relaxed text-tag-text">{cancelPolicy}</p>
        </Card>
      )}

      <CheckInCard
        tableId={tableId}
        eventDate={session?.eventDate ?? null}
        startTime={session?.startTime ?? null}
        attendanceStatus={myAttendance?.status ?? null}
      />
    </div>
  )
}

interface CheckInCardProps {
  tableId: string
  eventDate: string | null
  startTime: string | null
  attendanceStatus: DiningAttendanceStatus | null
}

const CHECK_IN_WINDOW_HOURS = 2

// 회차 시작 ±2시간(BE와 같은 기준). 최종 판정은 서버가 한다.
// ponytail: 브라우저 시간대를 KST로 가정 — 해외 시간대 사용자가 생기면 회차 시각에 오프셋을 받아 계산
function getCheckInWindow(eventDate: string | null, startTime: string | null) {
  if (!eventDate || !startTime) return null
  const start = dayjs(`${eventDate}T${startTime}`)
  if (!start.isValid()) return null
  return {
    from: start.subtract(CHECK_IN_WINDOW_HOURS, 'hour'),
    to: start.add(CHECK_IN_WINDOW_HOURS, 'hour'),
  }
}

function CheckInCard({ tableId, eventDate, startTime, attendanceStatus }: CheckInCardProps) {
  const t = useTranslations('gathering.diningTable')
  const showToast = useToastStore((state) => state.show)
  const checkIn = useDiningCheckIn(tableId)
  const [now, setNow] = useState(() => Date.now())
  const [isClosedByServer, setIsClosedByServer] = useState(false)

  // 화면을 켜 둔 채 체크인 창이 열리거나 닫혀도 버튼이 따라가게 한다
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => window.clearInterval(timer)
  }, [])

  const checkInWindow = getCheckInWindow(eventDate, startTime)
  const isInWindow = !isClosedByServer && !!checkInWindow
    && now >= checkInWindow.from.valueOf() && now <= checkInWindow.to.valueOf()
  // 취소·노쇼는 체크인 대상이 아니다 (상단 배지로 상태를 보여준다)
  const isEligible = attendanceStatus === null || attendanceStatus === 'SCHEDULED'

  const handleCheckIn = () => {
    checkIn.mutate(undefined, {
      onSuccess: () => showToast(t('checkInSuccess')),
      onError: (error) => {
        if (getApiErrorCode(error) === 'CHECKIN_WINDOW_CLOSED') {
          setIsClosedByServer(true)
          showToast(t('checkInWindowClosed'), 'error')
          return
        }
        showToast(getApiErrorMessage(error, t('checkInFailed')), 'error')
      },
    })
  }

  return (
    <Card className="p-5">
      <h2 className="mb-3 font-bold text-foreground">{t('checkInTitle')}</h2>
      {attendanceStatus === 'ATTENDED' ? (
        <Button className="w-full gap-2" variant="secondary" disabled>
          <CheckCircle2 size={18} />
          {t('checkedIn')}
        </Button>
      ) : (
        <>
          <Button
            className="w-full"
            disabled={!isEligible || !isInWindow}
            isLoading={checkIn.isPending}
            onClick={handleCheckIn}
          >
            {t('checkIn')}
          </Button>
          {isEligible && !isInWindow && (
            <p className="mt-2 text-xs text-tag-text">
              {checkInWindow
                ? t('checkInWindow', { from: checkInWindow.from.format('HH:mm'), to: checkInWindow.to.format('HH:mm') })
                : t('checkInUnavailable')}
            </p>
          )}
        </>
      )}
    </Card>
  )
}
