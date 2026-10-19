'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { Button } from '@/components/ui'
import ChatDialog from '@/components/chat/ChatDialog'
import CancelPreviewModal from '@/components/dining/CancelPreviewModal'
import RefundAccountDialog from '@/components/payment/RefundAccountDialog'
import { useChooseDiningResolution, useDiningResolution } from '@/lib/hooks/useApplications'
import { useToastStore } from '@/lib/store/toastStore'
import { formatLocalizedShortDate, formatLocalizedShortDateTime, formatTime, formatTimeRange } from '@/lib/utils/date'
import { DINING_RESOLUTION_ANCHOR, DINING_STEPS, getDiningPhase, getDiningStepIndex, getNextMatchRunAt, isDiningCancelOpen } from '@/lib/utils/diningStatus'
import type { ApplicationStatus, DepositReturnAccount, DiningApplicationDeposit, DiningResolutionChoice, DiningSessionInfo, DiningTableStatus, MatchStatus, TicketDeductionStatus } from '@/lib/api/types'

const CANCELLABLE: ReadonlySet<ApplicationStatus> = new Set(['PENDING', 'PAYMENT_PENDING', 'CONFIRMED'])

// 보증금 상태 배지 색 (KAN-410)
const DEPOSIT_BADGE_STYLE: Record<DiningApplicationDeposit['status'], string> = {
  PENDING: 'bg-blue-50 text-blue-700',
  PAID: 'bg-primary-light text-primary',
  RETURN_PENDING: 'bg-yellow-50 text-yellow-700',
  RETURNED: 'bg-tag-bg text-tag-text',
  FORFEITED: 'bg-red-50 text-red-700',
}

const linkButtonClass = 'mt-3 flex min-h-[44px] w-full items-center justify-center rounded-button bg-primary px-4 text-sm font-bold text-white'

interface DiningStatusCardProps {
  applicationId: string
  title: string
  status: ApplicationStatus
  matchStatus: MatchStatus | null
  table: { id: string; status: DiningTableStatus; confirmAt: string | null } | null
  assignedSession: DiningSessionInfo | null
  candidateSessions: DiningSessionInfo[]
  resolutionId?: string | null
  depositOnly?: boolean   // 이용권은 준비됐고 보증금 입금만 남은 결제 대기
  deposit?: DiningApplicationDeposit | null        // 보증금 상태 배지 (KAN-410)
  ticketStatus?: TicketDeductionStatus | null      // 환불 진행 표시: REFUND_PROCESSING 송금 대기 / REFUNDED 환불 완료 (KAN-410)
  // 홈 요약 카드: 취소·해결 선택 없이 이동 링크만 보여준다
  summary?: boolean
}

