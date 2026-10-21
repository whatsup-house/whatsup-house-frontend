'use client'

import { useEffect, useState } from 'react'
import type { DragEvent } from 'react'
import dayjs from 'dayjs'
import { Ban, CalendarX, Download, History, Lock, MapPinOff, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type {
  DiningAdminTable,
  DiningAssignReason,
  DiningNoticeStatus,
  DiningScoreDetail,
  DiningTableAdjustRequest,
} from '@/lib/api/types'
import {
  getTableViolations,
  useAdjustDiningTables,
  useConfirmDiningTablesNow,
  useDiningTables,
  useDownloadDiningCsv,
} from '@/lib/hooks/useAdminDining'
import { TABLE_STATUS_CLASS, TABLE_STATUS_LABEL, UNASSIGNED_REASON_LABEL, genderShort, tableLabel } from '@/lib/utils/diningStatus'
import { getAdminApiErrorMessage } from '@/lib/utils/apiError'
import { ApiErrorMessage, LoadingSpinner } from '@/components/ui'
import DiningTableExplanationModal from './DiningTableExplanationModal'
import { showConfirm } from '@/lib/store/dialogStore'

// 처음 배정(INITIAL)은 표시하지 않는다. MANUAL 은 isManual '수동' 칩과 겹치면 생략
const ASSIGN_REASON_LABEL: Partial<Record<DiningAssignReason, string>> = {
  REALLOCATED: '재배치 배정',
  MANUAL: '수동',
  SPLIT: '분리 배정',
  MERGED: '병합 배정',
}

// 확정 안내(CONFIRM_MESSAGE) 최신 결과. NONE 은 표시하지 않는다 (KAN-437)
const NOTICE_STATUS: Partial<Record<DiningNoticeStatus, { label: string; title: string; className: string }>> = {
  SENT: { label: '발송됨', title: '확정 안내 발송됨', className: 'bg-green-100 text-green-700' },
  FAILED: { label: '발송 실패', title: '확정 안내 발송 실패', className: 'bg-primary-light text-primary' },
}

const TH_CLASS = 'px-3 py-2 text-left text-xs font-medium text-tag-text whitespace-nowrap'
const TD_CLASS = 'px-3 py-2 text-sm text-foreground whitespace-nowrap'
const MEMBER_CHIP = 'rounded-full bg-card px-1.5 text-[10px] font-medium text-tag-text whitespace-nowrap'

const SMALL_BUTTON = 'px-2.5 h-8 rounded-input border text-xs font-medium disabled:opacity-50 disabled:pointer-events-none'

// 제안·확정 테이블만 조정할 수 있다(BE TABLE_NOT_ADJUSTABLE).
const isAdjustable = (table: DiningAdminTable) => table.status === 'PROPOSED' || table.status === 'CONFIRMED'

const percent = (value: number) => `${Math.round(value * 100)}%`
const formatAt = (value: string) => dayjs(value).format('M/D HH:mm')

interface MemberFlagProps {
  icon: LucideIcon
  label: string
  isAlert?: boolean
}

// 멤버 칩 경고 아이콘. 의미는 title·aria-label 로만 전달한다.
function MemberFlag({ icon: Icon, label, isAlert }: MemberFlagProps) {
  return (
    <span role="img" title={label} aria-label={label} className={isAlert ? 'text-primary' : 'text-tag-text'}>
      <Icon size={12} aria-hidden />
    </span>
  )
}

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

// 테이블 탭: 카드(상태, 카운트다운, 점수, 잠금, 멤버), 드래그/드롭다운 이동, 분리/병합/즉시 확정/해체, 미배정 목록 (KAN-352)
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
  const [explainTableId, setExplainTableId] = useState<string | null>(null)

  // "N분 후 확정" 카운트다운
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(timer)
  }, [])

  if (isLoading) return <div className="flex justify-center py-16"><LoadingSpinner /></div>
  if (isError || !data) {
    return <ApiErrorMessage message={getAdminApiErrorMessage(error, '테이블을 불러오지 못했어요.')} onRetry={() => refetch()} />
  }

  const { tables, unassigned } = data
  const hasReallocationCount = unassigned.some((u) => u.reallocationCount !== undefined)
  const hasFailedAt = unassigned.some((u) => u.failedAt !== undefined)
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

  const handleDissolve = async (table: DiningAdminTable) => {
    const request: DiningTableAdjustRequest = { type: 'dissolve', tableId: table.id }
    if (table.status === 'CONFIRMED') {
      setPendingReason({ title: '테이블 해체', request })
      return
    }
    const ok = await showConfirm('멤버는 재배치 대기로 돌아가요.', {
      title: `${tableLabel(table.id)} 테이블을 해체할까요?`,
      confirmLabel: '해체',
      destructive: true,
    })
    if (ok) adjust.mutate(request)
  }

  const handleConfirmNow = async (table: DiningAdminTable) => {
    if (await showConfirm(`${tableLabel(table.id)} 테이블을 지금 확정할까요?`)) confirmNow.mutate([table.id])
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
    const notice = table.noticeStatus ? NOTICE_STATUS[table.noticeStatus] : undefined
    const ageRange = table.ageMin != null && table.ageMax != null ? { min: table.ageMin, max: table.ageMax } : null
    const hasGenderCount = table.maleCount !== undefined && table.femaleCount !== undefined
    const mbtiList = table.mbtiList ?? []
    const commonInterests = table.commonInterests ?? []

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
            <span className="text-sm text-tag-text">{table.members.length}명</span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TABLE_STATUS_CLASS[table.status]}`}>
              {TABLE_STATUS_LABEL[table.status]}
            </span>
            {notice && (
              <span title={notice.title} className={`rounded-full px-2 py-0.5 text-xs font-medium ${notice.className}`}>
                {notice.label}
              </span>
            )}
            {table.region && <span className="rounded-full bg-tag-bg px-2 py-0.5 text-xs text-tag-text">{table.region}</span>}
            {table.locked && <Lock size={14} className="text-tag-text" aria-label="수동 조정됨(재실행 시 유지)" />}
            {table.status === 'PROPOSED' && table.confirmAt && (
              <span className="text-xs text-tag-text">{countdownLabel(table.confirmAt, now)}</span>
            )}
          </div>
          <ScoreTooltip score={table.groupScore} detail={table.scoreDetail} />
        </div>

        {(ageRange || hasGenderCount || mbtiList.length > 0 || commonInterests.length > 0) && (
          <div className="flex flex-wrap items-center gap-1.5 text-sm text-foreground">
            {ageRange && <span>{ageRange.min}~{ageRange.max}세 ({ageRange.max - ageRange.min}세 차)</span>}
            {hasGenderCount && <span>남 {table.maleCount}·여 {table.femaleCount}</span>}
            {mbtiList.map((mbti, i) => (
              <span key={`${mbti}-${i}`} className="rounded-full bg-tag-bg px-2 py-0.5 text-xs text-tag-text">{mbti}</span>
            ))}
            {commonInterests.map((interest) => (
              <span key={interest} className="rounded-full bg-primary-light px-2 py-0.5 text-xs text-primary">{interest}</span>
            ))}
          </div>
        )}

        {(table.matchedAt || table.confirmedAt) && (
          <p className="flex flex-wrap gap-3 text-sm text-tag-text">
            {table.matchedAt && <span>매칭 {formatAt(table.matchedAt)}</span>}
            {table.confirmedAt && <span>확정 {formatAt(table.confirmedAt)}</span>}
          </p>
        )}

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
              className={`flex max-w-full flex-wrap items-center gap-1 rounded-input bg-tag-bg px-2.5 py-1 text-xs text-tag-text ${
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
              <span>{m.birthYear ? `${dayjs(now).year() - m.birthYear}세` : '-'}</span>
              <span>{genderShort(m.gender)}</span>
              <span>{m.mbti ?? '-'}</span>
              {m.wantsSession === false && <MemberFlag icon={CalendarX} label="희망 회차 아님" isAlert />}
              {m.wantsRegion === false && <MemberFlag icon={MapPinOff} label="희망 지역 아님" isAlert />}
              {m.conflict && <MemberFlag icon={Ban} label="차단·비선호 관계" isAlert />}
              {m.metBefore && <MemberFlag icon={History} label="이전에 만난 멤버 있음" />}
              {m.isManual && <span className="rounded-full bg-primary px-1.5 text-[10px] font-medium text-white">수동</span>}
              {!(m.isManual && m.assignReason === 'MANUAL') && ASSIGN_REASON_LABEL[m.assignReason] && (
                <span className={MEMBER_CHIP}>{ASSIGN_REASON_LABEL[m.assignReason]}</span>
              )}
              {!!m.reallocationCount && <span className={MEMBER_CHIP}>재배치 {m.reallocationCount}</span>}
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

        <button
          onClick={() => setExplainTableId(table.id)}
          className={`${SMALL_BUTTON} self-start border-tag-bg text-foreground hover:border-primary`}
        >
          매칭 근거
        </button>

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
              <button onClick={() => setMergeSourceId(null)} className={`${SMALL_BUTTON} border-tag-bg text-tag-text`}>취소</button>
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
        <div className="flex flex-wrap items-center gap-3 text-sm text-tag-text">
          <span>테이블 {tables.length}개</span>
          <span>미배정 {unassigned.length}명</span>
          {isFetching && <LoadingSpinner size="sm" />}
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
          아직 테이블이 없어요.
        </div>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">{tables.map(renderCard)}</ul>
      )}

      {unassigned.length > 0 && (
        <div className="bg-card rounded-card shadow-sm p-4">
          <h3 className="mb-2 text-sm font-bold text-foreground">미배정 {unassigned.length}명</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-tag-bg">
                <tr>
                  <th className={TH_CLASS}>닉네임</th>
                  <th className={TH_CLASS}>사유</th>
                  {hasReallocationCount && <th className={TH_CLASS}>재배치</th>}
                  {hasFailedAt && <th className={TH_CLASS}>실패 시각</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-tag-bg">
                {unassigned.map((u) => (
                  <tr key={u.applicationId}>
                    <td className={`${TD_CLASS} font-medium`}>{u.nickname}</td>
                    <td className={TD_CLASS}>{UNASSIGNED_REASON_LABEL[u.reason] ?? u.reason}</td>
                    {hasReallocationCount && <td className={TD_CLASS}>{u.reallocationCount ?? 0}회</td>}
                    {hasFailedAt && <td className={TD_CLASS}>{u.failedAt ? formatAt(u.failedAt) : '-'}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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

      {explainTableId && (
        <DiningTableExplanationModal sessionId={sessionId} tableId={explainTableId} onClose={() => setExplainTableId(null)} />
      )}
    </section>
  )
}
