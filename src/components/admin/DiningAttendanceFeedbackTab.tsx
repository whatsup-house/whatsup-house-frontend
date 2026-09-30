'use client'

import Link from 'next/link'
import dayjs from 'dayjs'
import type { DiningAttendanceStatus } from '@/lib/api/types'
import { useDiningAttendance, useDiningFeedbackSummary, useUpdateDiningAttendance } from '@/lib/hooks/useAdminDining'
import { tableLabel } from '@/lib/utils/diningStatus'
import { getAdminApiErrorMessage, getApiErrorStatus } from '@/lib/utils/apiError'
import { ApiErrorMessage, LoadingSpinner } from '@/components/ui'

const ATTENDANCE_LABEL: Record<DiningAttendanceStatus, string> = {
  SCHEDULED: '참석 예정',
  ATTENDED: '참석',
  CANCELED_EARLY: '사전 취소',
  CANCELED_LATE: '당일 취소',
  NO_SHOW: '노쇼',
}

const TH_CLASS = 'px-3 py-2 text-left text-xs font-medium text-tag-text whitespace-nowrap'
const TD_CLASS = 'px-3 py-2 text-sm text-foreground whitespace-nowrap'

const average = (value: number | null) => (value === null ? '-' : value.toFixed(1))

interface NotReadyProps {
  label: string
}

function NotReady({ label }: NotReadyProps) {
  return <p className="py-8 text-center text-sm text-tag-text">{label}은(는) 준비 중이에요. 기능이 열리면 여기서 볼 수 있어요.</p>
}

interface StatTileProps {
  label: string
  value: string
}

function StatTile({ label, value }: StatTileProps) {
  return (
    <div className="rounded-input bg-tag-bg px-3 py-2">
      <p className="text-xs text-tag-text">{label}</p>
      <p className="text-base font-bold text-foreground">{value}</p>
    </div>
  )
}

interface DiningAttendanceFeedbackTabProps {
  sessionId: string
}

// 참석·피드백 탭: 체크인 현황·노쇼 확정(KAN-349), 피드백 요약(KAN-350). API가 아직 없으면(404) 준비 중 안내 (KAN-352)
export default function DiningAttendanceFeedbackTab({ sessionId }: DiningAttendanceFeedbackTabProps) {
  const attendance = useDiningAttendance(sessionId)
  const feedback = useDiningFeedbackSummary(sessionId)
  const updateAttendance = useUpdateDiningAttendance(sessionId)

  const renderAttendance = () => {
    if (attendance.isLoading) return <div className="flex justify-center py-10"><LoadingSpinner /></div>
    if (attendance.isError || !attendance.data) {
      if (getApiErrorStatus(attendance.error) === 404) return <NotReady label="참석 현황" />
      return (
        <ApiErrorMessage
          message={getAdminApiErrorMessage(attendance.error, '참석 현황을 불러오지 못했어요.')}
          onRetry={() => attendance.refetch()}
        />
      )
    }
    const rows = attendance.data
    if (rows.length === 0) return <p className="py-8 text-center text-sm text-tag-text">확정된 테이블 멤버가 없어요.</p>
    const attendedCount = rows.filter((r) => r.status === 'ATTENDED').length
    return (
      <>
        <p className="mb-2 text-sm text-tag-text">체크인 {attendedCount}/{rows.length}명</p>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-tag-bg">
              <tr>
                {['닉네임', '상태', '체크인', '노쇼'].map((h) => <th key={h} className={TH_CLASS}>{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-tag-bg">
              {rows.map((r) => (
                <tr key={r.attendanceId} className={r.noShowCandidate && r.status !== 'NO_SHOW' ? 'bg-primary-light' : undefined}>
                  <td className={`${TD_CLASS} font-medium`}>{r.nickname}</td>
                  <td className={TD_CLASS}>{ATTENDANCE_LABEL[r.status] ?? r.status}</td>
                  <td className={TD_CLASS}>{r.checkedInAt ? dayjs(r.checkedInAt).format('M/D HH:mm') : '-'}</td>
                  <td className={TD_CLASS}>
                    {r.noShowCandidate && r.status !== 'NO_SHOW' ? (
                      <button
                        onClick={() => {
                          if (confirm(`${r.nickname}님을 노쇼로 확정할까요?`)) {
                            updateAttendance.mutate({ attendanceId: r.attendanceId, status: 'NO_SHOW' })
                          }
                        }}
                        disabled={updateAttendance.isPending}
                        className="px-2.5 h-8 rounded-input border border-primary text-xs font-medium text-primary disabled:opacity-50"
                      >
                        노쇼 확정
                      </button>
                    ) : (
                      <span className="text-tag-text">{r.status === 'NO_SHOW' ? '확정됨' : '-'}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    )
  }

  const renderFeedback = () => {
    if (feedback.isLoading) return <div className="flex justify-center py-10"><LoadingSpinner /></div>
    if (feedback.isError || !feedback.data) {
      if (getApiErrorStatus(feedback.error) === 404) return <NotReady label="피드백 요약" />
      return (
        <ApiErrorMessage
          message={getAdminApiErrorMessage(feedback.error, '피드백 요약을 불러오지 못했어요.')}
          onRetry={() => feedback.refetch()}
        />
      )
    }
    const s = feedback.data
    return (
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2">
          <StatTile label="응답률" value={`${Math.round(s.responseRate * 100)}% (${s.responseCount}/${s.memberCount})`} />
          <StatTile label="테이블 만족도" value={average(s.avgTable)} />
          <StatTile label="대화 만족도" value={average(s.avgTalk)} />
          <StatTile label="식당 만족도" value={average(s.avgVenue)} />
          <StatTile label="재참여 의향" value={`예 ${s.rejoinYes} · 글쎄 ${s.rejoinMaybe} · 아니오 ${s.rejoinNo}`} />
          <Link href="/admin/dining/exceptions" className="block hover:opacity-80">
            <StatTile label="신고 (예외함에서 처리)" value={`${s.reportCount}건`} />
          </Link>
        </div>
        {s.byTable.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-tag-bg">
                <tr>
                  {['테이블', '응답', '테이블', '대화', '식당'].map((h, i) => <th key={i} className={TH_CLASS}>{h}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-tag-bg">
                {s.byTable.map((t) => (
                  <tr key={t.tableId}>
                    <td className={`${TD_CLASS} font-medium`}>{tableLabel(t.tableId)}</td>
                    <td className={TD_CLASS}>{t.responseCount}명</td>
                    <td className={TD_CLASS}>{average(t.avgTable)}</td>
                    <td className={TD_CLASS}>{average(t.avgTalk)}</td>
                    <td className={TD_CLASS}>{average(t.avgVenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="bg-card rounded-card shadow-sm p-4">
        <h2 className="mb-2 font-bold text-base text-foreground">참석 현황</h2>
        {renderAttendance()}
      </section>
      <section className="bg-card rounded-card shadow-sm p-4">
        <h2 className="mb-2 font-bold text-base text-foreground">피드백 요약</h2>
        {renderFeedback()}
      </section>
    </div>
  )
}
