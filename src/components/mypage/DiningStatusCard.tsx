'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { Button } from '@/components/ui'
import ChatDialog from '@/components/chat/ChatDialog'
import CancelPreviewModal from '@/components/dining/CancelPreviewModal'
import DiningRegionChips, { toggleInOrder } from '@/components/gathering/DiningRegionChips'
import RefundAccountDialog from '@/components/payment/RefundAccountDialog'
import DiningWishSheet from './DiningWishSheet'
import { useChooseDiningResolution, useDiningResolution } from '@/lib/hooks/useApplications'
import { useOpenInquiry } from '@/lib/hooks/useChat'
import { useToastStore } from '@/lib/store/toastStore'
import { resolveApiErrorMessage } from '@/lib/utils/apiError'
import { formatLocalizedShortDate, formatLocalizedShortDateTime, formatTime, formatTimeRange } from '@/lib/utils/date'
import { DINING_RESOLUTION_ANCHOR, DINING_STEPS, getDiningPhase, getDiningStepIndex, getNextMatchRunAt, isDiningCancelOpen } from '@/lib/utils/diningStatus'
import type { ApplicationStatus, DepositReturnAccount, DiningApplicationDeposit, DiningParticipantUnassignedReason, DiningPaymentStatus, DiningResolutionChoice, DiningSessionInfo, DiningTableStatus, MatchStatus, TicketDeductionStatus } from '@/lib/api/types'

const CANCELLABLE: ReadonlySet<ApplicationStatus> = new Set(['PENDING', 'PAYMENT_PENDING', 'CONFIRMED'])

// 보증금 상태 배지 색 (KAN-410)
const DEPOSIT_BADGE_STYLE: Record<DiningApplicationDeposit['status'], string> = {
  PENDING: 'bg-blue-50 text-blue-700',
  PAID: 'bg-primary-light text-primary',
  RETURN_PENDING: 'bg-yellow-50 text-yellow-700',
  RETURNED: 'bg-tag-bg text-tag-text',
  FORFEITED: 'bg-red-50 text-red-700',
}

// 통합 결제 상태 배지 색 — 보증금 배지와 같은 색 체계 (KAN-437)
const PAYMENT_BADGE_STYLE: Record<DiningPaymentStatus, string> = {
  PENDING: 'bg-blue-50 text-blue-700',
  PAID: 'bg-primary-light text-primary',
  FAILED: 'bg-red-50 text-red-700',
  REFUND_AVAILABLE: 'bg-yellow-50 text-yellow-700',
  REFUND_REQUESTED: 'bg-yellow-50 text-yellow-700',
  REFUND_PROCESSING: 'bg-yellow-50 text-yellow-700',
  REFUNDED: 'bg-tag-bg text-tag-text',
  REFUND_FAILED: 'bg-red-50 text-red-700',
}

const badgeClass = 'text-xs font-medium px-2 py-1 rounded-full'
const linkButtonClass = 'mt-3 flex min-h-[44px] w-full items-center justify-center rounded-button bg-primary px-4 text-sm font-bold text-white'
const outlinedLinkClass = 'mt-2 flex min-h-[44px] w-full items-center justify-center rounded-button border border-primary px-4 text-sm font-bold text-primary'

interface DiningStatusCardProps {
  applicationId: string
  gatheringId: string   // 매칭 실패 시 "다른 일정 보기" 이동 대상
  title: string
  status: ApplicationStatus
  matchStatus: MatchStatus | null
  table: { id: string; status: DiningTableStatus; confirmAt: string | null } | null
  assignedSession: DiningSessionInfo | null
  candidateSessions: DiningSessionInfo[]
  candidateRegions?: string[]   // 희망 지역 (KAN-433). 테이블 지역이 정해지면 일정 줄의 지역으로 대신한다
  resolutionId?: string | null
  depositOnly?: boolean   // 이용권은 준비됐고 보증금 입금만 남은 결제 대기
  deposit?: DiningApplicationDeposit | null        // 보증금 상태 배지 (KAN-410)
  ticketStatus?: TicketDeductionStatus | null      // 환불 진행 표시: REFUND_PROCESSING 송금 대기 / REFUNDED 환불 완료 (KAN-410)
  paymentStatus?: DiningPaymentStatus | null       // 통합 결제 상태 (KAN-437). 있으면 위 환불 진행 배지 대신 쓴다
  unassignedReason?: DiningParticipantUnassignedReason | null   // 마지막 매칭에서 못 앉은 사유 (KAN-436)
  // 홈 요약 카드: 취소는 숨기고 해결 선택은 이동 링크로만 보여준다
  summary?: boolean
}

