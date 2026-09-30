'use client'

import { useEffect, useState } from 'react'
import type { DragEvent } from 'react'
import dayjs from 'dayjs'
import { Download, Lock, X } from 'lucide-react'
import type { DiningAdminTable, DiningScoreDetail, DiningTableAdjustRequest, DiningUnassignedReason } from '@/lib/api/types'
import {
  getTableViolations,
  useAdjustDiningTables,
  useConfirmDiningTablesNow,
  useDiningTables,
  useDownloadDiningCsv,
} from '@/lib/hooks/useAdminDining'
import { TABLE_STATUS_CLASS, TABLE_STATUS_LABEL, genderShort, tableLabel } from '@/lib/utils/diningStatus'
import { getAdminApiErrorMessage } from '@/lib/utils/apiError'
import { ApiErrorMessage, LoadingSpinner } from '@/components/ui'

const UNASSIGNED_REASON_LABEL: Record<DiningUnassignedReason, string> = {
  AGE_GAP: '나이 차 초과',
  BLOCKED_PAIR: '제외 관계',
  NOT_ENOUGH_PEOPLE: '인원 부족',
  LOW_SCORE: '점수 미달',
  NEXT_SESSION_WAITING: '다음 회차 대기',
}

const SMALL_BUTTON = 'px-2.5 h-8 rounded-input border text-xs font-medium disabled:opacity-50 disabled:pointer-events-none'

// 제안·확정 테이블만 조정할 수 있다(BE TABLE_NOT_ADJUSTABLE).
const isAdjustable = (table: DiningAdminTable) => table.status === 'PROPOSED' || table.status === 'CONFIRMED'

const percent = (value: number) => `${Math.round(value * 100)}%`

function countdownLabel(confirmAt: string, now: number) {
  const minutes = Math.ceil(dayjs(confirmAt).diff(now) / 60_000)
  if (minutes <= 0) return '곧 확정'
  if (minutes < 60) return `${minutes}분 후 확정`
  return `${Math.floor(minutes / 60)}시간 ${minutes % 60}분 후 확정`
}

interface ScoreTooltipProps {
  score: number | null
  detail: DiningScoreDetail | null
}

// 점수 % + 내역 툴팁. 호버·포커스(모바일은 탭)로 연다.
function ScoreTooltip({ score, detail }: ScoreTooltipProps) {
  if (score === null) return <span className="text-xs text-tag-text">점수 없음</span>
  const penalties = Object.entries(detail?.penalties ?? {})
  return (
    <span className="group relative" tabIndex={0} aria-label={`그룹 점수 ${percent(score)}`}>
      <span className="cursor-help text-sm font-bold text-foreground underline decoration-dotted">{percent(score)}</span>
      {detail && (
        <span
          role="tooltip"
          className="invisible absolute right-0 top-full z-20 mt-1 w-52 rounded-input bg-foreground px-3 py-2 text-xs leading-relaxed text-white shadow-lg group-hover:visible group-focus:visible"
        >
          <span className="block">쌍 평균 {percent(detail.pairAvg)}</span>
          <span className="block">쌍 최저 {percent(detail.pairMin)}</span>
          {penalties.length === 0 ? (
            <span className="block">감점 없음</span>
          ) : (
            penalties.map(([key, value]) => (
              <span key={key} className="block">감점 {key} {value.toFixed(2)}</span>
            ))
          )}
        </span>
      )}
    </span>
  )
}

interface ReasonModalProps {
  title: string
  onSubmit: (reason: string) => void
  onClose: () => void
}

// 확정 테이블 조정 사유(필수, 500자). BE가 이력에 남긴다.
function ReasonModal({ title, onSubmit, onClose }: ReasonModalProps) {
  const [reason, setReason] = useState('')
  const trimmed = reason.trim()
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-card bg-card p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-bold text-base text-foreground">{title}</h3>
          <button onClick={onClose} className="text-tag-text hover:text-foreground" aria-label="닫기"><X size={20} /></button>
        </div>
        <p className="mb-2 text-sm text-tag-text">확정된 테이블이 포함돼 있어요. 멤버에게 안내가 필요할 수 있으니 사유를 남겨주세요.</p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={500}
          rows={3}
          autoFocus
          placeholder="조정 사유 (필수)"
          aria-label="조정 사유"
          className="w-full resize-y rounded-input border border-tag-bg bg-card px-3 py-2 text-sm text-foreground placeholder:text-tag-text focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <div className="mt-4 flex gap-2">
          <button onClick={onClose} className="flex-1 h-11 rounded-input bg-tag-bg text-sm font-medium text-tag-text">취소</button>
          <button
            onClick={() => onSubmit(trimmed)}
            disabled={!trimmed}
            className="flex-1 h-11 rounded-input bg-primary text-sm font-medium text-white disabled:opacity-50"
          >
            조정하기
          </button>
        </div>
      </div>
    </div>
  )
}