// 우연한 식탁 신청 상태 카드 — 결제 → 매칭 대기 → 매칭 중 → 재배치 중 → 확정 → 참석 완료 (KAN-354)
export default function DiningStatusCard({
  applicationId,
  title,
  status,
  matchStatus,
  table,
  assignedSession,
  candidateSessions,
  resolutionId,
  depositOnly = false,
  deposit,
  ticketStatus,
  summary = false,
}: DiningStatusCardProps) {
  const t = useTranslations('mypage.applications.dining')
  const locale = useLocale()
  const [confirmingCancel, setConfirmingCancel] = useState(false)

  const phase = getDiningPhase(status, matchStatus, table?.status)
  const stepIndex = getDiningStepIndex(phase)
  const session = assignedSession ?? candidateSessions[0] ?? null
  const moreSessions = assignedSession ? 0 : Math.max(candidateSessions.length - 1, 0)
  const sessionLine = session
    ? [formatLocalizedShortDate(session.eventDate, locale), formatTime(session.startTime), session.region].filter(Boolean).join(' · ')
    : ''

  const matchRunAt = phase === 'waiting' ? getNextMatchRunAt(candidateSessions) : null
  const detail = phase === 'payment' && depositOnly
    ? t('detail.paymentDeposit')
    : matchRunAt
    ? t('detail.waitingAt', { at: formatLocalizedShortDateTime(matchRunAt, locale) })
    : phase === 'matching' && table?.confirmAt
      ? t('detail.matchingUntil', { at: formatLocalizedShortDateTime(table.confirmAt, locale) })
      : t(`detail.${phase}`)

  const showCancel = !summary && CANCELLABLE.has(status) && phase !== 'attended'
  const cancelOpen = showCancel && isDiningCancelOpen(assignedSession, candidateSessions)

  return (
    <div className="bg-card rounded-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-bold text-foreground leading-snug line-clamp-2">{title}</p>
          {sessionLine && (
            <p className="text-xs text-tag-text mt-1">
              {sessionLine}
              {moreSessions > 0 && ` ${t('moreSessions', { count: moreSessions })}`}
            </p>
          )}
        </div>
        <span className="shrink-0 text-xs font-medium px-2 py-1 rounded-full bg-primary-light text-primary">
          {t(`phase.${phase}`)}
        </span>
      </div>

      <div className="mt-3 flex gap-1" aria-hidden="true">
        {DINING_STEPS.map((step, index) => (
          <div key={step} className={`h-1 flex-1 rounded-full ${index <= stepIndex ? 'bg-primary' : 'bg-tag-bg'}`} />
        ))}
      </div>
      <p className="mt-2 text-xs text-tag-text leading-relaxed break-keep">{detail}</p>
      {(deposit || ticketStatus === 'REFUND_PROCESSING' || ticketStatus === 'REFUNDED') && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {deposit && (
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${DEPOSIT_BADGE_STYLE[deposit.status]}`}>
              {t('deposit.label', { status: t(`deposit.status.${deposit.status}`) })}
            </span>
          )}
          {(ticketStatus === 'REFUND_PROCESSING' || ticketStatus === 'REFUNDED') && (
            <span className="text-xs font-medium px-2 py-1 rounded-full bg-tag-bg text-tag-text">
              {t(`refundStatus.${ticketStatus}`)}
            </span>
          )}
        </div>
      )}

      {phase === 'payment' && (
        <Link href={`/payments/random-table?applicationId=${encodeURIComponent(applicationId)}`} className={linkButtonClass}>
          {depositOnly ? t('payDeposit') : t('buyTicket')}
        </Link>
      )}
      {table && (phase === 'confirmed' || phase === 'attended') && (
        <Link href={`/dining/tables/${encodeURIComponent(table.id)}`} className={linkButtonClass}>
          {t('viewTable')}
        </Link>
      )}
      {phase === 'alternative' && (summary ? (
        <Link href={`/mypage?tab=applications#${DINING_RESOLUTION_ANCHOR}`} className={linkButtonClass}>
          {t('goResolve')}
        </Link>
      ) : (
        <ResolutionPanel resolutionId={resolutionId} />
      ))}

      {summary && (
        <Link href="/mypage?tab=applications" className="mt-2 flex min-h-[44px] items-center justify-center text-xs text-tag-text underline">
          {t('viewAll')}
        </Link>
      )}

      {showCancel && (
        <div className="mt-3 pt-3 border-t border-tag-bg/50">
          <p className="text-xs text-tag-text leading-relaxed break-keep">{t('cancel.policy')}</p>
          <button
            type="button"
            onClick={() => setConfirmingCancel(true)}
            disabled={!cancelOpen}
            className="mt-2 min-h-[36px] text-xs text-tag-text underline disabled:no-underline disabled:opacity-50"
          >
            {t('cancel.button')}
          </button>
          {!cancelOpen && <p className="text-xs text-primary break-keep">{t('cancel.closed')}</p>}
        </div>
      )}

      {confirmingCancel && <CancelPreviewModal applicationId={applicationId} onClose={() => setConfirmingCancel(false)} />}
    </div>
  )
}

interface ResolutionPanelProps {
  resolutionId?: string | null
}

