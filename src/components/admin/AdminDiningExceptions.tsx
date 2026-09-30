'use client'

import { useState } from 'react'
import type { ReactNode } from 'react'
import Link from 'next/link'
import dayjs from 'dayjs'
import { ApiErrorMessage, LoadingSpinner } from '@/components/ui'
import { useDiningExceptions, useDiningVenues, useResolveDiningException } from '@/lib/hooks/useAdminDiningOps'
import { getAdminApiErrorMessage } from '@/lib/utils/apiError'
import type { DiningExceptionStatus, DiningExceptionType, DiningSafetyAction } from '@/lib/api/types'

const TYPE_LABEL: Record<DiningExceptionType, string> = {
  PAYMENT: '결제',
  DATA: '데이터',
  VENUE: '식당',
  NOTIFICATION: '알림',
  SAFETY: '신고',
  CONFLICT: '충돌',
  REFUND: '환불',
}
const TYPES = Object.keys(TYPE_LABEL) as DiningExceptionType[]

const STATUS_TABS: { status: DiningExceptionStatus; label: string }[] = [
  { status: 'OPEN', label: '열림' },
  { status: 'RESOLVED', label: '해결' },
]

// RESTRICT/BAN은 신청 회원의 우연한 식탁 참여 자격을 RESTRICTED로 바꾼다(신청이 연결된 건만).
const SAFETY_ACTION_LABEL: Record<DiningSafetyAction, string> = {
  WARN: '경고',
  RESTRICT: '제한',
  BAN: '영구제한',
}
const SAFETY_ACTIONS = Object.keys(SAFETY_ACTION_LABEL) as DiningSafetyAction[]

const CHIP_CLASS = 'shrink-0 rounded-full px-3 py-1 text-xs'
const ACTION_CLASS =
  'rounded-input border px-3 py-1.5 text-xs font-medium disabled:border-tag-bg disabled:bg-transparent disabled:text-tag-text disabled:opacity-60'

interface VenueSelectProps {
  value: string
  onChange: (venueId: string) => void
}

// 활성 식당만. 회차 식당 풀에 없는 식당이면 서버가 400으로 거절한다.
function VenueSelect({ value, onChange }: VenueSelectProps) {
  const { data: venues = [] } = useDiningVenues()
  return (
    <label className="flex flex-col gap-1 text-xs text-tag-text">
      배정할 식당 (회차 식당 풀에 있는 식당만)
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 rounded-input border border-tag-bg bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
      >
        <option value="">식당 배정 없이 처리</option>
        {venues
          .filter((v) => v.isActive)
          .map((v) => (
            <option key={v.id} value={v.id}>
              {v.name} ({v.region})
            </option>
          ))}
      </select>
    </label>
  )
}

interface ExceptionCaseActionsProps {
  caseId: string
  type: DiningExceptionType
  tableId: string | null
  hasApplication: boolean
}

// 열린 예외의 처리 영역. 메모 없이는 어떤 버튼도 누를 수 없다.
function ExceptionCaseActions({ caseId, type, tableId, hasApplication }: ExceptionCaseActionsProps) {
  const [note, setNote] = useState('')
  const [venueId, setVenueId] = useState('')
  const resolve = useResolveDiningException()
  const trimmedNote = note.trim()
  const isDisabled = !trimmedNote || resolve.isPending

  const submit = (action?: DiningSafetyAction) => {
    resolve.mutate({
      id: caseId,
      note: trimmedNote,
      action,
      venueAssignment: tableId && venueId ? { tableId, venueId } : undefined,
    })
  }

  const handleSafety = (action: DiningSafetyAction) => {
    const label = SAFETY_ACTION_LABEL[action]
    if (action !== 'WARN' && !confirm(`'${label}' 조치하면 이 회원은 우연한 식탁에 참여할 수 없어요. 진행할까요?`)) return
    submit(action)
  }

  let resolveLabel = '처리 완료'
  if (type === 'VENUE' && venueId) resolveLabel = '식당 배정 후 처리'
  // ponytail: 재발송 전용 API(KAN-346) 전까지는 처리 완료(PATCH RESOLVED)로만 동작한다.
  if (type === 'NOTIFICATION') resolveLabel = '재발송 처리'
  if (type === 'REFUND') resolveLabel = '수동 환불 완료'

  return (
    <div className="flex flex-col gap-2">
      {type === 'VENUE' && tableId && <VenueSelect value={venueId} onChange={setVenueId} />}
      {type === 'NOTIFICATION' && (
        <p className="text-xs text-tag-text">자동 재발송은 아직 지원되지 않아요. 직접 안내한 뒤 메모를 남겨 처리해주세요.</p>
      )}
      {type === 'REFUND' && <p className="text-xs text-tag-text">직접 환불한 뒤 메모를 남겨 처리해주세요.</p>}
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={2000}
        rows={2}
        placeholder="처리 메모 (필수)"
        aria-label="처리 메모"
        className="w-full resize-y rounded-input border border-tag-bg bg-card px-3 py-2 text-sm text-foreground placeholder:text-tag-text focus:outline-none focus:ring-2 focus:ring-primary"
      />
      <div className="flex flex-wrap gap-2">
        {type === 'SAFETY' ? (
          SAFETY_ACTIONS.map((action) => {
            const needsApplication = action !== 'WARN' && !hasApplication
            return (
              <button
                key={action}
                type="button"
                onClick={() => handleSafety(action)}
                disabled={isDisabled || needsApplication}
                title={needsApplication ? '신청이 연결되지 않은 신고는 경고만 할 수 있어요.' : undefined}
                className={`${ACTION_CLASS} ${action === 'WARN' ? 'border-foreground text-foreground' : 'border-primary bg-primary text-white'}`}
              >
                {SAFETY_ACTION_LABEL[action]}
              </button>
            )
          })
        ) : (
          <button
            type="button"
            onClick={() => submit()}
            disabled={isDisabled}
            className={`${ACTION_CLASS} border-foreground bg-foreground text-white`}
          >
            {resolveLabel}
          </button>
        )}
      </div>
    </div>
  )
}

