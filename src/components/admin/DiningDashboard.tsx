'use client'

import { useState } from 'react'
import Link from 'next/link'
import dayjs from 'dayjs'
import { ChevronRight } from 'lucide-react'
import type { DiningDashboard as DiningDashboardData, DiningDashboardSession, DiningExceptionType } from '@/lib/api/types'
import { useDiningDashboard } from '@/lib/hooks/useAdminDining'
import { toBadgeStatus } from '@/lib/utils/gatheringStatus'
import { ApiErrorMessage, Badge, LoadingSpinner } from '@/components/ui'
import GatheringSessionModal from '@/components/admin/GatheringSessionModal'

// 즉시 조치가 필요한 문제 지표. 0보다 클 때만 칩으로 보이고, 누르면 예외함(유형 필터)으로 간다. 구형 BE 응답엔 값이 없어 숨는다.
const ALERTS: { key: keyof DiningDashboardData; label: string; unit: string; exceptionType?: DiningExceptionType }[] = [
  { key: 'openExceptionCount', label: '열린 예외', unit: '건' },
  { key: 'conflictCount', label: '충돌', unit: '건', exceptionType: 'CONFLICT' },
  { key: 'noVenueTableCount', label: '식당 없는 테이블', unit: '개', exceptionType: 'VENUE' },
  { key: 'notificationFailureCount', label: '발송 실패', unit: '건', exceptionType: 'NOTIFICATION' },
  { key: 'refundFailureCount', label: '환불 실패', unit: '건', exceptionType: 'REFUND' },
  { key: 'openReportCount', label: '미처리 신고', unit: '건', exceptionType: 'SAFETY' },
]

const SECRET_BADGE = 'shrink-0 px-2 py-0.5 rounded-full text-xs font-medium bg-tag-bg text-tag-text'
const sessionHref = (s: DiningDashboardSession) => `/admin/dining/sessions/${s.sessionId}`
const formatWhen = (s: DiningDashboardSession) => `${dayjs(s.eventDate).format('M.D (dd)')} ${s.startTime?.slice(0, 5) ?? ''}`.trim()

// 가장 임박한 회차: 응답이 날짜·시작 시간 순이라 오늘 이후 진행할 첫 회차다. 이번 주에 회차가 있으면 그게 곧 첫 회차.
function pickHeroSession(sessions: DiningDashboardSession[], today = dayjs().format('YYYY-MM-DD')) {
  return sessions.find((s) => s.eventDate >= today && s.status !== 'CANCELLED' && s.status !== 'DONE') ?? sessions[0]
}

// 오늘 ~ 이번 주 일요일
const isThisWeek = (eventDate: string) => {
  const now = dayjs()
  return eventDate >= now.format('YYYY-MM-DD') && eventDate <= now.add((7 - now.day()) % 7, 'day').format('YYYY-MM-DD')
}

interface HeroStatProps {
  label: string
  value: string
  isAlert?: boolean
}

function HeroStat({ label, value, isAlert }: HeroStatProps) {
  return (
    <div className={`rounded-input p-3 sm:p-4 ${isAlert ? 'bg-primary-light' : 'bg-background'}`}>
      <dt className="text-xs font-medium text-tag-text">{label}</dt>
      <dd className={`mt-1 text-2xl sm:text-3xl font-bold ${isAlert ? 'text-primary' : 'text-foreground'}`}>{value}</dd>
    </div>
  )
}

interface HeroSessionCardProps {
  session: DiningDashboardSession
}

// 최상단 히어로: 가장 임박한 회차 하나만 크게. 카드 전체가 회차 상세 링크다.
function HeroSessionCard({ session: s }: HeroSessionCardProps) {
  return (
    <Link
      href={sessionHref(s)}
      className="block bg-card rounded-card shadow-sm p-5 sm:p-6 border border-transparent hover:border-primary transition-colors"
    >
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-primary-light text-primary">
          {isThisWeek(s.eventDate) ? '이번 주' : '다음 회차'}
        </span>
        {s.hidden && <span className={SECRET_BADGE}>심사용</span>}
        <Badge variant={toBadgeStatus(s.status)} />
      </div>
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[28px] sm:text-[34px] font-bold leading-tight text-foreground">{formatWhen(s)}</p>
          <p className="mt-1 text-base text-tag-text truncate">{s.title}</p>
        </div>
        <ChevronRight size={28} className="shrink-0 text-tag-text" aria-hidden />
      </div>
      <dl className="mt-5 grid grid-cols-2 lg:grid-cols-4 gap-3">
        <HeroStat label="결제 완료" value={`${s.paidCount}/${s.maxAttendees}명`} />
        {s.isMatchRunDone ? (
          <HeroStat label="매칭" value="완료" />
        ) : (
          <HeroStat label="매칭 예정" value={s.matchRunAt ? dayjs(s.matchRunAt).format('M/D HH:mm') : '미정'} />
        )}
        <HeroStat label="테이블" value={`${s.tableCount}개`} />
        <HeroStat label="열린 예외" value={`${s.openExceptionCount}건`} isAlert={s.openExceptionCount > 0} />
      </dl>
    </Link>
  )
}

