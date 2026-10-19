'use client'

import { useTranslations } from 'next-intl'
import { useCancelDiningApplication, useDiningCancelPreview } from '@/lib/hooks/useApplications'
import { useToastStore } from '@/lib/store/toastStore'

interface CancelPreviewModalProps {
  applicationId: string
  onClose: () => void
}

// 취소 버튼 → 지금 취소하면 어떻게 되는지(이용권·환불·보증금·이용 제한)를 먼저 보여주고, 확인하면 취소한다. (KAN-410)
export default function CancelPreviewModal({ applicationId, onClose }: CancelPreviewModalProps) {
  const t = useTranslations('mypage.applications.dining.cancel')
  const tCommon = useTranslations('common')
  const showToast = useToastStore((s) => s.show)
  const previewQuery = useDiningCancelPreview(applicationId)
  const cancel = useCancelDiningApplication()
  const preview = previewQuery.data

  const handleConfirm = () => {
    cancel.mutate(applicationId, {
      onSuccess: () => showToast(t('done')),
      onSettled: onClose,
    })
  }

  const lines = preview
    ? [
        t(preview.ticketRestored ? 'preview.ticketRestored' : 'preview.ticketKept'),
        t(preview.refundable ? 'preview.refundable' : 'preview.notRefundable'),
        preview.depositOutcome !== 'NONE' ? t(`preview.deposit.${preview.depositOutcome}`) : null,
        preview.sanction ? t('preview.sanction') : null,
      ].filter((line): line is string => !!line)
    : []

  return (
    <div className="fixed lg:absolute inset-0 z-50 flex items-center justify-center bg-foreground/30 px-6" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('confirmTitle')}
        className="w-full max-w-[340px] rounded-card bg-card p-5 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-bold text-foreground">{t('confirmTitle')}</h2>
        {previewQuery.isPending && <p className="mt-2 text-sm text-tag-text">{t('preview.loading')}</p>}
        {previewQuery.isError && <p className="mt-2 text-sm text-primary break-keep">{t('preview.failed')}</p>}
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
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button type="button" onClick={onClose} className="flex min-h-[44px] items-center justify-center rounded-button bg-tag-bg text-sm font-bold text-tag-text">
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
