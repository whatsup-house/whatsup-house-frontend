'use client'

import { useState } from 'react'
import dayjs from 'dayjs'
import { Download } from 'lucide-react'
import type { GatheringSession, MatchStatus } from '@/lib/api/types'
import { useAdminGatheringDetail, useUpdateGatheringStatus } from '@/lib/hooks/useAdminGathering'
import {
  useConfirmDiningTablesNow,
  useDiningApplicants,
  useDiningTables,
  useDownloadDiningCsv,
  useRunDiningMatch,
} from '@/lib/hooks/useAdminDining'
import { toBadgeStatus } from '@/lib/utils/gatheringStatus'
import { formatTimeRange } from '@/lib/utils/date'
import { genderShort } from '@/lib/utils/diningStatus'
import { getAdminApiErrorMessage } from '@/lib/utils/apiError'
import { ApiErrorMessage, Badge, LoadingSpinner } from '@/components/ui'
import GatheringSessionModal from '@/components/admin/GatheringSessionModal'
import DiningTableBoard from '@/components/admin/DiningTableBoard'
import DiningVenueChatTab from '@/components/admin/DiningVenueChatTab'
import DiningAttendanceFeedbackTab from '@/components/admin/DiningAttendanceFeedbackTab'

const TABS = [
  { key: 'applicants', label: '신청자' },
  { key: 'tables', label: '테이블' },
  { key: 'venues', label: '식당과 단체방' },
  { key: 'attendance', label: '참석과 피드백' },
] as const
type TabKey = (typeof TABS)[number]['key']

const MATCH_STATUS_LABEL: Record<MatchStatus, string> = {
  WAITING: '대기',
  MATCHING: '매칭 중',
  CONFIRM_PENDING: '확정 대기',
  CONFIRMED: '확정',
  REALLOCATING: '재배치 중',
  ALTERNATIVE_OFFERED: '대안 제안',
  TRANSFERRED: '회차 이동',
  NO_MATCH: '매칭 실패',
  EXCEPTION: '예외',
}

const ACTION_CLASS =
  'shrink-0 px-4 h-10 rounded-input text-sm font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none'
// 지금 눌러야 할 버튼 하나만 채워서 보여준다: 테이블이 없으면 자동매칭, 제안 테이블이 있으면 전체 즉시 확정.
const PRIMARY_CLASS = 'bg-primary text-white hover:opacity-90'
const SECONDARY_CLASS = 'border border-tag-bg bg-card text-foreground hover:border-primary'
const TH_CLASS = 'px-3 py-2 text-left text-xs font-medium text-tag-text whitespace-nowrap'
const TD_CLASS = 'px-3 py-2 text-sm text-foreground whitespace-nowrap'

interface DiningSessionConsoleProps {
  sessionId: string
}

// 응답에는 유효 가격만 있다. 기본 가격과 다르면 회차 가격(오버라이드)으로 본다. (종류 상세와 같은 변환)
const toEditing = (s: GatheringSession, basePrice: number | null) => ({
  sessionId: s.id,
  values: {
    eventDate: s.eventDate,
    startTime: s.startTime?.slice(0, 5) ?? null,
    endTime: s.endTime?.slice(0, 5) ?? null,
    locationId: s.location?.id ?? '',
    maxAttendees: s.maxAttendees,
    priceOverride: s.price !== null && s.price !== basePrice ? s.price : null,
    applyDeadlineAt: s.applyDeadlineAt?.slice(0, 16) ?? null,
    matchRunAt: s.matchRunAt?.slice(0, 16),
    autoConfirmGraceMinutes: s.autoConfirmGraceMinutes,
    tableSizeMin: s.tableSizeMin ?? undefined,
    tableSizeMax: s.tableSizeMax ?? undefined,
    minGroupScore: s.minGroupScore,
    maxAgeGap: s.maxAgeGap,
  },
})

const formatDateTime = (value: string | null | undefined, empty: string) => (value ? dayjs(value).format('M/D HH:mm') : empty)

