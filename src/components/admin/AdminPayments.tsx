'use client'

import { useState } from 'react'
import type { ReactNode } from 'react'
import Link from 'next/link'
import dayjs from 'dayjs'
import { ApiErrorMessage, LoadingSpinner, Pagination } from '@/components/ui'
import {
  useDepositNotifications,
  useLinkDepositNotification,
  useMarkPayoutsSent,
  usePayouts,
} from '@/lib/hooks/useAdminPayment'
import { getAdminApiErrorMessage } from '@/lib/utils/apiError'
import type {
  DepositMatchResult,
  DepositNotification,
  DepositSource,
  PaymentTargetType,
  PayoutStatus,
  PayoutType,
} from '@/lib/api/types'

const RESULT_LABEL: Record<DepositMatchResult, string> = {
  MATCHED: '자동 완료',
  IGNORED: '무시',
  NO_CANDIDATE: '후보 없음',
  MULTIPLE_CANDIDATES: '후보 여러 건',
  PARSE_FAILED: '파싱 실패',
}
const RESULTS = Object.keys(RESULT_LABEL) as DepositMatchResult[]
const RESULT_BADGE_CLASS: Record<DepositMatchResult, string> = {
  MATCHED: 'bg-tag-bg text-mileage-earn',
  IGNORED: 'bg-tag-bg text-tag-text',
  NO_CANDIDATE: 'bg-primary-light text-primary',
  MULTIPLE_CANDIDATES: 'bg-primary-light text-primary',
  PARSE_FAILED: 'bg-primary-light text-primary',
}
const SOURCE_LABEL: Record<DepositSource, string> = {
  MACRODROID: '매크로드로이드',
  IOS_SHORTCUT: 'iOS 단축어',
  SIMULATOR: '시뮬레이터',
}
const TARGET_LABEL: Record<PaymentTargetType, string> = {
  TICKET_PASS: '이용권',
  DEPOSIT: '보증금',
  REGULAR_APPLICATION: '일반 모임 신청',
}
const TARGET_TYPES = Object.keys(TARGET_LABEL) as PaymentTargetType[]
const PAYOUT_TYPE_TABS: { type: PayoutType; label: string }[] = [
  { type: 'REFUND', label: '환불' },
  { type: 'DEPOSIT_RETURN', label: '보증금 반환' },
]
const PAYOUT_STATUS_TABS: { status: PayoutStatus; label: string }[] = [
  { status: 'REQUESTED', label: '송금 대기' },
  { status: 'SENT', label: '송금 완료' },
]
const PAGE_TABS = [
  { key: 'log', label: '입금 알림 로그' },
  { key: 'payout', label: '송금 목록' },
] as const

const won = (amount: number) => `${amount.toLocaleString()}원`
const chipClass = (selected: boolean) =>
  `shrink-0 rounded-full px-3 py-1 text-xs ${selected ? 'bg-primary font-semibold text-white' : 'border border-tag-bg bg-card text-tag-text'}`
const tabClass = (selected: boolean) =>
  `rounded-full px-4 py-1.5 text-sm ${selected ? 'bg-foreground font-semibold text-white' : 'bg-tag-bg text-tag-text'}`
const INPUT_CLASS =
  'h-9 rounded-input border border-tag-bg bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary'

function Centered({ children }: { children: ReactNode }) {
  return <div className="flex h-48 items-center justify-center">{children}</div>
}

interface LinkFormProps {
  notificationId: string
}

// 예외 건 수동 연결 — BE-4 link API가 요구하는 targetType + targetId
function LinkForm({ notificationId }: LinkFormProps) {
  const [targetType, setTargetType] = useState<PaymentTargetType>('TICKET_PASS')
  const [targetId, setTargetId] = useState('')
  const link = useLinkDepositNotification()
  const trimmedId = targetId.trim()

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <select
        value={targetType}
        onChange={(e) => setTargetType(e.target.value as PaymentTargetType)}
        aria-label="연결 대상 유형"
        className={INPUT_CLASS}
      >
        {TARGET_TYPES.map((t) => (
          <option key={t} value={t}>
            {TARGET_LABEL[t]}
          </option>
        ))}
      </select>
      <input
        value={targetId}
        onChange={(e) => setTargetId(e.target.value)}
        placeholder="대상 ID"
        aria-label="연결 대상 ID"
        className={`${INPUT_CLASS} min-w-0 flex-1`}
      />
      <button
        type="button"
        disabled={!trimmedId || link.isPending}
        onClick={() => {
          if (confirm('이 입금을 해당 대상의 결제 완료로 처리할까요?')) {
            link.mutate({ id: notificationId, targetType, targetId: trimmedId })
          }
        }}
        className="h-9 rounded-input border border-foreground bg-foreground px-3 text-xs font-medium text-white disabled:opacity-50"
      >
        신청에 연결
      </button>
    </div>
  )
}

