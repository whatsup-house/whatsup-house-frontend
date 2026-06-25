import { useTranslations } from 'next-intl'
import type { PaymentStatus } from '@/lib/api/types'

const PAYMENT_STYLE: Record<PaymentStatus, string> = {
  PENDING: 'bg-tag-bg text-tag-text',
  CONFIRMED: 'bg-[#E8F5E9] text-[#4CAF50]',
  FREE: 'bg-primary-light text-primary',
}

// 결제 상태 배지. 유료 우연한 식탁 이용권 결제는 별도 화면에서 다룬다.
export default function PaymentStatusBadge({ status }: { status?: PaymentStatus | null }) {
  const t = useTranslations('mypage.applications.payment')
  if (!status) return null
  return (
    <span className={`text-xs font-medium px-2 py-1 rounded-full ${PAYMENT_STYLE[status]}`}>
      {t(status)}
    </span>
  )
}