interface DiningTableBoardProps {
  sessionId: string
}

// 테이블 탭: 카드(상태·카운트다운·점수·잠금·멤버), 드래그/드롭다운 이동, 분리·병합·즉시 확정·해체, 미배정 목록 (KAN-352)
export default function DiningTableBoard({ sessionId }: DiningTableBoardProps) {
  const { data, isLoading, isError, error, refetch, isFetching } = useDiningTables(sessionId)
  const adjust = useAdjustDiningTables(sessionId)
  const confirmNow = useConfirmDiningTablesNow(sessionId)
  const download = useDownloadDiningCsv(sessionId)

  const [now, setNow] = useState(() => Date.now())
  const [dragItem, setDragItem] = useState<{ memberId: string; fromTableId: string } | null>(null)
  const [split, setSplit] = useState<{ tableId: string; memberIds: string[] } | null>(null)
  const [mergeSourceId, setMergeSourceId] = useState<string | null>(null)
  const [pendingReason, setPendingReason] = useState<{ title: string; request: DiningTableAdjustRequest } | null>(null)

  // "N분 후 확정" 카운트다운
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(timer)
  }, [])

  if (isLoading) return <div className="flex justify-center py-16"><LoadingSpinner /></div>
  if (isError || !data) {
    return <ApiErrorMessage message={getAdminApiErrorMessage(error, '테이블을 불러오지 못했어요.')} onRetry={() => refetch()} />
  }

  const { tables, unassigned, lastRun } = data
  const findTable = (id: string) => tables.find((t) => t.id === id)

  // 직전 조정 결과의 위반(200 validation 또는 400 TABLE_RULE_VIOLATION). 다음 조정 때 갱신된다.
  const violations = adjust.error ? getTableViolations(adjust.error) : adjust.data?.validation.violations ?? []
  const violationsOf = (tableId: string) => violations.filter((v) => v.tableId === tableId)

  // 확정 테이블이 끼면 사유 모달을 먼저 띄운다.
  const submit = (title: string, request: DiningTableAdjustRequest, involved: (DiningAdminTable | undefined)[]) => {
    if (involved.some((t) => t?.status === 'CONFIRMED')) setPendingReason({ title, request })
    else adjust.mutate(request)
  }

  const requestMove = (fromTableId: string, memberId: string, targetTableId: string) => {
    if (fromTableId === targetTableId) return
    submit('멤버 이동', { type: 'move', tableId: fromTableId, memberId, targetTableId }, [findTable(fromTableId), findTable(targetTableId)])
  }

  const handleDrop = (e: DragEvent, targetTableId: string) => {
    e.preventDefault()
    if (dragItem) requestMove(dragItem.fromTableId, dragItem.memberId, targetTableId)
    setDragItem(null)
  }

  const handleSplit = (table: DiningAdminTable) => {
    if (!split || split.memberIds.length === 0) return
    submit('테이블 분리', { type: 'split', tableId: table.id, memberIds: split.memberIds }, [table])
    setSplit(null)
  }

  const handleMerge = (target: DiningAdminTable) => {
    const source = mergeSourceId ? findTable(mergeSourceId) : undefined
    setMergeSourceId(null)
    if (!source) return
    submit('테이블 병합', { type: 'merge', tableIds: [source.id, target.id] }, [source, target])
  }

  const handleDissolve = (table: DiningAdminTable) => {
    const request: DiningTableAdjustRequest = { type: 'dissolve', tableId: table.id }
    if (table.status === 'CONFIRMED') setPendingReason({ title: '테이블 해체', request })
    else if (confirm(`${tableLabel(table.id)} 테이블을 해체할까요? 멤버는 재배치 대기로 돌아가요.`)) adjust.mutate(request)
  }

  const handleConfirmNow = (table: DiningAdminTable) => {
    if (confirm(`${tableLabel(table.id)} 테이블을 지금 확정할까요?`)) confirmNow.mutate([table.id])
  }

  const toggleSplitMember = (memberId: string, checked: boolean) =>
    setSplit((prev) => prev && {
      ...prev,
      memberIds: checked ? [...prev.memberIds, memberId] : prev.memberIds.filter((id) => id !== memberId),
    })

  const renderCard = (table: DiningAdminTable) => {
    const adjustable = isAdjustable(table)
    const isSplitting = split?.tableId === table.id
    const isMergeSource = mergeSourceId === table.id
    const isMergeTarget = !!mergeSourceId && !isMergeSource && adjustable
    const isDropTarget = !!dragItem && dragItem.fromTableId !== table.id && adjustable
    const moveTargets = tables.filter((t) => t.id !== table.id && isAdjustable(t))
    const tableViolations = violationsOf(table.id)
    const splitCount = split?.memberIds.length ?? 0

    return (
      <li
        key={table.id}
        onDragOver={(e) => isDropTarget && e.preventDefault()}
        onDrop={(e) => isDropTarget && handleDrop(e, table.id)}
        className={`flex flex-col gap-3 rounded-card bg-card p-4 shadow-sm border-2 ${
          isDropTarget || isMergeTarget ? 'border-dashed border-primary' : tableViolations.length > 0 ? 'border-primary' : 'border-transparent'
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-foreground">{tableLabel(table.id)}</span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TABLE_STATUS_CLASS[table.status]}`}>
              {TABLE_STATUS_LABEL[table.status]}
            </span>
            {table.locked && <Lock size={14} className="text-tag-text" aria-label="수동 조정됨(재실행 시 유지)" />}
            {table.status === 'PROPOSED' && table.confirmAt && (
              <span className="text-xs text-tag-text">{countdownLabel(table.confirmAt, now)}</span>
            )}
          </div>
          <ScoreTooltip score={table.groupScore} detail={table.scoreDetail} />
        </div>

        {tableViolations.length > 0 && (
          <ul className="rounded-input bg-primary-light px-3 py-2 text-xs text-primary">
            {tableViolations.map((v, i) => <li key={i}>규칙 위반: {v.message}</li>)}
          </ul>
        )}

        <ul className="flex flex-wrap gap-1.5">
          {table.members.map((m) => (
            <li
              key={m.memberId}
              draggable={adjustable && !isSplitting}
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = 'move'
                e.dataTransfer.setData('text/plain', m.memberId)
                setDragItem({ memberId: m.memberId, fromTableId: table.id })
              }}
              onDragEnd={() => setDragItem(null)}
              className={`flex items-center gap-1 rounded-full bg-tag-bg px-2.5 py-1 text-xs text-tag-text ${
                adjustable && !isSplitting ? 'cursor-grab' : ''
              }`}
            >
              {isSplitting && (
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 accent-primary"
                  checked={split.memberIds.includes(m.memberId)}
                  onChange={(e) => toggleSplitMember(m.memberId, e.target.checked)}
                  aria-label={`${m.nickname} 분리`}
                />
              )}
              <span className="font-semibold text-foreground">{m.nickname}</span>
              <span>
                {m.birthYear ? `${dayjs(now).year() - m.birthYear}세` : '-'}·{genderShort(m.gender)}·{m.mbti ?? '-'}
              </span>
              {m.isManual && <span className="rounded-full bg-primary px-1.5 text-[10px] font-medium text-white">수동</span>}
              {adjustable && !isSplitting && moveTargets.length > 0 && (
                <select
                  value=""
                  onChange={(e) => e.target.value && requestMove(table.id, m.memberId, e.target.value)}
                  aria-label={`${m.nickname} 다른 테이블로 이동`}
                  className="h-6 rounded-input border border-tag-bg bg-card px-1 text-[11px] text-tag-text"
                >
                  <option value="">이동</option>
                  {moveTargets.map((t) => <option key={t.id} value={t.id}>{tableLabel(t.id)}</option>)}
                </select>
              )}
            </li>
          ))}
        </ul>

        {adjustable && (
          <div className="mt-auto flex flex-wrap gap-1.5 border-t border-tag-bg pt-3">
            {isSplitting ? (
              <>
                <button
                  onClick={() => handleSplit(table)}
                  disabled={splitCount === 0 || splitCount >= table.members.length}
                  className={`${SMALL_BUTTON} border-primary bg-primary text-white`}
                >
                  {splitCount}명 새 테이블로 분리
                </button>
                <button onClick={() => setSplit(null)} className={`${SMALL_BUTTON} border-tag-bg text-tag-text`}>취소</button>
              </>
            ) : isMergeSource ? (
              <>
                <span className="self-center text-xs text-primary">합칠 다른 카드를 고르세요</span>
                <button onClick={() => setMergeSourceId(null)} className={`${SMALL_BUTTON} border-tag-bg text-tag-text`}>취소</button>
              </>
            ) : isMergeTarget ? (
              <button onClick={() => handleMerge(table)} className={`${SMALL_BUTTON} border-primary bg-primary text-white`}>
                {tableLabel(mergeSourceId ?? '')}와(과) 병합
              </button>
            ) : (
              <>
                <button
                  onClick={() => setSplit({ tableId: table.id, memberIds: [] })}
                  disabled={table.members.length < 2 || adjust.isPending}
                  className={`${SMALL_BUTTON} border-tag-bg text-foreground`}
                >
                  분리
                </button>
                <button
                  onClick={() => setMergeSourceId(table.id)}
                  disabled={moveTargets.length === 0 || adjust.isPending}
                  className={`${SMALL_BUTTON} border-tag-bg text-foreground`}
                >
                  병합
                </button>
                {table.status === 'PROPOSED' && (
                  <button
                    onClick={() => handleConfirmNow(table)}
                    disabled={confirmNow.isPending}
                    className={`${SMALL_BUTTON} border-primary text-primary`}
                  >
                    즉시 확정
                  </button>
                )}
                <button
                  onClick={() => handleDissolve(table)}
                  disabled={adjust.isPending}
                  className={`${SMALL_BUTTON} border-tag-bg text-tag-text`}
                >
                  해체
                </button>
              </>
            )}
          </div>
        )}
      </li>
    )
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm text-tag-text">
          <p>
            테이블 {tables.length}개 · 미배정 {unassigned.length}명
            {isFetching && <span className="ml-2 text-xs">갱신 중…</span>}
          </p>
          {lastRun && (
            <p className="text-xs">
              마지막 실행 {dayjs(lastRun.startedAt).format('M/D HH:mm')} · 후보 {lastRun.candidateCount}명 → 테이블 {lastRun.tableCount}개
            </p>
          )}
        </div>
        <button
          onClick={() => download.mutate('tables')}
          disabled={download.isPending || tables.length === 0}
          className="inline-flex items-center gap-1 px-3 h-9 rounded-input border border-tag-bg bg-card text-sm text-foreground hover:border-primary disabled:opacity-50"
        >
          <Download size={16} /> 테이블 CSV
        </button>
      </div>

      {tables.length === 0 ? (
        <div className="bg-card rounded-card shadow-sm py-12 text-center text-sm text-tag-text">
          아직 테이블이 없어요. 위의 &apos;지금 매칭 실행&apos;으로 테이블을 만들어보세요.
        </div>
      ) : (
        <>
          <p className="text-xs text-tag-text">멤버를 다른 카드로 끌어다 놓거나, 칩의 &apos;이동&apos;에서 테이블을 골라 옮겨요.</p>
          <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">{tables.map(renderCard)}</ul>
        </>
      )}

      {unassigned.length > 0 && (
        <div className="bg-card rounded-card shadow-sm p-4">
          <h3 className="mb-2 text-sm font-bold text-foreground">미배정 {unassigned.length}명</h3>
          <ul className="flex flex-wrap gap-1.5">
            {unassigned.map((u) => (
              <li key={u.applicationId} className="rounded-full bg-tag-bg px-2.5 py-1 text-xs text-tag-text">
                <span className="font-semibold text-foreground">{u.nickname}</span> · {UNASSIGNED_REASON_LABEL[u.reason] ?? u.reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      {pendingReason && (
        <ReasonModal
          title={pendingReason.title}
          onClose={() => setPendingReason(null)}
          onSubmit={(reason) => {
            adjust.mutate({ ...pendingReason.request, reason })
            setPendingReason(null)
          }}
        />
      )}
    </section>
  )
}