// 우연한 식탁 운영 대시보드: 문제 칩 · 이번 주 회차 히어로 · 나머지 회차 한 줄 목록 · 회차 만들기 (KAN-351, KAN-441)
export default function DiningDashboard() {
  const { data, isLoading, isError, refetch } = useDiningDashboard()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const openExceptionCount = data?.openExceptionCount ?? 0

  const renderContent = () => {
    if (isLoading) return <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
    if (isError || !data) return <ApiErrorMessage message="대시보드를 불러오지 못했어요." onRetry={() => refetch()} />

    const hero = pickHeroSession(data.sessions)
    const rest = data.sessions.filter((s) => s !== hero)
    const alerts = ALERTS.flatMap((alert) => {
      const value = data[alert.key]
      return typeof value === 'number' && value > 0 ? [{ ...alert, value }] : []
    })

    return (
      <>
        {alerts.length > 0 && (
          <ul className="flex flex-wrap gap-2 mb-4" aria-label="조치 필요">
            {alerts.map(({ key, label, unit, value, exceptionType }) => (
              <li key={key}>
                <Link
                  href={exceptionType ? `/admin/dining/exceptions?type=${exceptionType}` : '/admin/dining/exceptions'}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary-light text-sm text-primary hover:opacity-80 transition-opacity"
                >
                  {label} <span className="font-bold">{value}{unit}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {!hero ? (
          <div className="bg-card rounded-card shadow-sm py-12 text-center text-sm text-tag-text">다가오는 회차가 없어요.</div>
        ) : (
          <HeroSessionCard session={hero} />
        )}

        {rest.length > 0 && (
          <section className="mt-6">
            <h2 className="font-bold text-base text-foreground mb-3">이후 회차 {rest.length}개</h2>
            <ul className="bg-card rounded-card shadow-sm divide-y divide-tag-bg overflow-hidden">
              {rest.map((s) => (
                <li key={s.sessionId}>
                  <Link href={sessionHref(s)} className="flex items-center gap-3 px-4 py-3 hover:bg-background transition-colors">
                    <span className="w-28 shrink-0 font-semibold text-foreground">{formatWhen(s)}</span>
                    <span className="flex-1 min-w-0 truncate text-sm text-tag-text">{s.title}</span>
                    {s.hidden && <span className={SECRET_BADGE}>심사용</span>}
                    <span className="shrink-0 text-sm font-medium text-foreground">결제 {s.paidCount}/{s.maxAttendees}</span>
                    <span className="shrink-0"><Badge variant={toBadgeStatus(s.status)} /></span>
                    <ChevronRight size={16} className="shrink-0 text-tag-text" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </>
    )
  }

  return (
    <div className="max-w-[1280px]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <h1 className="font-bold text-[22px] text-foreground">우연한 식탁</h1>
        <div className="flex gap-2 self-start sm:self-auto">
          <Link
            href="/admin/dining/exceptions"
            className="inline-flex items-center gap-2 px-4 h-11 rounded-input border border-tag-bg bg-card text-sm font-medium text-foreground hover:border-primary transition-colors"
          >
            예외함
            {openExceptionCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-primary text-white text-xs font-bold">
                {openExceptionCount}
              </span>
            )}
          </Link>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-5 h-11 bg-primary text-white rounded-input font-medium text-sm hover:opacity-90 transition-opacity"
          >
            + 회차 만들기
          </button>
        </div>
      </div>

      {renderContent()}

      {isCreateOpen && (
        <GatheringSessionModal
          gatheringId={null}
          gatheringType="RANDOM_TABLE"
          editing={null}
          onClose={() => setIsCreateOpen(false)}
        />
      )}
    </div>
  )
}
