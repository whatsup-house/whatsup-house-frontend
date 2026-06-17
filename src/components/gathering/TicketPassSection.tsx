'use client'

import { Ticket } from 'lucide-react'
import { Card, Button } from '@/components/ui'
import { useMyTickets, usePurchaseTicketPass } from '@/lib/hooks/useTickets'
import { useAuthStore } from '@/lib/store/authStore'
import { useToastStore } from '@/lib/store/toastStore'
import { PAYMENT_ACCOUNT } from '@/lib/constants/payment'

// 우연한 식탁(RANDOM_TABLE) 게더링 상세에 노출되는 이용권 선결제 섹션. (KAN-260)
export default function TicketPassSection() {
  const { isLoggedIn } = useAuthStore()
  const { data } = useMyTickets()
  const purchase = usePurchaseTicketPass()
  const showToast = useToastStore((s) => s.show)

  const totalRemaining = data?.totalRemaining ?? 0
  const hasPending = data?.passes?.some((p) => p.status === 'PENDING') ?? false

  const handlePurchase = () => {
    purchase.mutate(
      { product: 'RANDOM_TABLE_FOUR' },
      {
        onSuccess: () =>
          showToast('이용권 구매 요청이 접수됐어요.\n입금 확인 후 이용권이 활성화됩니다.', 'welcome'),
        onError: () =>
          showToast('이용권 구매 요청에 실패했어요. 잠시 후 다시 시도해주세요.', 'error'),
      },
    )
  }

  return (
    <Card className="p-4 mb-6 border border-primary/20">
      <div className="flex items-center gap-2 mb-3">
        <Ticket size={18} className="text-primary shrink-0" />
        <h2 className="text-base font-bold text-foreground">우연한 식탁 이용권</h2>
      </div>

      <p className="text-sm text-tag-text mb-3 leading-relaxed">
        우연한 식탁은 이용권으로 참여해요. 4회권을 미리 결제해두면 매번 따로 결제하지 않아도 됩니다.
      </p>

      {isLoggedIn ? (
        <>
          <div className="flex items-center justify-between bg-tag-bg rounded-input px-4 py-3 mb-3">
            <span className="text-sm text-tag-text">남은 이용권</span>
            <span className="text-base font-bold text-primary">{totalRemaining}회</span>
          </div>

          {hasPending && (
            <p className="text-xs text-tag-text mb-3 pl-1">
              입금 확인 대기 중인 이용권이 있어요. 관리자 확인 후 활성화됩니다.
            </p>
          )}

          <Button
            variant="primary"
            size="lg"
            className="w-full"
            onClick={handlePurchase}
            isLoading={purchase.isPending}
          >
            4회권 선결제 신청
          </Button>

          <div className="mt-3 bg-tag-bg rounded-input px-4 py-3 flex flex-col gap-1">
            <p className="text-xs text-tag-text">입금 계좌 (신청 후 입금)</p>
            <p className="text-sm font-semibold text-foreground">
              {PAYMENT_ACCOUNT.bankName} {PAYMENT_ACCOUNT.accountNumber}
            </p>
            <p className="text-xs text-tag-text">예금주 {PAYMENT_ACCOUNT.accountHolder}</p>
          </div>
        </>
      ) : (
        <p className="text-sm text-primary font-medium">로그인 후 이용권을 구매할 수 있어요.</p>
      )}
    </Card>
  )
}
