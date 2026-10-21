'use client'

import { Ticket } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { Card, Button } from '@/components/ui'
import { useMyTickets } from '@/lib/hooks/useTickets'
import { useAuthStore } from '@/lib/store/authStore'
import { formatLocalizedShortDate } from '@/lib/utils/date'
import { daysUntil, findActiveMembership, getTicketRestriction } from '@/lib/utils/membership'

interface TicketPassSectionProps {
  // 구매 화면에서 돌아올 경로 (신청 흐름에서 입력을 유지한 채 복귀, KAN-344)
  returnUrl?: string
}

// 우연한 식탁(RANDOM_TABLE) 게더링 상세에 노출되는 이용권 선결제 섹션. (KAN-260)
export default function TicketPassSection({ returnUrl }: TicketPassSectionProps) {
  const t = useTranslations('gathering.ticketPass')
  const tPass = useTranslations('payment.pass')
  const locale = useLocale()
  const { isLoggedIn } = useAuthStore()
  const { data } = useMyTickets()
  const router = useRouter()

  const totalRemaining = data?.totalRemaining ?? 0
  const hasPending = data?.passes?.some((p) => p.status === 'PENDING') ?? false

  // 참여 자격 심사는 자동 승인이라 제한·차단된 회원만 막는다.
  const restriction = getTicketRestriction(data)
  // 보유 멤버십이 있으면 신청은 멤버십으로 처리된다 (추가 결제 없음)
  const membership = findActiveMembership(data?.passes)
  const hasCountPass = data?.passes?.some((p) => p.status === 'ACTIVE' && !p.validUntil && p.remainingCount > 0) ?? false
  // 멤버십·횟수권 중 하나만 있으면 그걸로 신청되니 고를 게 없다. 둘 다 있거나(골라 쓰기) 둘 다 없을 때(구매)만 버튼을 띄운다
  const showSelect = Boolean(membership) === hasCountPass

  return (
    <Card className="p-4 mb-6 border border-primary/20">
      <div className="flex items-center gap-2 mb-3">
        <Ticket size={18} className="text-primary shrink-0" />
        <h2 className="text-base font-bold text-foreground">{t('title')}</h2>
      </div>

      <div className="mb-3 space-y-1.5 text-sm text-tag-text leading-relaxed">
        <p>우연한 식탁은 이용권으로 참여해요.</p>
      </div>

      {isLoggedIn ? (
        <>
          {membership?.validUntil ? (
            <div className="bg-primary-light rounded-input px-4 py-3 mb-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-foreground">{tPass('useMembership')}</span>
                <span className="text-sm font-bold text-primary">
                  {tPass('membershipRemaining', { date: formatLocalizedShortDate(membership.validUntil, locale), days: daysUntil(membership.validUntil) })}
                </span>
              </div>
              <p className="mt-1 text-xs text-tag-text">{tPass('membershipNoPayment')}</p>
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

          {restriction ? (
            <div className="rounded-input bg-tag-bg px-4 py-3 text-sm text-tag-text">{tPass(`restricted.${restriction}`)}</div>
          ) : showSelect && (
            <Button variant="primary" size="lg" className="w-full"
              onClick={() => router.push(`/payments/random-table${returnUrl ? `?returnUrl=${encodeURIComponent(returnUrl)}` : ''}`)}>
              {t('select')}
            </Button>
          )}
        </>
      ) : (
        null
      )}
    </Card>
  )
}