// 어드민 우연한 식탁 회차 콘솔: 회차 정보와 액션 헤더 + 신청자/테이블/식당과 단체방/참석과 피드백 탭 (KAN-352)
export default function DiningSessionConsole({ sessionId }: DiningSessionConsoleProps) {
  const detailQuery = useAdminGatheringDetail(sessionId)
  const tablesQuery = useDiningTables(sessionId)
  const [tab, setTab] = useState<TabKey>('applicants')
  const [isEditOpen, setIsEditOpen] = useState(false)
  const runMatch = useRunDiningMatch(sessionId)
  const confirmAll = useConfirmDiningTablesNow(sessionId)
  const { mutate: changeStatus, isPending: isCancelling } = useUpdateGatheringStatus()

  if (detailQuery.isLoading) return <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
  const detail = detailQuery.data
  const session = detail?.sessions.find((s) => s.id === sessionId)
  if (!detail || !session) {
    return (
      <ApiErrorMessage
        message={getAdminApiErrorMessage(detailQuery.error, '회차를 불러오지 못했어요.')}
        onRetry={() => detailQuery.refetch()}
      />
    )
  }

  const isClosed = session.status === 'CANCELLED' || session.status === 'DONE'
  // 지금 남아 있는 테이블 기준(해체된 테이블은 목록에 안 온다). 한 번 돌린 뒤 다 해체했으면 처음처럼 '자동매칭'으로 보인다.
  const tables = tablesQuery.data?.tables ?? []
  const hasTables = tables.length > 0
  const regionResults = tablesQuery.data?.regionResults ?? []
  const proposedIds = tables.filter((t) => t.status === 'PROPOSED').map((t) => t.id)
  const runLabel = hasTables ? '자동매칭 다시 하기' : '자동매칭'
  const dateLabel = dayjs(session.eventDate).format('M.D (dd)')

  const handleRun = () => {
    const message = hasTables
      ? '자동매칭을 다시 할까요?\n\n확정했거나 직접 고친 테이블은 그대로 두고, 나머지 제안 테이블만 새로 짜요.'
      : '자동매칭을 할까요?'
    if (confirm(message)) {
      runMatch.mutate()
    }
  }

  const handleConfirmAll = () => {
    if (confirm(`제안 중인 테이블 ${proposedIds.length}개를 지금 모두 확정할까요?\n규칙을 어기는 테이블은 보류되고 예외함에 남아요.`)) {
      confirmAll.mutate(proposedIds)
    }
  }

  const handleCancel = () => {
    if (confirm(`${dateLabel} 회차를 취소할까요? 되돌릴 수 없어요.`)) changeStatus({ id: sessionId, status: 'CANCELLED' })
  }

  const info: [string, string][] = [
    // 지역은 회차가 아니라 테이블마다 정해진다 → 테이블 카드·지역별 결과에서 본다 (KAN-433)
    ['일시', `${dateLabel} ${formatTimeRange(session.startTime, session.endTime)}`],
    ['정원', `${session.confirmedCount}/${session.maxAttendees}명`],
    ['신청 마감', formatDateTime(session.applyDeadlineAt, '마감 없음')],
    ['자동매칭 예정', formatDateTime(session.matchRunAt, '미정')],
    ['자동 확정까지', session.autoConfirmGraceMinutes != null ? `${session.autoConfirmGraceMinutes}분` : '기본값'],
    ['테이블 크기', session.tableSizeMin && session.tableSizeMax ? `${session.tableSizeMin}~${session.tableSizeMax}명` : '기본값'],
  ]

  return (
    <div className="flex flex-col gap-5">
      <header className="bg-card rounded-card shadow-sm p-4 flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-bold text-[22px] text-foreground break-all">{detail.title}</h1>
          <Badge variant={toBadgeStatus(session.status)} />
        </div>
        <dl className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-x-4 gap-y-2">
          {info.map(([label, value]) => (
            <div key={label} className="min-w-0">
              <dt className="text-xs text-tag-text">{label}</dt>
              <dd className="text-sm font-medium text-foreground truncate">{value}</dd>
            </div>
          ))}
        </dl>
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={handleRun}
            disabled={isClosed || runMatch.isPending}
            className={`${ACTION_CLASS} ${hasTables ? SECONDARY_CLASS : PRIMARY_CLASS}`}
          >
            {runMatch.isPending ? '매칭 중…' : runLabel}
          </button>
          <button
            onClick={handleConfirmAll}
            disabled={isClosed || proposedIds.length === 0 || confirmAll.isPending}
            className={`${ACTION_CLASS} ${proposedIds.length > 0 ? PRIMARY_CLASS : SECONDARY_CLASS}`}
          >
            {confirmAll.isPending ? '확정 중…' : `전체 즉시 확정 (${proposedIds.length})`}
          </button>
          <button
            onClick={() => setIsEditOpen(true)}
            className={`${ACTION_CLASS} ${SECONDARY_CLASS}`}
          >
            회차 수정
          </button>
          <button
            onClick={handleCancel}
            disabled={isClosed || isCancelling}
            className={`${ACTION_CLASS} border border-tag-bg text-tag-text hover:border-primary hover:text-primary`}
          >
            회차 취소
          </button>
        </div>
      </header>

      <nav className="flex gap-1 overflow-x-auto border-b border-tag-bg" aria-label="회차 콘솔 탭">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            aria-current={tab === t.key ? 'page' : undefined}
            className={`-mb-px shrink-0 whitespace-nowrap border-b-2 px-4 py-2 text-sm ${
              tab === t.key ? 'border-primary font-semibold text-primary' : 'border-transparent text-tag-text'
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === 'applicants' && <ApplicantsTab sessionId={sessionId} />}
      {tab === 'tables' && regionResults.length > 0 && (
        // 마지막 자동매칭의 지역별 결과. 미채택 = 테이블 수가 지역 최소 테이블 수에 못 미쳐 그 지역을 열지 않음 (KAN-431)
        <section className="bg-card rounded-card shadow-sm p-4">
          <h3 className="mb-2 text-sm font-bold text-foreground">지역별 매칭 결과</h3>
          <ul className="flex flex-wrap gap-1.5">
            {regionResults.map((r) => (
              <li
                key={r.region}
                className={`rounded-full px-2.5 py-1 text-xs ${r.adopted ? 'bg-primary-light text-primary' : 'bg-tag-bg text-tag-text'}`}
              >
                <span className="font-semibold">{r.region}</span> 후보 {r.candidateCount}명 · 테이블 {r.tableCount}개 · {r.adopted ? '채택' : '미채택'}
              </li>
            ))}
          </ul>
        </section>
      )}
      {tab === 'tables' && <DiningTableBoard sessionId={sessionId} />}
      {tab === 'venues' && <DiningVenueChatTab sessionId={sessionId} />}
      {tab === 'attendance' && <DiningAttendanceFeedbackTab sessionId={sessionId} />}

      {isEditOpen && (
        <GatheringSessionModal
          gatheringId={detail.id}
          gatheringType={detail.gatheringType}
          editing={toEditing(session, detail.basePrice)}
          onClose={() => setIsEditOpen(false)}
        />
      )}
    </div>
  )
}

interface ApplicantsTabProps {
  sessionId: string
}

// 신청자 표. 결제 미완료·제외 관계 행은 강조한다.
function ApplicantsTab({ sessionId }: ApplicantsTabProps) {
  const { data: applicants, isLoading, isError, error, refetch } = useDiningApplicants(sessionId)
  const download = useDownloadDiningCsv(sessionId)

  if (isLoading) return <div className="flex justify-center py-16"><LoadingSpinner /></div>
  if (isError || !applicants) {
    return <ApiErrorMessage message={getAdminApiErrorMessage(error, '신청자를 불러오지 못했어요.')} onRetry={() => refetch()} />
  }

  const unpaidCount = applicants.filter((a) => !a.isPaid).length

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex gap-3 text-sm text-tag-text">
          <span>신청 {applicants.length}명</span>
          <span>결제 미완료 {unpaidCount}명</span>
        </p>
        <button
          onClick={() => download.mutate('applicants')}
          disabled={download.isPending}
          className="inline-flex items-center gap-1 px-3 h-9 rounded-input border border-tag-bg bg-card text-sm text-foreground hover:border-primary disabled:opacity-50"
        >
          <Download size={16} /> CSV
        </button>
      </div>
      {applicants.length === 0 ? (
        <div className="bg-card rounded-card shadow-sm py-12 text-center text-sm text-tag-text">아직 신청자가 없어요.</div>
      ) : (
        <div className="bg-card rounded-card shadow-sm overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-tag-bg">
              <tr>
                {['이름', '나이', '성별', 'MBTI', '결제', '매칭 상태', '희망 회차', '희망 지역', '참가', '제외 관계'].map((h) => (
                  <th key={h} className={TH_CLASS}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-tag-bg">
              {applicants.map((a) => (
                <tr key={a.applicationId} className={!a.isPaid || a.hasExcludedRelation ? 'bg-primary-light' : undefined}>
                  <td className={`${TD_CLASS} font-medium`}>{a.name}</td>
                  <td className={TD_CLASS}>{a.age ?? '-'}</td>
                  <td className={TD_CLASS}>{genderShort(a.gender)}</td>
                  <td className={TD_CLASS}>{a.mbti ?? '-'}</td>
                  <td className={`${TD_CLASS} ${a.isPaid ? '' : 'font-bold text-primary'}`}>{a.isPaid ? '완료' : '미완료'}</td>
                  <td className={TD_CLASS}>{a.matchStatus ? MATCH_STATUS_LABEL[a.matchStatus] : '-'}</td>
                  <td className={TD_CLASS}>
                    {a.candidateSessions.map((c) => (
                      <span key={c.sessionId} className={`mr-2 ${c.sessionId === sessionId ? 'font-bold' : 'text-tag-text'}`}>
                        {c.priority}. {dayjs(c.eventDate).format('M/D')}
                      </span>
                    ))}
                  </td>
                  <td className={TD_CLASS}>{a.candidateRegions?.length ? a.candidateRegions.map((region, index) => `${index + 1}. ${region}`).join(' ') : '-'}</td>
                  <td className={TD_CLASS}>{a.participationCount}회</td>
                  <td className={`${TD_CLASS} ${a.hasExcludedRelation ? 'font-bold text-primary' : 'text-tag-text'}`}>
                    {a.hasExcludedRelation ? '있음' : '없음'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
