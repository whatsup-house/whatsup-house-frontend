import { useTranslations } from 'next-intl'
import { Card } from '@/components/ui'

export const POLICY_CONFIRM_ID = 'payment-policy-confirm'

interface PaymentPolicyNoticeProps {
  // 주면 하단에 '확인했습니다' 체크박스를 단다 — 우연한 식탁 신청 제출 게이트용 (KAN-419)
  confirmed?: boolean
  onConfirmedChange?: (confirmed: boolean) => void
  // 체크 안 하고 제출을 누르면 잠깐 강조한다
  highlighted?: boolean
}

// 마감·취소·노쇼 정책 요약. 결제 전후 화면에 고정 노출한다. (KAN-408, PAY-02)
export default function PaymentPolicyNotice({ confirmed, onConfirmedChange, highlighted }: PaymentPolicyNoticeProps) {
  const t = useTranslations('payment.policy')
  return (
    <Card className="p-4 mb-4">
      <h2 className="mb-2 text-sm font-bold text-foreground">{t('title')}</h2>
      <ul className="list-disc space-y-1.5 pl-4 text-xs leading-relaxed text-tag-text">
        <li>{t('deadline')}</li>
        <li>{t('depositSanction')}</li>
        <li>{t('cancelBefore')}</li>
        <li>{t('cancelAfter')}</li>
        <li>{t('sameDayNoShow')}</li>
      </ul>
      {onConfirmedChange && (
        <div className="mt-3 border-t border-tag-bg pt-3">
          <label
            id={POLICY_CONFIRM_ID}
            className={`flex min-h-[44px] cursor-pointer items-center gap-2 rounded-input px-2 text-sm font-medium text-foreground transition-[background-color,box-shadow] duration-200 motion-reduce:transition-none ${
              highlighted ? 'ring-2 ring-primary motion-safe:bg-primary-light' : ''
            }`}
          >
            <input
              type="checkbox"
              checked={confirmed ?? false}
              onChange={(event) => onConfirmedChange(event.target.checked)}
              className="h-4 w-4 shrink-0 accent-primary"
            />
            {t('confirm')}
          </label>
        </div>
      )}
    </Card>
  )
}
