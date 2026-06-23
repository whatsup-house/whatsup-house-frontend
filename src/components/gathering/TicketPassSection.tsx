'use client'

import { Ticket } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Card, Button } from '@/components/ui'
import { useMyTickets } from '@/lib/hooks/useTickets'
import { useAuthStore } from '@/lib/store/authStore'

// 우연한 식탁(RANDOM_TABLE) 게더링 상세에 노출되는 이용권 선결제 섹션. (KAN-260)
export default function TicketPassSection() {
  const t = useTranslations('gathering.ticketPass')
  const { isLoggedIn } = useAuthStore()
  const { data } = useMyTickets()
  const router = useRouter()

  const totalRemaining = data?.totalRemaining ?? 0
  const hasPending = data?.passes?.some((p) => p.status === 'PENDING') ?? false

  const eligibility = data?.randomTableEligibility

  return (
    <Card className="p-4 mb-6 border border-primary/20">
      <div className="flex items-center gap-2 mb-3">
        <Ticket size={18} className="text-primary shrink-0" />
        <h2 className="text-base font-bold text-foreground">{t('title')}</h2>
      </div>

      <p className="text-sm text-tag-text mb-3 leading-relaxed">
        {t('description')}
      </p>

      {isLoggedIn ? (
        <>
          <div className="flex items-center justify-between bg-tag-bg rounded-input px-4 py-3 mb-3">
            <span className="text-sm text-tag-text">{t('remaining')}</span>
            <span className="text-base font-bold text-primary">{t('remainingCount', { count: totalRemaining })}</span>
          </div>

          {hasPending && (
            <p className="text-xs text-tag-text mb-3 pl-1">
              {t('pendingNotice')}
            </p>
          )}

          {data?.purchasable ? (
            <Button variant="primary" size="lg" className="w-full"
              onClick={() => router.push('/payments/random-table')}>
              1회권·4회권 선택하기
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
        <p className="text-sm text-primary font-medium">{t('loginRequired')}</p>
      )}
    </Card>
  )
}
