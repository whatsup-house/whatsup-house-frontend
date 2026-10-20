import { useTranslations } from 'next-intl'
import { Card } from '@/components/ui'

// 마감·취소·노쇼 정책 요약. 결제 전후 화면에 고정 노출한다. (KAN-408, PAY-02)
export default function PaymentPolicyNotice() {
  const t = useTranslations('payment.policy')
  return (
    <Card className="p-4 mb-4">
      <h2 className="mb-2 text-sm font-bold text-foreground">{t('title')}</h2>
      <ul className="list-disc space-y-1.5 pl-4 text-xs leading-relaxed text-tag-text">
        <li>{t('deadline')}</li>
        <li>{t('cancelBefore')}</li>
        <li>{t('cancelAfter')}</li>
        <li>{t('sameDayNoShow')}</li>
      </ul>
    </Card>
  )
}
