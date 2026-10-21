'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import dayjs from 'dayjs'
import { Download, X } from 'lucide-react'
import type {
  ApplicationStatus,
  DiningApplicantFilter,
  DiningPaymentStatus,
  DiningStatusLog,
  GatheringSession,
  MatchStatus,
} from '@/lib/api/types'
import { useAdminGatheringDetail, useUpdateGatheringStatus } from '@/lib/hooks/useAdminGathering'
import {
  useConfirmDiningTablesNow,
  useDiningApplicants,
  useDiningApplicationHistory,
  useDiningTables,
  useDownloadDiningCsv,
  useRunDiningMatch,
} from '@/lib/hooks/useAdminDining'
import { toBadgeStatus } from '@/lib/utils/gatheringStatus'
import { formatTimeRange } from '@/lib/utils/date'
import { MATCH_STATUS_LABEL, PAYMENT_STATUS_LABEL, genderShort } from '@/lib/utils/diningStatus'
import { getAdminApiErrorMessage } from '@/lib/utils/apiError'
import { showConfirm } from '@/lib/store/dialogStore'
import { useDiningRegions } from '@/lib/hooks/useApplications'
import { ApiErrorMessage, Badge, LoadingSpinner } from '@/components/ui'
import GatheringSessionModal from '@/components/admin/GatheringSessionModal'
import DiningTableBoard from '@/components/admin/DiningTableBoard'
import DiningVenueChatTab from '@/components/admin/DiningVenueChatTab'
import DiningAttendanceFeedbackTab from '@/components/admin/DiningAttendanceFeedbackTab'
import DiningNoticeLogTab from '@/components/admin/DiningNoticeLogTab'

// chart.js 는 캔버스·CSS 변수를 브라우저에서만 읽는다 → SSR 하지 않는다 (KAN-441)
const DiningSessionInsights = dynamic(() => import('@/components/admin/DiningSessionInsights'), {
  ssr: false,
  loading: () => <div className="flex justify-center py-16"><LoadingSpinner /></div>,
})

const TABS = [
  { key: 'overview', label: '한눈에 보기' },
  { key: 'applicants', label: '신청자' },
  { key: 'tables', label: '테이블' },
  { key: 'venues', label: '식당과 단체방' },
  { key: 'attendance', label: '참석과 피드백' },
  { key: 'notices', label: '안내 이력' },
] as const
type TabKey = (typeof TABS)[number]['key']

const PAYMENT_ALERT: DiningPaymentStatus[] = ['PENDING', 'FAILED', 'REFUND_FAILED']

const APPLICATION_STATUS_LABEL: Record<ApplicationStatus, string> = {
  PENDING: '심사중',
  PAYMENT_PENDING: '입금 대기',
  CONFIRMED: '확정',
  REJECTED: '거절',
  CANCELLED: '취소',
  ATTENDED: '참석',
}

const LOG_FIELD_LABEL: Record<DiningStatusLog['field'], string> = {
  STATUS: '신청 상태',
  MATCH_STATUS: '매칭 상태',
  PAYMENT: '결제',
}
const LOG_VALUE_LABEL: Record<DiningStatusLog['field'], Record<string, string>> = {
  STATUS: APPLICATION_STATUS_LABEL,
  MATCH_STATUS: MATCH_STATUS_LABEL,
  PAYMENT: PAYMENT_STATUS_LABEL,
}
const logValue = (field: DiningStatusLog['field'], value: string | null) => (value ? LOG_VALUE_LABEL[field][value] ?? value : '-')

const ACTION_CLASS =
  'shrink-0 px-4 h-10 rounded-input text-sm font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none'
