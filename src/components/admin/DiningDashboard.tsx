'use client'

import { useState } from 'react'
import Link from 'next/link'
import dayjs from 'dayjs'
import { useDiningDashboard } from '@/lib/hooks/useAdminDining'
import { toBadgeStatus } from '@/lib/utils/gatheringStatus'
import { ApiErrorMessage, Badge, LoadingSpinner } from '@/components/ui'
import GatheringSessionModal from '@/components/admin/GatheringSessionModal'

interface TileProps {
  label: string
  value: string
  isAlert?: boolean
}

function Tile({ label, value, isAlert }: TileProps) {
  return (
    <div className={`h-full rounded-card shadow-sm p-4 ${isAlert ? 'bg-primary-light' : 'bg-card'}`}>
      <p className="text-xs font-medium text-tag-text mb-2">{label}</p>
      <p className={`text-2xl font-bold ${isAlert ? 'text-primary' : 'text-foreground'}`}>{value}</p>
    </div>
  )
}

// 우연한 식탁 운영 대시보드: 타일·다가오는 회차 카드·예외함 링크·회차 만들기 (KAN-351)
export default function DiningDashboard() {
  const { data, isLoading, isError, refetch } = useDiningDashboard()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const openExceptionCount = data?.openExceptionCount ?? 0

  const renderContent = () => {
    if (isLoading) return <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
    if (isError || !data) return <ApiErrorMessage message="대시보드를 불러오지 못했어요." onRetry={() => refetch()} />
    return (
      <>
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">
          <Tile label="다가오는 회차" value={`${data.upcomingSessionCount}개`} />
          <Tile label="대기 신청자" value={`${data.waitingApplicantCount}명`} />
          <Tile label="결제 완료" value={`${data.paidApplicantCount}명`} />
          <Tile label="제안 중 테이블" value={`${data.proposedTableCount}개`} />
          <Tile label="확정 테이블" value={`${data.confirmedTableCount}개`} />
          <Link href="/admin/dining/exceptions" className="block hover:opacity-80 transition-opacity">
            <Tile label="열린 예외" value={`${data.openExceptionCount}건`} isAlert={data.openExceptionCount > 0} />
          </Link>
        </div>

        <section>
          <h2 className="font-bold text-base text-foreground mb-3">다가오는 회차 {data.sessions.length}개</h2>
          {data.sessions.length === 0 ? (
            <div className="bg-card rounded-card shadow-sm py-12 text-center text-sm text-tag-text">
              다가오는 회차가 없어요. 회차를 만들어보세요.
            </div>
          ) : (
            <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {data.sessions.map((s) => {
                const matchLabel = s.isMatchRunDone
                  ? '실행 완료'
                  : s.matchRunAt ? `${dayjs(s.matchRunAt).format('M/D HH:mm')} 실행 예정` : '실행 시각 미정'
                return (
                  <li key={s.sessionId}>
                    <Link
                      href={`/admin/dining/sessions/${s.sessionId}`}
                      className="block h-full bg-card rounded-card shadow-sm p-4 border border-transparent hover:border-primary transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="min-w-0">
                          <p className="font-bold text-foreground">
                            {dayjs(s.eventDate).format('M.D (dd)')} {s.startTime?.slice(0, 5)}
                          </p>
                          <p className="text-sm text-tag-text truncate">{s.locationName ?? '지역 미정'} · {s.title}</p>
                        </div>
                        <Badge variant={toBadgeStatus(s.status)} />
                      </div>
                      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                        <dt className="text-tag-text">결제 완료</dt>
                        <dd className="text-right font-medium text-foreground">{s.paidCount}/{s.maxAttendees}명</dd>
                        <dt className="text-tag-text">매칭</dt>
                        <dd className={`text-right ${s.isMatchRunDone ? 'text-foreground' : 'text-tag-text'}`}>{matchLabel}</dd>
                        <dt className="text-tag-text">테이블</dt>
                        <dd className="text-right text-foreground">{s.tableCount}개</dd>
                        <dt className="text-tag-text">예외</dt>
                        <dd className={`text-right ${s.openExceptionCount > 0 ? 'font-bold text-primary' : 'text-foreground'}`}>
                          {s.openExceptionCount}건
                        </dd>
                      </dl>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
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
