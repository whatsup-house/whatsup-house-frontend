'use client'

import { Ticket } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Card, Button } from '@/components/ui'
import { useMyTickets, usePurchaseTicketPass } from '@/lib/hooks/useTickets'
import { useAuthStore } from '@/lib/store/authStore'
import { useToastStore } from '@/lib/store/toastStore'
import { PAYMENT_ACCOUNT } from '@/lib/constants/payment'

// 우연한 식탁(RANDOM_TABLE) 게더링 상세에 노출되는 이용권 선결제 섹션. (KAN-260)
export default function TicketPassSection() {
  const t = useTranslations('gathering.ticketPass')
  const tPayment = useTranslations('payment.account')
  const { isLoggedIn } = useAuthStore()
  const { data } = useMyTickets()
  const purchase = usePurchaseTicketPass()
  const showToast = useToastStore((s) => s.show)

  const totalRemaining = data?.totalRemaining ?? 0
  const hasPending = data?.passes?.some((p) => p.status === 'PENDING') ?? false

  const handlePurchase = () => {
    purchase.mutate(
      { product: 'RANDOM_TABLE_FOUR' },
      {
        onSuccess: () =>
          showToast(t('purchaseSuccess'), 'welcome'),
        onError: () =>
          showToast(t('purchaseFailed'), 'error'),
      },
    )
  }

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

          <Button
            variant="primary"
            size="lg"
            className="w-full"
            onClick={handlePurchase}
            isLoading={purchase.isPending}
          >
            {t('purchase')}
          </Button>

          <div className="mt-3 bg-tag-bg rounded-input px-4 py-3 flex flex-col gap-1">
            <p className="text-xs text-tag-text">{t('depositAccount')}</p>
            <p className="text-sm font-semibold text-foreground">
              {tPayment('bankName')} {PAYMENT_ACCOUNT.accountNumber}
            </p>
            <p className="text-xs text-tag-text">{t('accountHolder', { holder: tPayment('accountHolder') })}</p>
          </div>
        </>
      ) : (
        <p className="text-sm text-primary font-medium">{t('loginRequired')}</p>
      )}
    </Card>
  )
}
