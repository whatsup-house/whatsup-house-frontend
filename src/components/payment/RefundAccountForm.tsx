'use client'

import { useTranslations } from 'next-intl'
import { Card, Input } from '@/components/ui'
import { DEPOSIT_AMOUNT } from '@/lib/constants/payment'
import type { DepositReturnAccount } from '@/lib/api/types'

interface RefundAccountFormProps {
  value: DepositReturnAccount
  errors?: Partial<Record<keyof DepositReturnAccount, string>>
  onChange: (value: DepositReturnAccount) => void
  // 보증금 아닌 환불(이용권·멤버십)에서 제목·안내를 바꿔 쓴다 (KAN-410)
  title?: string
  reason?: string
}

// 보증금 반환 계좌 입력 (은행·계좌번호·예금주). 보증금 대상 회원의 신청 단계에서 필수 (KAN-408)
export default function RefundAccountForm({ value, errors, onChange, title, reason }: RefundAccountFormProps) {
  const t = useTranslations('payment.refundAccount')
  const set = (key: keyof DepositReturnAccount) => (event: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...value, [key]: event.target.value })

  return (
    <Card className="p-4 mb-4 border border-primary/20">
      <h2 className="mb-1 text-base font-bold text-foreground">{title ?? t('title')}</h2>
      <p className="mb-4 text-sm leading-relaxed text-tag-text">{reason ?? t('reason', { amount: DEPOSIT_AMOUNT.toLocaleString() })}</p>
      <div className="flex flex-col gap-3">
        <Input label={t('bank')} requiredMark autoComplete="off" placeholder={t('bankPlaceholder')} value={value.bank} onChange={set('bank')} error={errors?.bank} />
        <Input label={t('accountNumber')} requiredMark inputMode="numeric" autoComplete="off" placeholder={t('accountNumberPlaceholder')} value={value.accountNumber} onChange={set('accountNumber')} error={errors?.accountNumber} />
        <Input label={t('holder')} requiredMark autoComplete="off" placeholder={t('holderPlaceholder')} value={value.holder} onChange={set('holder')} error={errors?.holder} />
      </div>
    </Card>
  )
}
