'use client'

import { useLocale, useTranslations } from 'next-intl'
import { Card, LoadingSpinner } from '@/components/ui'
import { useMyProfile } from '@/lib/hooks/useAuth'
import { useGatheringDetail } from '@/lib/hooks/useGatherings'
import { formatLocalizedShortDateTime } from '@/lib/utils/date'
import { resolvePaymentAccount } from '@/lib/utils/paymentAccount'
import DepositSimulatorCard from './DepositSimulatorCard'
import PaymentPolicyNotice from './PaymentPolicyNotice'

interface PaymentItem {
  label: string
  amount: number
}

interface PaymentPendingPanelProps {
  gatheringId: string          // 입금 계좌를 가져올 게더링. 빈 값이면 폴백 계좌
  payerName: string | null     // 회원 실명. 모르면(비회원) 안내 문구로 대신한다
  items: PaymentItem[]         // 이용권·보증금 내역. 합계가 입금액이다
  deadline?: string | null
  demoTarget?: { applicationId?: string | null; passId?: string | null }  // 심사용 입금 시뮬레이터가 가리킬 결제 대기 건 (KAN-409)
}

// 입금 대기 화면: 계좌 · 금액(내역) · 입금자명(실명) 강조 · 기한 · 자동 확인 안내 (KAN-408)
export default function PaymentPendingPanel({ gatheringId, payerName, items, deadline, demoTarget }: PaymentPendingPanelProps) {
  const t = useTranslations('payment.pending')
  const tAccount = useTranslations('payment.account')
  const locale = useLocale()
  const gatheringDetail = useGatheringDetail(gatheringId)
  const { data: profile } = useMyProfile()

  // 게더링 상세가 오기 전에 폴백 계좌가 먼저 보이지 않게 한다 (송금 안내라 잠깐이라도 다른 계좌가 뜨면 안 됨)
  if (gatheringId && gatheringDetail.isLoading) {
    return <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
  }

  const account = resolvePaymentAccount(gatheringDetail.data, tAccount('bankName'))
  const total = items.reduce((sum, item) => sum + item.amount, 0)

  return (
    <>
      <Card className="p-5 mb-4">
        <p className="mb-2 text-xs text-tag-text">{t('account')}</p>
        <p className="break-all font-semibold">{account.text}</p>
        {account.isFallback && <p className="mt-2 text-sm text-tag-text">{t('holder', { holder: tAccount('accountHolder') })}</p>}

        <dl className="mt-4 space-y-2 border-t border-tag-bg pt-4 text-sm">
          {items.length > 1 && items.map((item) => (
            <div key={item.label} className="flex items-center justify-between gap-3">
              <dt className="text-tag-text">{item.label}</dt>
              <dd>{t('won', { amount: item.amount.toLocaleString() })}</dd>
            </div>
          ))}
          <div className="flex items-center justify-between gap-3">
            <dt className="font-semibold">{t('total')}</dt>
            <dd className="text-lg font-bold text-primary">{t('won', { amount: total.toLocaleString() })}</dd>
          </div>
        </dl>
      </Card>

      <div className="mb-4 rounded-card border-2 border-primary bg-primary-light p-4 text-center">
        <p className="text-xs font-bold text-primary">{t('payerNameLabel')}</p>
        <p className="mt-1 break-all text-2xl font-bold text-foreground">{payerName ?? t('payerNameFallback')}</p>
        <p className="mt-2 text-xs text-tag-text">{t('payerNameHint')}</p>
      </div>

      {deadline && (
        <p className="mb-2 text-center text-sm text-tag-text">{t('deadline', { at: formatLocalizedShortDateTime(deadline, locale) })}</p>
      )}
      <p role="status" className="mb-4 text-center text-sm font-semibold text-foreground">{t('autoConfirm')}</p>

      {profile?.isDemo && demoTarget && (
        <DepositSimulatorCard amount={total} applicationId={demoTarget.applicationId} passId={demoTarget.passId} />
      )}

      <PaymentPolicyNotice />
    </>
  )
}
