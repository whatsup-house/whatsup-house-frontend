'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Check, Ticket } from 'lucide-react'
import { Button, Card, LoadingSpinner } from '@/components/ui'
import { useGuestTickets, useMyTickets, usePurchaseGuestTicketPass, usePurchaseTicketPass } from '@/lib/hooks/useTickets'
import { useRequireAuth } from '@/lib/hooks/useRequireAuth'
import { useToastStore } from '@/lib/store/toastStore'
import { PAYMENT_ACCOUNT } from '@/lib/constants/payment'
import type { TicketPass, TicketProduct } from '@/lib/api/types'

const PRODUCTS = [
  { product: 'RANDOM_TABLE_ONE' as TicketProduct, label: '1회권', price: 10000, description: '이번 모임만 가볍게 참여해요' },
  { product: 'RANDOM_TABLE_FOUR' as TicketProduct, label: '4회권', price: 40000, description: '여러 번 참여할 계획이라면 편리해요' },
]

function PaymentContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const bookingNumber = searchParams.get('bookingNumber')
  const { isLoggedIn, isInitialized } = useRequireAuth()
  const memberTickets = useMyTickets()
  const guestTickets = useGuestTickets(bookingNumber)
  const memberPurchase = usePurchaseTicketPass()
  const guestPurchase = usePurchaseGuestTicketPass()
  const showToast = useToastStore((state) => state.show)
  const [selected, setSelected] = useState<TicketProduct>('RANDOM_TABLE_ONE')
  const [requestedPass, setRequestedPass] = useState<TicketPass | null>(null)

  useEffect(() => {
    if (isInitialized && !isLoggedIn && !bookingNumber) {
      const target = '/payments/random-table'
      router.replace(`/login?returnUrl=${encodeURIComponent(target)}`)
    }
  }, [bookingNumber, isInitialized, isLoggedIn, router])

  const isGuestPurchase = Boolean(bookingNumber)
  const data = isGuestPurchase ? guestTickets.data : memberTickets.data
  const isLoading = isGuestPurchase ? guestTickets.isLoading : memberTickets.isLoading
  const purchase = isGuestPurchase ? guestPurchase : memberPurchase

  if (!isInitialized || (!isGuestPurchase && !isLoggedIn) || isLoading) {
    return <div className="flex justify-center py-24"><LoadingSpinner size="lg" /></div>
  }

  const product = PRODUCTS.find((item) => item.product === selected)!
  const canPurchase = data?.purchasable === true
  const pendingPass = requestedPass ?? data?.passes.find((pass) => pass.status === 'PENDING') ?? null
  const confirmedPass = data?.passes.find((pass) => pass.paymentConfirmedAt !== null) ?? null
  const displayPass = pendingPass ?? confirmedPass
  const isPaymentComplete = Boolean(displayPass?.paymentConfirmedAt)
  const submit = async () => {
    try {
      if (bookingNumber) {
        const pass = await guestPurchase.mutateAsync({ bookingNumber, product: selected })
        setRequestedPass(pass)
      } else {
        await memberPurchase.mutateAsync({ product: selected })
      }
      showToast(`${product.label} 구매 요청이 접수됐어요.`, 'welcome')
      if (!bookingNumber) router.push('/mypage')
    } catch (error) {
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message
      showToast(message ?? '이용권 구매 요청에 실패했어요.', 'error')
    }
  }

  return (
    <div className="min-h-screen bg-background px-5 py-6">
      <div className="flex items-center gap-2 mb-2"><Ticket size={22} className="text-primary" /><h1 className="text-xl font-bold">우연한 식탁 이용권</h1></div>
      <p className="text-sm text-tag-text mb-6">
        {isPaymentComplete ? '참가 확정 정보를 확인해 주세요.' : displayPass ? '입금 정보를 확인해 주세요.' : '원하는 이용권을 선택해 주세요.'}
      </p>
      {bookingNumber && <Card className="p-4 mb-4 bg-tag-bg"><p className="text-xs text-tag-text">신청 예약번호</p><p className="font-bold text-primary mt-1">{bookingNumber}</p></Card>}
      {displayPass ? (
        isPaymentComplete ? (
          <>
            <Card className="p-5 mb-4 bg-primary-light">
              <p className="text-xs font-bold text-primary mb-2">입금완료</p>
              <p className="font-bold text-lg">{displayPass.productLabel} 결제가 완료됐어요</p>
              <p className="text-sm text-tag-text mt-2">이번 모임에 이용권 1회가 자동 사용됐어요.</p>
            </Card>
            <Card className="p-5 mb-5">
              <div className="flex items-center justify-between border-b border-tag-bg pb-4">
                <span className="text-sm text-tag-text">남은 이용권</span>
                <strong className="text-lg text-primary">{displayPass.remainingCount}회</strong>
              </div>
              <div className="flex items-center justify-between pt-4">
                <span className="text-sm text-tag-text">신청 상태</span>
                <strong>참가 확정</strong>
              </div>
            </Card>
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              onClick={() => {
                if (data?.gatheringId) {
                  router.push(`/gatherings/${data.gatheringId}/apply/confirmed${bookingNumber ? `?bookingNumber=${encodeURIComponent(bookingNumber)}` : ''}`)
                }
              }}
              disabled={!data?.gatheringId}
            >
              예약 확정 페이지로 이동
            </Button>
          </>
        ) : (
          <>
            <Card className="p-5 mb-4">
              <p className="font-bold text-lg">{displayPass.productLabel} 구매 요청이 접수됐어요</p>
              <p className="text-sm text-tag-text mt-2">아래 계좌로 입금해 주시면 관리자가 최대한 빨리 확인해 드려요.</p>
            </Card>
            <Card className="p-5 mb-4">
              <p className="text-xs text-tag-text mb-2">입금 계좌</p>
              <p className="font-semibold">{PAYMENT_ACCOUNT.bankName} {PAYMENT_ACCOUNT.accountNumber}</p>
              <p className="text-sm text-tag-text mt-2">예금주 {PAYMENT_ACCOUNT.accountHolder}</p>
              <p className="text-lg font-bold text-primary mt-3">{displayPass.purchaseAmount.toLocaleString()}원</p>
            </Card>
            <p className="mb-4 text-center text-xs text-tag-text">입금 확인 → 이용권 1회 자동 사용 → 신청 확정</p>
            <div className="flex min-h-[56px] w-full items-center justify-center rounded-button bg-[#E5968D] text-lg font-bold text-white">
              입금 확인중
            </div>
          </>
        )
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 mb-5">
            {PRODUCTS.map((item) => {
              const active = selected === item.product
              return <button key={item.product} type="button" onClick={() => setSelected(item.product)} className={`relative text-left rounded-card border p-4 ${active ? 'border-primary bg-primary-light' : 'border-tag-bg bg-card'}`}>
                {active && <Check size={16} className="absolute right-3 top-3 text-primary" />}
                <p className="font-bold">{item.label}</p><p className="text-lg font-bold text-primary mt-2">{item.price.toLocaleString()}원</p><p className="text-xs text-tag-text mt-2">{item.description}</p>
              </button>
            })}
          </div>
          {!canPurchase && <Card className="p-4 mb-4 text-sm text-tag-text">심사 승인 후 구매할 수 있어요. 현재 자격: {data?.randomTableEligibility ?? '확인 중'}</Card>}
          <Button variant="primary" size="lg" className="w-full" disabled={!canPurchase} isLoading={purchase.isPending} onClick={submit}>{product.label} 구매 요청</Button>
        </>
      )}
    </div>
  )
}

export default function RandomTablePaymentPage() {
  return <Suspense fallback={<div className="flex justify-center py-24"><LoadingSpinner size="lg" /></div>}><PaymentContent /></Suspense>
}