// 매칭 실패 해결 선택: 대체 회차로 옮기기 / 이용권 보관 / 환불 (KAN-347 계약)
function ResolutionPanel({ resolutionId }: ResolutionPanelProps) {
  const t = useTranslations('mypage.applications.dining.resolution')
  const locale = useLocale()
  const showToast = useToastStore((s) => s.show)
  const resolutionQuery = useDiningResolution(resolutionId)
  const choose = useChooseDiningResolution()
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [pendingChoice, setPendingChoice] = useState<DiningResolutionChoice | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (window.location.hash === `#${DINING_RESOLUTION_ANCHOR}`) {
      panelRef.current?.scrollIntoView({ block: 'center' })
    }
  }, [])

  const resolution = resolutionQuery.data
  const offeredSessions = resolution?.offeredSessions ?? []
  const canChoose = !!resolutionId && !!resolution && (resolution.status ?? 'OFFERED') === 'OFFERED'
  const notice = !resolutionId
    ? t('unavailable')
    : resolutionQuery.isError
      ? t('loadFailed')
      : resolution?.status === 'RESOLVED'
        ? t('resolved')
        : resolution?.status === 'EXPIRED'
          ? t('expired')
          : null

  const handleChoose = (refundAccount?: DepositReturnAccount) => {
    if (!resolutionId || !pendingChoice) return
    choose.mutate(
      {
        id: resolutionId,
        data: pendingChoice === 'TRANSFER' && sessionId
          ? { choice: pendingChoice, sessionId }
          : pendingChoice === 'REFUND' && refundAccount
            ? { choice: pendingChoice, refundAccount }
            : { choice: pendingChoice },
      },
      {
        onSuccess: () => showToast(t('chosen')),
        onSettled: () => setPendingChoice(null),
      },
    )
  }

  return (
    <div ref={panelRef} id={DINING_RESOLUTION_ANCHOR} className="mt-3 rounded-input bg-background p-3">
      <p className="text-sm font-bold text-foreground">{t('title')}</p>
      {canChoose && resolution?.respondBy && (
        <p className="mt-1 text-xs text-primary break-keep">
          {t('respondBy', { at: formatLocalizedShortDateTime(resolution?.respondBy, locale) })}
        </p>
      )}
      {notice && <p className="mt-1 text-xs text-tag-text break-keep">{notice}</p>}

      {canChoose && (offeredSessions.length > 0 ? (
        <fieldset className="mt-3 flex flex-col gap-2">
          <legend className="mb-2 text-xs font-medium text-foreground">{t('offeredSessions')}</legend>
          {offeredSessions.map((offered) => (
            <label
              key={offered.id}
              className={`flex min-h-[44px] cursor-pointer items-center gap-2 rounded-input border px-3 text-sm text-foreground ${
                sessionId === offered.id ? 'border-primary bg-primary-light' : 'border-tag-bg bg-card'
              }`}
            >
              <input
                type="radio"
                name={`resolution-${resolutionId}`}
                value={offered.id}
                checked={sessionId === offered.id}
                onChange={() => setSessionId(offered.id)}
                className="accent-primary"
              />
              <span className="min-w-0">
                {[formatLocalizedShortDate(offered.eventDate, locale), formatTimeRange(offered.startTime, offered.endTime), offered.region]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            </label>
          ))}
        </fieldset>
      ) : (
        <p className="mt-2 text-xs text-tag-text">{t('noOfferedSessions')}</p>
      ))}

      <div className="mt-3 flex flex-col gap-2">
        <Button size="sm" className="w-full" disabled={!canChoose || !sessionId} onClick={() => setPendingChoice('TRANSFER')}>
          {t('choices.TRANSFER')}
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outlined" size="sm" disabled={!canChoose} onClick={() => setPendingChoice('KEEP_TICKET')}>
            {t('choices.KEEP_TICKET')}
          </Button>
          <Button variant="secondary" size="sm" disabled={!canChoose} onClick={() => setPendingChoice('REFUND')}>
            {t('choices.REFUND')}
          </Button>
        </div>
      </div>

      {pendingChoice === 'REFUND' && (
        <RefundAccountDialog
          title={t('confirm.REFUND')}
          description={t('refundAccountReason')}
          confirmLabel={t('choices.REFUND')}
          isPending={choose.isPending}
          onConfirm={handleChoose}
          onClose={() => setPendingChoice(null)}
        />
      )}
      {pendingChoice && pendingChoice !== 'REFUND' && (
        <ChatDialog
          title={t(`confirm.${pendingChoice}`)}
          confirmLabel={t(`choices.${pendingChoice}`)}
          isPending={choose.isPending}
          onConfirm={() => handleChoose()}
          onClose={() => setPendingChoice(null)}
        />
      )}
    </div>
  )
}
