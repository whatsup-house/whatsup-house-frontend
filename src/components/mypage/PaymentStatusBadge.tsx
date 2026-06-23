import { useTranslations } from 'next-intl'
import type { PaymentStatus } from '@/lib/api/types'

const PAYMENT_STYLE: Record<PaymentStatus, string> = {
  PENDING: 'bg-tag-bg text-tag-text',
  CONFIRMED: 'bg-[#E8F5E9] text-[#4CAF50]',
}

// 입금 상태 배지. 무료 게더링(status 없음)은 아무것도 렌더하지 않는다. (KAN-243)
export default function PaymentStatusBadge({ status }: { status?: PaymentStatus | null }) {
  const t = useTranslations('mypage.applications.payment')
  if (!status) return null
  return (
    <span className={`text-xs font-medium px-2 py-1 rounded-full ${PAYMENT_STYLE[status]}`}>
      {t(status)}
    </span>
  )
}