// 우연한 식탁 예외함 — 전체 회차 횡단, 유형 필터, 열림/해결 탭 (KAN-353)
export default function AdminDiningExceptions() {
  const [type, setType] = useState<DiningExceptionType | undefined>(undefined)
  const [status, setStatus] = useState<DiningExceptionStatus>('OPEN')
  const casesQuery = useDiningExceptions(type, status)
  const cases = casesQuery.data ?? []

  let content: ReactNode
  if (casesQuery.isLoading) {
    content = (
      <div className="flex h-48 items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  } else if (casesQuery.isError) {
    content = (
      <ApiErrorMessage
        message={getAdminApiErrorMessage(casesQuery.error, '예외 목록을 불러오지 못했어요.')}
        onRetry={() => casesQuery.refetch()}
      />
    )
  } else if (cases.length === 0) {
    content = (
      <p className="p-10 text-center text-sm text-tag-text">
        {status === 'OPEN' ? '처리할 예외가 없어요.' : '해결한 예외가 없어요.'}
      </p>
    )
  } else {
    content = (
      <ul className="divide-y divide-tag-bg">
        {cases.map((c) => (
          <li key={c.id} className="flex flex-col gap-2 px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <span className="rounded-full bg-tag-bg px-2 py-0.5 text-[11px] font-semibold text-tag-text">
                {TYPE_LABEL[c.type]}
              </span>
              <span className="shrink-0 text-[11px] text-tag-text">{dayjs(c.createdAt).format('YY.MM.DD HH:mm')}</span>
            </div>
            <p className="whitespace-pre-wrap break-words text-sm font-semibold text-foreground">{c.reason}</p>
            {c.type === 'CONFLICT' && c.sessionId && (
              <Link href={`/admin/dining/sessions/${c.sessionId}`} className="self-start text-xs text-primary hover:underline">
                회차 콘솔에서 조정하기
              </Link>
            )}
            {c.status === 'OPEN' ? (
              <ExceptionCaseActions
                caseId={c.id}
                type={c.type}
                tableId={c.tableId}
                hasApplication={!!c.applicationId}
              />
            ) : (
              <div className="rounded-input bg-background px-3 py-2 text-sm text-foreground">
                <p className="text-[11px] text-tag-text">
                  {c.resolvedAt ? `${dayjs(c.resolvedAt).format('YY.MM.DD HH:mm')} 처리` : '처리됨'}
                  {c.action && ` · 조치 ${SAFETY_ACTION_LABEL[c.action]}`}
                </p>
                {c.resolutionNote && <p className="mt-1 whitespace-pre-wrap break-words">{c.resolutionNote}</p>}
              </div>
            )}
          </li>
        ))}
      </ul>
    )
  }

  const chipClass = (selected: boolean) =>
    `${CHIP_CLASS} ${selected ? 'bg-primary font-semibold text-white' : 'border border-tag-bg bg-card text-tag-text'}`

  return (
    <div>
      <h1 className="mb-4 text-[22px] font-bold text-foreground">예외함</h1>
      <div className="mb-3 flex gap-2">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.status}
            type="button"
            onClick={() => setStatus(tab.status)}
            className={`rounded-full px-4 py-1.5 text-sm ${
              status === tab.status ? 'bg-foreground font-semibold text-white' : 'bg-tag-bg text-tag-text'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
        <button type="button" onClick={() => setType(undefined)} className={chipClass(type === undefined)}>
          전체
        </button>
        {TYPES.map((t) => (
          <button key={t} type="button" onClick={() => setType(t)} className={chipClass(type === t)}>
            {TYPE_LABEL[t]}
          </button>
        ))}
      </div>
      <section className="overflow-hidden rounded-card bg-card shadow-sm">{content}</section>
    </div>
  )
}
