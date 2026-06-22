'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Check, Ticket } from 'lucide-react'
import { Button, Card, LoadingSpinner } from '@/components/ui'
import { useMyTickets, usePurchaseTicketPass } from '@/lib/hooks/useTickets'
import { useRequireAuth } from '@/lib/hooks/useRequireAuth'
import { useToastStore } from '@/lib/store/toastStore'
import { PAYMENT_ACCOUNT } from '@/lib/constants/payment'
import type { TicketProduct } from '@/lib/api/types'

const PRODUCTS = [
  { product: 'RANDOM_TABLE_ONE' as TicketProduct, label: '1회권', price: 10000, description: '이번 모임만 가볍게 참여해요' },
  { product: 'RANDOM_TABLE_FOUR' as TicketProduct, label: '4회권', price: 40000, description: '여러 번 참여할 계획이라면 편리해요' },
]

function PaymentContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const bookingNumber = searchParams.get('bookingNumber')
  const { isLoggedIn, isInitialized } = useRequireAuth()
  const { data, isLoading } = useMyTickets()
  const purchase = usePurchaseTicketPass()
  const showToast = useToastStore((state) => state.show)
  const [selected, setSelected] = useState<TicketProduct>('RANDOM_TABLE_ONE')

  useEffect(() => {
    if (isInitialized && !isLoggedIn) {
      const target = `/payments/random-table${bookingNumber ? `?bookingNumber=${encodeURIComponent(bookingNumber)}` : ''}`
      router.replace(`/login?returnUrl=${encodeURIComponent(target)}`)
    }
  }, [bookingNumber, isInitialized, isLoggedIn, router])

  if (!isInitialized || !isLoggedIn || isLoading) {
    return <div className="flex justify-center py-24"><LoadingSpinner size="lg" /></div>
  }

  const product = PRODUCTS.find((item) => item.product === selected)!
  const canPurchase = data?.purchasable === true
  const submit = async () => {
    try {
      await purchase.mutateAsync({ product: selected })
      showToast(`${product.label} 구매 요청이 접수됐어요.`, 'welcome')
      router.push('/mypage')
    } catch (error) {
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message
      showToast(message ?? '이용권 구매 요청에 실패했어요.', 'error')
    }
  }

  return (
    <div className="min-h-screen bg-background px-5 py-6">
      <div className="flex items-center gap-2 mb-2"><Ticket size={22} className="text-primary" /><h1 className="text-xl font-bold">우연한 식탁 이용권</h1></div>
      <p className="text-sm text-tag-text mb-6">원하는 이용권을 선택하고 안내 계좌로 입금해 주세요.</p>
      {bookingNumber && <Card className="p-4 mb-4 bg-tag-bg"><p className="text-xs text-tag-text">신청 예약번호</p><p className="font-bold text-primary mt-1">{bookingNumber}</p></Card>}
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
      <Card className="p-4 mb-5"><p className="text-xs text-tag-text mb-1">입금 계좌</p><p className="font-semibold">{PAYMENT_ACCOUNT.bankName} {PAYMENT_ACCOUNT.accountNumber}</p><p className="text-xs text-tag-text mt-1">예금주 {PAYMENT_ACCOUNT.accountHolder} · {product.price.toLocaleString()}원</p></Card>
      <Button variant="primary" size="lg" className="w-full" disabled={!canPurchase} isLoading={purchase.isPending} onClick={submit}>{product.label} 구매 요청</Button>
    </div>
  )
}

export default function RandomTablePaymentPage() {
  return <Suspense fallback={<div className="flex justify-center py-24"><LoadingSpinner size="lg" /></div>}><PaymentContent /></Suspense>
}
