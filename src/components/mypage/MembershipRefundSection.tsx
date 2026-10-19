'use client'

import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import RefundAccountDialog from '@/components/payment/RefundAccountDialog'
import { useRefundMembership } from '@/lib/hooks/useTickets'
import { formatLocalizedShortDate } from '@/lib/utils/date'
import type { TicketPass } from '@/lib/api/types'

// 보유 멤버십 1건 표시 + 환불(첫 참석 전까지만, 계좌 입력). 가능 여부의 최종 판단은 BE. (KAN-410)
export default function MembershipRefundSection({ pass }: { pass: TicketPass }) {
  const t = useTranslations('payment.membershipRefund')
  const locale = useLocale()
  const refund = useRefundMembership()
  const [open, setOpen] = useState(false)

  return (
    <div className="bg-card rounded-card px-5 py-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{pass.productLabel}</p>
          {pass.validUntil && (
            <p className="mt-0.5 text-xs text-tag-text">{t('validUntil', { date: formatLocalizedShortDate(pass.validUntil, locale) })}</p>
          )}
        </div>
        <button type="button" onClick={() => setOpen(true)} className="shrink-0 min-h-[44px] px-2 text-xs text-tag-text underline">
          {t('button')}
        </button>
      </div>
      <p className="mt-1 text-xs text-tag-text break-keep">{t('policy')}</p>
      {open && (
        <RefundAccountDialog
          title={t('confirmTitle')}
          description={t('reason', { amount: pass.purchaseAmount.toLocaleString() })}
          confirmLabel={t('confirm')}
          isPending={refund.isPending}
          onConfirm={(refundAccount) =>
            refund.mutate({ passId: pass.id, data: { refundAccount } }, { onSuccess: () => setOpen(false) })
          }
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  )
}
