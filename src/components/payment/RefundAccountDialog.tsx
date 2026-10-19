'use client'

import { useId, useState } from 'react'
import { useTranslations } from 'next-intl'
import RefundAccountForm from '@/components/payment/RefundAccountForm'
import { EMPTY_REFUND_ACCOUNT, normalizeRefundAccount, validateRefundAccount, type RefundAccountErrors } from '@/lib/utils/refundAccount'
import type { DepositReturnAccount } from '@/lib/api/types'

interface RefundAccountDialogProps {
  title: string
  description: string
  confirmLabel: string
  isPending: boolean
  onConfirm: (account: DepositReturnAccount) => void
  onClose: () => void
}

// 환불받을 계좌를 받는 확인 다이얼로그 — 매칭 실패 환불 선택, 멤버십 환불 공용 (KAN-410)
export default function RefundAccountDialog({ title, description, confirmLabel, isPending, onConfirm, onClose }: RefundAccountDialogProps) {
  const tCommon = useTranslations('common')
  const tForm = useTranslations('payment.refundAccount')
  const [account, setAccount] = useState(EMPTY_REFUND_ACCOUNT)
  const [errors, setErrors] = useState<RefundAccountErrors>({})
  const titleId = useId()
  const close = () => {
    if (!isPending) onClose()
  }

  const handleConfirm = () => {
    const found = validateRefundAccount(account, tForm('required'))
    setErrors(found)
    if (Object.keys(found).length === 0) onConfirm(normalizeRefundAccount(account))
  }

  return (
    <div className="fixed lg:absolute inset-0 z-50 flex items-center justify-center bg-foreground/30 px-6" onClick={close}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="max-h-full w-full max-w-[340px] overflow-y-auto rounded-card bg-card p-5 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={titleId} className="text-base font-bold text-foreground">{title}</h2>
        <RefundAccountForm
          title={tForm('refundTitle')}
          reason={description}
          value={account}
          errors={errors}
          onChange={(next) => {
            setAccount(next)
            setErrors({})
          }}
        />
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={close} disabled={isPending} className="flex min-h-[44px] items-center justify-center rounded-button bg-tag-bg text-sm font-bold text-tag-text disabled:opacity-50">
            {tCommon('cancel')}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isPending}
            className="flex min-h-[44px] items-center justify-center rounded-button bg-primary text-sm font-bold text-white disabled:opacity-50"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
