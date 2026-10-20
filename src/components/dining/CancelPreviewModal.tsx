'use client'

import { useId, useState } from 'react'
import { useTranslations } from 'next-intl'
import RefundAccountForm from '@/components/payment/RefundAccountForm'
import { useCancelDiningApplication, useDiningCancelPreview } from '@/lib/hooks/useApplications'
import { useToastStore } from '@/lib/store/toastStore'
import { getApiErrorCode } from '@/lib/utils/apiError'
import { EMPTY_REFUND_ACCOUNT, normalizeRefundAccount, validateRefundAccount, type RefundAccountErrors } from '@/lib/utils/refundAccount'

interface CancelPreviewModalProps {
  applicationId: string
  onClose: () => void
}

// 취소 버튼 → 지금 취소하면 어떻게 되는지(환불 금액·보증금·이용 제한)를 먼저 보여주고, 확인하면 취소한다. (KAN-410, KAN-419)
export default function CancelPreviewModal({ applicationId, onClose }: CancelPreviewModalProps) {
  const t = useTranslations('mypage.applications.dining.cancel')
  const tCommon = useTranslations('common')
  const tAccount = useTranslations('payment.refundAccount')
  const showToast = useToastStore((s) => s.show)
  const previewQuery = useDiningCancelPreview(applicationId)
  const cancel = useCancelDiningApplication()
  const preview = previewQuery.data
  const titleId = useId()
  const [account, setAccount] = useState(EMPTY_REFUND_ACCOUNT)
  const [accountErrors, setAccountErrors] = useState<RefundAccountErrors>({})
  // 미리보기는 계좌가 필요 없다고 했는데 BE가 REFUND_ACCOUNT_REQUIRED 로 거절하면 그때 폼을 연다
  const [accountDemanded, setAccountDemanded] = useState(false)
  const needsAccount = preview?.requiresRefundAccount === true || accountDemanded
  const close = () => {
    if (!cancel.isPending) onClose()
  }

  const handleConfirm = () => {
    if (needsAccount) {
      const found = validateRefundAccount(account, tAccount('required'))
      setAccountErrors(found)
      if (Object.keys(found).length > 0) return
    }
    cancel.mutate(
      { id: applicationId, data: needsAccount ? { refundAccount: normalizeRefundAccount(account) } : undefined },
      {
        onSuccess: () => {
          showToast(t('done'))
          onClose()
        },
        // 계좌 입력 중 실패면 입력을 지키려고 열어 둔다. 그 밖의 실패는 토스트(훅) 후 닫는다.
        onError: (error) => {
          if (getApiErrorCode(error) === 'REFUND_ACCOUNT_REQUIRED') setAccountDemanded(true)
          else if (!needsAccount) onClose()
        },
      },
    )
  }

  const ticketRefund = preview?.ticketRefundAmount ?? 0
  const depositReturn = preview?.depositReturnAmount ?? 0
  const noRefund = ticketRefund === 0 && depositReturn === 0 && preview?.sanction === true
  const lines = preview
    ? [
        ticketRefund > 0 ? t('preview.ticketRefund', { amount: ticketRefund.toLocaleString() }) : null,
        depositReturn > 0
          ? t(preview.depositOutcome === 'PARTIAL' ? 'preview.depositPartial' : 'preview.depositReturn', { amount: depositReturn.toLocaleString() })
          : preview.depositOutcome === 'FORFEIT' && !noRefund ? t('preview.deposit.FORFEIT') : null,
        noRefund ? t('preview.noRefund') : null,
        preview.sanction ? t('preview.sanction') : null,
      ].filter((line): line is string => !!line)
    : []

  return (
    <div className="fixed lg:absolute inset-0 z-50 flex items-center justify-center bg-foreground/30 px-6" onClick={close}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="max-h-full w-full max-w-[340px] overflow-y-auto rounded-card bg-card p-5 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={titleId} className="text-base font-bold text-foreground">{t('confirmTitle')}</h2>
        {previewQuery.isPending && <p aria-live="polite" className="mt-2 text-sm text-tag-text">{t('preview.loading')}</p>}
        {previewQuery.isError && (
          <div role="alert" className="mt-2">
            <p className="text-sm text-primary break-keep">{t('preview.failed')}</p>
            <button type="button" onClick={() => previewQuery.refetch()} className="mt-1 min-h-[44px] text-sm text-tag-text underline">
              {t('preview.retry')}
            </button>
          </div>
        )}
        {preview && (
          <>
            <p className="mt-2 text-sm font-bold text-primary">{t(`preview.window.${preview.window}`)}</p>
            <ul className="mt-2 flex flex-col gap-1.5 text-sm leading-relaxed text-foreground break-keep">
              {lines.map((line) => (
                <li key={line} className="flex gap-2">
                  <span aria-hidden="true">·</span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-tag-text">{t('preview.irreversible')}</p>
          </>
        )}
        {needsAccount && (
          <div className="mt-4">
            <RefundAccountForm
              title={tAccount('refundTitle')}
              reason={t('preview.refundAccountReason')}
              value={account}
              errors={accountErrors}
              onChange={(next) => {
                setAccount(next)
                setAccountErrors({})
              }}
            />
          </div>
        )}
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button type="button" onClick={close} disabled={cancel.isPending} className="flex min-h-[44px] items-center justify-center rounded-button bg-tag-bg text-sm font-bold text-tag-text disabled:opacity-50">
            {tCommon('close')}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!preview || cancel.isPending}
            className="flex min-h-[44px] items-center justify-center rounded-button bg-primary text-sm font-bold text-white disabled:opacity-50"
          >
            {t('confirm')}
          </button>
        </div>
      </div>
    </div>
  )
}