// 우연한 식탁 신청 상태 카드 — 결제 → 매칭 대기 → 매칭 중 → 재배치 중 → 확정 → 참석 완료 (KAN-354)
export default function DiningStatusCard({
  applicationId,
  gatheringId,
  title,
  status,
  matchStatus,
  table,
  assignedSession,
  candidateSessions,
  candidateRegions = [],
  resolutionId,
  depositOnly = false,
  deposit,
  ticketStatus,
  paymentStatus,
  unassignedReason,
  summary = false,
}: DiningStatusCardProps) {
  const t = useTranslations('mypage.applications.dining')
  const locale = useLocale()
  const [confirmingCancel, setConfirmingCancel] = useState(false)
  const [changingWishes, setChangingWishes] = useState(false)

  const phase = getDiningPhase(status, matchStatus, table?.status)
  const stepIndex = getDiningStepIndex(phase)
  const session = assignedSession ?? candidateSessions[0] ?? null
  const moreSessions = assignedSession ? 0 : Math.max(candidateSessions.length - 1, 0)
  const sessionLine = session
    ? [formatLocalizedShortDate(session.eventDate, locale), formatTime(session.startTime), session.region].filter(Boolean).join(' · ')
    : ''

  // 희망 일정·지역은 매칭 전 대기(WAITING)·재배치 대기(REALLOCATING)에서만 바꿀 수 있다 (BE 와 같은 조건)
  const canChangeWishes = status !== 'CANCELLED'
    && ((phase === 'waiting' && matchStatus === 'WAITING') || phase === 'reallocating')
  const matchRunAt = phase === 'waiting' || phase === 'reallocating'
    ? getNextMatchRunAt(assignedSession ? [assignedSession, ...candidateSessions] : candidateSessions)
    : null
  // 설명 문장 없이 다음 시각만 라벨+값으로: 대기 중 = 매칭 실행, 매칭 중 = 테이블 확정
  const nextAt = matchRunAt
    ? { label: t('matchRunAt'), at: matchRunAt }
    : phase === 'matching' && table?.confirmAt
      ? { label: t('confirmAt'), at: table.confirmAt }
      : null

  const paymentBadgeStyle = paymentStatus ? PAYMENT_BADGE_STYLE[paymentStatus] : undefined
  const showLegacyRefund = !paymentBadgeStyle && (ticketStatus === 'REFUND_PROCESSING' || ticketStatus === 'REFUNDED')
  const showReason = !!unassignedReason && phase !== 'confirmed' && phase !== 'attended'
  // 예외 처리 중이거나 환불이 실패했으면 1:1 문의로 보낸다
  const needsInquiry = phase === 'exception' || paymentStatus === 'REFUND_FAILED' || ticketStatus === 'REFUND_FAILED'

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
          {!session?.region && candidateRegions.length > 0 && (
            <p className="text-xs text-tag-text mt-0.5">{t('candidateRegions', { regions: candidateRegions.join(', ') })}</p>
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
      {nextAt && (
        <p className="mt-2 text-sm">
          <span className="text-tag-text">{nextAt.label}</span>{' '}
          <span className="font-semibold text-foreground">{formatLocalizedShortDateTime(nextAt.at, locale)}</span>
        </p>
      )}
      {(paymentBadgeStyle || deposit || showLegacyRefund || showReason) && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {paymentStatus && paymentBadgeStyle && (
            <span className={`${badgeClass} ${paymentBadgeStyle}`}>{t(`paymentStatus.${paymentStatus}`)}</span>
          )}
          {deposit && (
            <span className={`${badgeClass} ${DEPOSIT_BADGE_STYLE[deposit.status]}`}>
              {t('deposit.label', { status: t(`deposit.status.${deposit.status}`) })}
            </span>
          )}
          {showLegacyRefund && (
            <span className={`${badgeClass} bg-tag-bg text-tag-text`}>
              {t(`refundStatus.${ticketStatus}`)}
            </span>
          )}
          {showReason && (
            <span className={`${badgeClass} bg-tag-bg text-tag-text`}>{t(`unassignedReason.${unassignedReason}`)}</span>
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
      {(phase === 'alternative' || phase === 'noMatch') && (summary ? (
        <Link href={`/mypage?tab=applications#${DINING_RESOLUTION_ANCHOR}`} className={linkButtonClass}>
          {t('goResolve')}
        </Link>
      ) : (
        // 매칭 실패(NO_MATCH)는 옮길 날짜 없이 이용권 보관·환불만 고른다
        <ResolutionPanel resolutionId={resolutionId} allowTransfer={phase === 'alternative'} candidateRegions={candidateRegions} />
      ))}
      {phase === 'noMatch' && (
        <Link href={`/gatherings/${encodeURIComponent(gatheringId)}`} className={outlinedLinkClass}>
          {t('otherSessions')}
        </Link>
      )}
      {needsInquiry && <InquiryButton />}
      {canChangeWishes && (
        <Button variant="outlined" size="sm" className="mt-3 w-full font-bold" onClick={() => setChangingWishes(true)}>
          {t('wishes.button')}
        </Button>
      )}

      {summary && (
        <Link href="/mypage?tab=applications" className="mt-2 flex min-h-[44px] items-center justify-center text-xs text-tag-text underline">
          {t('viewAll')}
        </Link>
      )}

      {showCancel && (
        <div className="mt-3 pt-3 border-t border-tag-bg/50">
          <button
            type="button"
            onClick={() => setConfirmingCancel(true)}
            disabled={!cancelOpen}
            className="min-h-[36px] text-xs text-tag-text underline disabled:no-underline disabled:opacity-50"
          >
            {t('cancel.button')}
          </button>
        </div>
      )}

      {confirmingCancel && <CancelPreviewModal applicationId={applicationId} onClose={() => setConfirmingCancel(false)} />}
      {changingWishes && canChangeWishes && (
        <DiningWishSheet
          applicationId={applicationId}
          gatheringId={gatheringId}
          initialSessionIds={candidateSessions.map((candidate) => candidate.id)}
          initialRegions={candidateRegions}
          onClose={() => setChangingWishes(false)}
        />
      )}
    </div>
  )
}

// 예외·환불 실패 → 1:1 문의방(없으면 만들고 숨김이면 해제)으로 이동 — 채팅 탭 문의 진입점과 같은 훅
function InquiryButton() {
  const t = useTranslations('mypage.applications.dining')
  const tCommon = useTranslations('common')
  const router = useRouter()
  const showToast = useToastStore((s) => s.show)
  const openInquiry = useOpenInquiry()
  return (
    <Button
      size="sm"
      className="mt-3 w-full font-bold"
      isLoading={openInquiry.isPending}
      onClick={() =>
        openInquiry.mutate(undefined, {
          onSuccess: ({ roomId }) => router.push(`/chat/${roomId}`),
          onError: (error) => showToast(resolveApiErrorMessage(error, tCommon), 'error'),
        })}
    >
      {t('inquiry')}
    </Button>
  )
}

interface ResolutionPanelProps {
  resolutionId?: string | null
  allowTransfer: boolean      // NO_MATCH 는 대체 날짜 없이 이용권 보관·환불만
  candidateRegions: string[]  // 기존 희망 지역 — 대체 날짜의 지역 지망 기본값
}

// 매칭 실패 해결 선택: 대체 회차로 옮기기 / 이용권 보관 / 환불 (KAN-347 계약)
function ResolutionPanel({ resolutionId, allowTransfer, candidateRegions }: ResolutionPanelProps) {
  const t = useTranslations('mypage.applications.dining.resolution')
  const tApply = useTranslations('gathering.diningApply')
  const locale = useLocale()
  const showToast = useToastStore((s) => s.show)
  const resolutionQuery = useDiningResolution(resolutionId)
  const choose = useChooseDiningResolution()
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [regions, setRegions] = useState<string[] | null>(null)   // null = 손대지 않음 → 기존 희망 지역
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
  // 대체 날짜를 고르면 기존 희망 지역 + 제안 지역을 지망 칩으로 다시 고른다. BE 가 offeredRegions 를 안 주면 숨기고 지역은 그대로 둔다 (KAN-436)
  const offeredRegions = resolution?.offeredRegions
  const regionChoices = offeredRegions ? [...candidateRegions, ...offeredRegions.filter((region) => !candidateRegions.includes(region))] : []
  const selectedRegions = (regions ?? candidateRegions).filter((region) => regionChoices.includes(region))
  const showRegions = allowTransfer && canChoose && !!sessionId && regionChoices.length > 0
  // 선택할 수 없는 상태는 짧은 상태 배지로만 보여준다
  const statusLabel = !resolutionId
    ? t('unavailable')
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
          ? { choice: pendingChoice, sessionId, ...(showRegions && { regions: selectedRegions }) }
          : pendingChoice === 'REFUND' && refundAccount
            ? { choice: pendingChoice, refundAccount }
            : { choice: pendingChoice },
      },
      {
        onSuccess: () => {
          showToast(t('chosen'))
          setPendingChoice(null)
        },
        // 환불은 실패하면 다이얼로그를 열어 둬 입력한 계좌를 지키고 다시 시도하게 한다
        onError: () => {
          if (pendingChoice !== 'REFUND') setPendingChoice(null)
        },
      },
    )
  }

  return (
    <div ref={panelRef} id={DINING_RESOLUTION_ANCHOR} className="mt-3 rounded-input bg-background p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-bold text-foreground">{t('title')}</p>
        {statusLabel && <span className={`shrink-0 ${badgeClass} bg-tag-bg text-tag-text`}>{statusLabel}</span>}
      </div>
      {canChoose && resolution?.respondBy && (
        <p className="mt-1 text-sm">
          <span className="text-tag-text">{t('deadline')}</span>{' '}
          <span className="font-semibold text-primary">{formatLocalizedShortDateTime(resolution.respondBy, locale)}</span>
        </p>
      )}
      {!!resolutionId && resolutionQuery.isError && <p className="mt-1 text-xs text-tag-text break-keep">{t('loadFailed')}</p>}

      {canChoose && allowTransfer && (offeredSessions.length > 0 ? (
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
        <p className="mt-2 text-sm text-tag-text">{t('noOfferedSessions')}</p>
      ))}

      {showRegions && (
        <div className="mt-3">
          <p className="mb-2 text-xs font-medium text-foreground">{tApply('regionsTitle')}</p>
          <DiningRegionChips
            regions={regionChoices}
            selected={selectedRegions}
            label={tApply('regionsTitle')}
            onToggle={(region) => setRegions(toggleInOrder(selectedRegions, region))}
          />
        </div>
      )}

      <div className="mt-3 flex flex-col gap-2">
        {allowTransfer && (
          <Button
            size="sm"
            className="w-full"
            disabled={!canChoose || !sessionId || (showRegions && selectedRegions.length === 0)}
            onClick={() => setPendingChoice('TRANSFER')}
          >
            {t('choices.TRANSFER')}
          </Button>
        )}
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
