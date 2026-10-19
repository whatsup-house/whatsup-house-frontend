'use client'

import { Ticket } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { Card, Button } from '@/components/ui'
import { useMyTickets } from '@/lib/hooks/useTickets'
import { useAuthStore } from '@/lib/store/authStore'
import { formatLocalizedShortDate } from '@/lib/utils/date'
import { daysUntil, findActiveMembership } from '@/lib/utils/membership'

interface TicketPassSectionProps {
  // 구매 화면에서 돌아올 경로 (신청 흐름에서 입력을 유지한 채 복귀, KAN-344)
  returnUrl?: string
}

// 우연한 식탁(RANDOM_TABLE) 게더링 상세에 노출되는 이용권 선결제 섹션. (KAN-260)
export default function TicketPassSection({ returnUrl }: TicketPassSectionProps) {
  const t = useTranslations('gathering.ticketPass')
  const locale = useLocale()
  const { isLoggedIn } = useAuthStore()
  const { data } = useMyTickets()
  const router = useRouter()

  const totalRemaining = data?.totalRemaining ?? 0
  const hasPending = data?.passes?.some((p) => p.status === 'PENDING') ?? false

  const eligibility = data?.randomTableEligibility
  // 보유 멤버십이 있으면 신청은 멤버십으로 처리된다 (추가 결제 없음)
  const membership = findActiveMembership(data?.passes)

  return (
    <Card className="p-4 mb-6 border border-primary/20">
      <div className="flex items-center gap-2 mb-3">
        <Ticket size={18} className="text-primary shrink-0" />
        <h2 className="text-base font-bold text-foreground">{t('title')}</h2>
      </div>

      <div className="mb-3 space-y-1.5 text-sm text-tag-text leading-relaxed">
        <p>우연한 식탁은 이용권으로 참여해요.</p>
        <p>심사 승인 후 이용권을 구매할 수 있어요.</p>
      </div>

      {isLoggedIn ? (
        <>
          {membership?.validUntil ? (
            <div className="bg-primary-light rounded-input px-4 py-3 mb-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-foreground">{t('membershipApply')}</span>
                <span className="text-sm font-bold text-primary">
                  {t('membershipUntil', { date: formatLocalizedShortDate(membership.validUntil, locale), days: daysUntil(membership.validUntil) })}
                </span>
              </div>
              <p className="mt-1 text-xs text-tag-text">{t('membershipNote')}</p>
            </div>
          ) : (
            <div className="flex items-center justify-between bg-tag-bg rounded-input px-4 py-3 mb-3">
              <span className="text-sm text-tag-text">{t('remaining')}</span>
              <span className="text-base font-bold text-primary">{t('remainingCount', { count: totalRemaining })}</span>
            </div>
          )}

          {hasPending && (
            <p className="text-xs text-tag-text mb-3 pl-1">
              {t('pendingNotice')}
            </p>
          )}

          {data?.purchasable ? (
            <Button variant="primary" size="lg" className="w-full"
              onClick={() => router.push(`/payments/random-table${returnUrl ? `?returnUrl=${encodeURIComponent(returnUrl)}` : ''}`)}>
              {t('select')}
            </Button>
          ) : (
            <div className="rounded-input bg-tag-bg px-4 py-3 text-sm text-tag-text">
              {eligibility === 'UNREVIEWED' && '신청 심사 승인 후 이용권을 구매할 수 있어요.'}
              {eligibility === 'REJECTED' && '현재 우연한 식탁 참여 자격이 승인되지 않았어요.'}
              {eligibility === 'SUSPENDED' && '현재 우연한 식탁 참여 자격이 정지되어 있어요.'}
              {data?.accountStatus === 'BLOCKED' && '차단된 계정은 이용권을 구매할 수 없어요.'}
            </div>
          )}
        </>
      ) : (
        null
      )}
    </Card>
  )
}