// 지금 눌러야 할 버튼 하나만 채워서 보여준다: 테이블이 없으면 자동매칭, 제안 테이블이 있으면 전체 즉시 확정.
const PRIMARY_CLASS = 'bg-primary text-white hover:opacity-90'
const SECONDARY_CLASS = 'border border-tag-bg bg-card text-foreground hover:border-primary'
const TH_CLASS = 'px-3 py-2 text-left text-xs font-medium text-tag-text whitespace-nowrap'
const TD_CLASS = 'px-3 py-2 text-sm text-foreground whitespace-nowrap'
const SELECT_CLASS = 'h-9 rounded-input border border-tag-bg bg-card px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary'

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
  const [tab, setTab] = useState<TabKey>('overview')
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

  const handleRun = async () => {
    const ok = hasTables
      ? await showConfirm('확정했거나 직접 고친 테이블은 그대로 두고, 나머지 제안 테이블만 새로 짜요.', { title: '자동매칭을 다시 할까요?' })
      : await showConfirm('자동매칭을 할까요?')
    if (ok) runMatch.mutate()
  }

  const handleConfirmAll = async () => {
    const ok = await showConfirm('규칙을 어기는 테이블은 보류되고 예외함에 남아요.', {
      title: `제안 중인 테이블 ${proposedIds.length}개를 지금 모두 확정할까요?`,
    })
    if (ok) confirmAll.mutate(proposedIds)
  }

  const handleCancel = async () => {
    const ok = await showConfirm('되돌릴 수 없어요.', { title: `${dateLabel} 회차를 취소할까요?`, confirmLabel: '회차 취소', destructive: true })
    if (ok) changeStatus({ id: sessionId, status: 'CANCELLED' })
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

      {tab === 'overview' && <DiningSessionInsights sessionId={sessionId} />}
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
      {tab === 'notices' && <DiningNoticeLogTab sessionId={sessionId} />}

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

// 신청자 표. 결제 미완료·제외 관계 행은 강조한다. 결제·매칭·지역 필터, 행을 누르면 상태 이력 (KAN-440)
function ApplicantsTab({ sessionId }: ApplicantsTabProps) {
  const [filter, setFilter] = useState<DiningApplicantFilter>({})
  const [historyOf, setHistoryOf] = useState<{ applicationId: string; name: string } | null>(null)
  const { data: applicants, isLoading, isError, error, refetch } = useDiningApplicants(sessionId, filter)
  const { data: regions = [] } = useDiningRegions()
  const download = useDownloadDiningCsv(sessionId)

  if (isLoading) return <div className="flex justify-center py-16"><LoadingSpinner /></div>
  if (isError || !applicants) {
    return <ApiErrorMessage message={getAdminApiErrorMessage(error, '신청자를 불러오지 못했어요.')} onRetry={() => refetch()} />
  }

  const unpaidCount = applicants.filter((a) => !a.isPaid).length
  const hasReportCount = applicants.some((a) => a.reportCount !== undefined)
  const isFiltered = !!(filter.paymentStatus || filter.matchStatus || filter.region)
  const headers = ['이름', '나이', '성별', 'MBTI', '결제', '매칭 상태', '희망 회차', '희망 지역', '참가', '제외 관계', ...(hasReportCount ? ['신고'] : [])]

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <p className="flex gap-3 text-sm text-tag-text">
            <span>신청 {applicants.length}명</span>
            <span>결제 미완료 {unpaidCount}명</span>
          </p>
          <select
            value={filter.paymentStatus ?? ''}
            onChange={(e) => setFilter((f) => ({ ...f, paymentStatus: (e.target.value || undefined) as DiningPaymentStatus | undefined }))}
            aria-label="결제 상태"
            className={SELECT_CLASS}
          >
            <option value="">결제 전체</option>
            {(Object.keys(PAYMENT_STATUS_LABEL) as DiningPaymentStatus[]).map((s) => (
              <option key={s} value={s}>{PAYMENT_STATUS_LABEL[s]}</option>
            ))}
          </select>
          <select
            value={filter.matchStatus ?? ''}
            onChange={(e) => setFilter((f) => ({ ...f, matchStatus: (e.target.value || undefined) as MatchStatus | undefined }))}
            aria-label="매칭 상태"
            className={SELECT_CLASS}
          >
            <option value="">매칭 전체</option>
            {(Object.keys(MATCH_STATUS_LABEL) as MatchStatus[]).map((s) => (
              <option key={s} value={s}>{MATCH_STATUS_LABEL[s]}</option>
            ))}
          </select>
          {regions.length > 0 && (
            <select
              value={filter.region ?? ''}
              onChange={(e) => setFilter((f) => ({ ...f, region: e.target.value || undefined }))}
              aria-label="지역"
              className={SELECT_CLASS}
            >
              <option value="">지역 전체</option>
              {regions.map((region) => <option key={region} value={region}>{region}</option>)}
            </select>
          )}
        </div>
        <button
          onClick={() => download.mutate('applicants')}
          disabled={download.isPending}
          className="inline-flex items-center gap-1 px-3 h-9 rounded-input border border-tag-bg bg-card text-sm text-foreground hover:border-primary disabled:opacity-50"
        >
          <Download size={16} /> CSV
        </button>
      </div>
      {applicants.length === 0 ? (
        <div className="bg-card rounded-card shadow-sm py-12 text-center text-sm text-tag-text">
          {isFiltered ? '조건에 맞는 신청자가 없어요.' : '아직 신청자가 없어요.'}
        </div>
      ) : (
        <div className="bg-card rounded-card shadow-sm overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-tag-bg">
              <tr>
                {headers.map((h) => (
                  <th key={h} className={TH_CLASS}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-tag-bg">
              {applicants.map((a) => (
                <tr
                  key={a.applicationId}
                  onClick={() => setHistoryOf({ applicationId: a.applicationId, name: a.name })}
                  className={`cursor-pointer hover:bg-background ${!a.isPaid || a.hasExcludedRelation ? 'bg-primary-light' : ''}`}
                >
                  <td className={`${TD_CLASS} font-medium`}>
                    {/* 키보드 접근용. 클릭은 행으로 올라간다 */}
                    <button type="button" className="font-medium hover:underline">{a.name}</button>
                  </td>
                  <td className={TD_CLASS}>{a.age ?? '-'}</td>
                  <td className={TD_CLASS}>{genderShort(a.gender)}</td>
                  <td className={TD_CLASS}>{a.mbti ?? '-'}</td>
                  {a.paymentStatus ? (
                    <td className={`${TD_CLASS} ${PAYMENT_ALERT.includes(a.paymentStatus) ? 'font-bold text-primary' : ''}`}>
                      {PAYMENT_STATUS_LABEL[a.paymentStatus] ?? a.paymentStatus}
                    </td>
                  ) : (
                    <td className={`${TD_CLASS} ${a.isPaid ? '' : 'font-bold text-primary'}`}>{a.isPaid ? '완료' : '미완료'}</td>
                  )}
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
                  {hasReportCount && (
                    <td className={`${TD_CLASS} ${a.reportCount ? 'font-bold text-primary' : 'text-tag-text'}`}>{a.reportCount ?? 0}건</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {historyOf && (
        <ApplicationHistoryDrawer
          sessionId={sessionId}
          applicationId={historyOf.applicationId}
          name={historyOf.name}
          onClose={() => setHistoryOf(null)}
        />
      )}
    </section>
  )
}

interface ApplicationHistoryDrawerProps {
  sessionId: string
  applicationId: string
  name: string
  onClose: () => void
}

// 신청 상태·매칭 상태·결제 변경 이력 드로어, 최신순 (KAN-440)
function ApplicationHistoryDrawer({ sessionId, applicationId, name, onClose }: ApplicationHistoryDrawerProps) {
  const { data: logs, isLoading, isError, error, refetch } = useDiningApplicationHistory(sessionId, applicationId)

  const renderBody = () => {
    if (isLoading) return <div className="flex justify-center py-16"><LoadingSpinner /></div>
    if (isError || !logs) {
      return <ApiErrorMessage message={getAdminApiErrorMessage(error, '상태 이력을 불러오지 못했어요.')} onRetry={() => refetch()} />
    }
    if (logs.length === 0) return <p className="py-12 text-center text-sm text-tag-text">상태 이력이 없어요.</p>
    return (
      <ul className="divide-y divide-tag-bg">
        {logs.map((log, i) => (
          <li key={`${log.at}-${i}`} className="flex flex-col gap-1 py-3">
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="font-semibold text-foreground">{LOG_FIELD_LABEL[log.field] ?? log.field}</span>
              <span className="shrink-0 text-tag-text">{dayjs(log.at).format('YY.MM.DD HH:mm')}</span>
            </div>
            <p className="text-sm text-foreground">
              {logValue(log.field, log.from)} → <span className="font-semibold">{logValue(log.field, log.to)}</span>
            </p>
            <p className="flex flex-wrap gap-2 text-sm text-tag-text">
              <span>{log.actorName ?? '시스템'}</span>
              {log.reason && <span className="break-all">{log.reason}</span>}
            </p>
          </li>
        ))}
      </ul>
    )
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dining-history-title"
        className="fixed inset-y-0 right-0 z-50 flex h-full w-full flex-col bg-card shadow-2xl sm:w-[480px]"
      >
        <div className="flex items-center justify-between border-b border-tag-bg px-6 py-4">
          <h2 id="dining-history-title" className="text-[18px] font-bold text-foreground">{name} 상태 이력</h2>
          <button type="button" onClick={onClose} className="text-tag-text" aria-label="닫기">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-2">{renderBody()}</div>
      </div>
    </>
  )
}