interface NotificationRowProps {
  item: DepositNotification
  isHighlighted: boolean
}

function NotificationRow({ item, isHighlighted }: NotificationRowProps) {
  const needsLink = (item.result === 'NO_CANDIDATE' || item.result === 'MULTIPLE_CANDIDATES') && !item.targetId
  return (
    <li className={`flex flex-col gap-1.5 px-4 py-4 ${isHighlighted ? 'bg-primary-light' : ''}`}>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${RESULT_BADGE_CLASS[item.result]}`}>
          {RESULT_LABEL[item.result]}
        </span>
        <span className="text-[11px] text-tag-text">
          {dayjs(item.receivedAt).format('YY.MM.DD HH:mm:ss')} · {SOURCE_LABEL[item.source]}
        </span>
      </div>
      <p className="whitespace-pre-wrap break-all rounded-input bg-background px-3 py-2 font-mono text-xs text-foreground">
        {item.rawText}
      </p>
      <p className="text-sm text-foreground">
        {item.parsedName ?? '이름 없음'}
        {item.parsedAmount != null && ` · ${won(item.parsedAmount)}`}
        {item.targetType && <span className="text-tag-text"> → {TARGET_LABEL[item.targetType]}</span>}
        {item.applicationId && (
          <Link href="/admin/applications" className="ml-2 text-xs text-primary hover:underline">
            신청 {item.applicationId.slice(0, 8)}
          </Link>
        )}
      </p>
      {item.exceptionCaseId && (
        <Link href="/admin/dining/exceptions" className="self-start text-xs text-primary hover:underline">
          예외함에서 보기
        </Link>
      )}
      {needsLink && item.exceptionCaseId && <LinkForm notificationId={item.id} />}
    </li>
  )
}

interface DepositLogTabProps {
  highlightCaseId?: string
}

function DepositLogTab({ highlightCaseId }: DepositLogTabProps) {
  const [result, setResult] = useState<DepositMatchResult | undefined>(undefined)
  const [page, setPage] = useState(0)
  const query = useDepositNotifications(result, page)
  const items = query.data?.content ?? []

  const selectResult = (next: DepositMatchResult | undefined) => {
    setResult(next)
    setPage(0)
  }

  let content: ReactNode
  if (query.isLoading) {
    content = (
      <Centered>
        <LoadingSpinner />
      </Centered>
    )
  } else if (query.isError) {
    content = (
      <ApiErrorMessage
        message={getAdminApiErrorMessage(query.error, '입금 알림을 불러오지 못했어요.')}
        onRetry={() => query.refetch()}
      />
    )
  } else if (items.length === 0) {
    content = <p className="p-10 text-center text-sm text-tag-text">입금 알림이 없어요.</p>
  } else {
    content = (
      <ul className="divide-y divide-tag-bg">
        {items.map((item) => (
          <NotificationRow
            key={item.id}
            item={item}
            isHighlighted={!!highlightCaseId && item.exceptionCaseId === highlightCaseId}
          />
        ))}
      </ul>
    )
  }

  return (
    <>
      <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
        <button type="button" onClick={() => selectResult(undefined)} className={chipClass(result === undefined)}>
          전체
        </button>
        {RESULTS.map((r) => (
          <button key={r} type="button" onClick={() => selectResult(r)} className={chipClass(result === r)}>
            {RESULT_LABEL[r]}
          </button>
        ))}
      </div>
      <section className="overflow-hidden rounded-card bg-card shadow-sm">{content}</section>
      <div className="mt-4">
        <Pagination currentPage={page} totalPages={query.data?.totalPages ?? 0} onPageChange={setPage} />
      </div>
      <p className="mt-2 text-[11px] text-tag-text">10초마다 자동으로 새로고침돼요.</p>
    </>
  )
}

function PayoutTab() {
  const [type, setType] = useState<PayoutType>('REFUND')
  const [status, setStatus] = useState<PayoutStatus>('REQUESTED')
  const [selected, setSelected] = useState<string[]>([])
  const query = usePayouts(type, status)
  const markSent = useMarkPayoutsSent()
  const items = query.data ?? []
  const isPending = status === 'REQUESTED'
  const allIds = items.map((p) => p.id)
  const isAllSelected = allIds.length > 0 && allIds.every((id) => selected.includes(id))
  const selectedTotal = items.filter((p) => selected.includes(p.id)).reduce((sum, p) => sum + p.amount, 0)

  const changeFilter = (nextType: PayoutType, nextStatus: PayoutStatus) => {
    setType(nextType)
    setStatus(nextStatus)
    setSelected([])
  }
  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  const submit = () => {
    if (!confirm(`${selected.length}건(${won(selectedTotal)})을 송금 완료로 처리할까요? 실제 이체를 마친 건만 처리하세요.`)) return
    markSent.mutate(selected, { onSuccess: () => setSelected([]) })
  }

  let content: ReactNode
  if (query.isLoading) {
    content = (
      <Centered>
        <LoadingSpinner />
      </Centered>
    )
  } else if (query.isError) {
    content = (
      <ApiErrorMessage
        message={getAdminApiErrorMessage(query.error, '송금 목록을 불러오지 못했어요.')}
        onRetry={() => query.refetch()}
      />
    )
  } else if (items.length === 0) {
    content = (
      <p className="p-10 text-center text-sm text-tag-text">
        {isPending ? '송금할 건이 없어요.' : '송금 완료한 건이 없어요.'}
      </p>
    )
  } else {
    content = (
      <ul className="divide-y divide-tag-bg">
        {items.map((p) => (
          <li key={p.id} className="flex items-start gap-3 px-4 py-4">
            {isPending && (
              <input
                type="checkbox"
                checked={selected.includes(p.id)}
                onChange={() => toggle(p.id)}
                aria-label={`${p.user} ${won(p.amount)} 선택`}
                className="mt-1 h-4 w-4 shrink-0 accent-primary"
              />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-foreground">{p.user}</span>
                <span className="shrink-0 text-sm font-bold text-foreground">{won(p.amount)}</span>
              </div>
              <p className="mt-1 break-all text-sm text-foreground">
                {p.bank} {p.accountNumber} · 예금주 {p.holder}
              </p>
              <p className="mt-0.5 text-[11px] text-tag-text">{dayjs(p.createdAt).format('YY.MM.DD HH:mm')} 요청</p>
            </div>
          </li>
        ))}
      </ul>
    )
  }

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {PAYOUT_TYPE_TABS.map((tab) => (
          <button
            key={tab.type}
            type="button"
            onClick={() => changeFilter(tab.type, status)}
            className={tabClass(type === tab.type)}
          >
            {tab.label}
          </button>
        ))}
        <span className="mx-1 h-5 w-px bg-tag-bg" aria-hidden />
        {PAYOUT_STATUS_TABS.map((tab) => (
          <button
            key={tab.status}
            type="button"
            onClick={() => changeFilter(type, tab.status)}
            className={chipClass(status === tab.status)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {isPending && items.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={isAllSelected}
              onChange={() => setSelected(isAllSelected ? [] : allIds)}
              className="h-4 w-4 accent-primary"
            />
            전체 선택
          </label>
          <button
            type="button"
            onClick={submit}
            disabled={selected.length === 0 || markSent.isPending}
            className="rounded-input bg-foreground px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            송금 완료{selected.length > 0 && ` (${selected.length}건 · ${won(selectedTotal)})`}
          </button>
        </div>
      )}
      <section className="overflow-hidden rounded-card bg-card shadow-sm">{content}</section>
    </>
  )
}

interface AdminPaymentsProps {
  highlightCaseId?: string
}

// 운영자 결제 — 입금 알림 로그 / 송금 목록 (KAN-411)
export default function AdminPayments({ highlightCaseId }: AdminPaymentsProps) {
  const [tab, setTab] = useState<(typeof PAGE_TABS)[number]['key']>('log')
  return (
    <div>
      <h1 className="mb-4 text-[22px] font-bold text-foreground">결제 관리</h1>
      <div className="mb-4 flex gap-1 border-b border-tag-bg">
        {PAGE_TABS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm ${
              tab === key ? 'border-primary font-semibold text-primary' : 'border-transparent text-tag-text'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === 'log' ? <DepositLogTab highlightCaseId={highlightCaseId} /> : <PayoutTab />}
    </div>
  )
}
