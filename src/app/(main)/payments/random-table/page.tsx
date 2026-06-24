'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Check, Ticket } from 'lucide-react'
import { Button, Card, LoadingSpinner } from '@/components/ui'
import { fetchMyApplicationDetail } from '@/lib/api/application'
import { useGuestTickets, useMyTickets, usePurchaseGuestTicketPass, usePurchaseTicketPass, useTicketProducts } from '@/lib/hooks/useTickets'
import { useRequireAuth } from '@/lib/hooks/useRequireAuth'
import { useToastStore } from '@/lib/store/toastStore'
import { PAYMENT_ACCOUNT } from '@/lib/constants/payment'
import type { TicketPass } from '@/lib/api/types'

function PaymentContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const bookingNumber = searchParams.get('bookingNumber')
  const applicationId = searchParams.get('applicationId')
  const { isLoggedIn, isInitialized } = useRequireAuth()
  const productsQuery = useTicketProducts()
  const memberTickets = useMyTickets(applicationId)
  const guestTickets = useGuestTickets(bookingNumber)
  const memberApplicationDetail = useQuery({
    queryKey: ['application', applicationId],
    queryFn: () => fetchMyApplicationDetail(applicationId!),
    enabled: Boolean(applicationId && isLoggedIn),
    retry: false,
  })
  const memberPurchase = usePurchaseTicketPass()
  const guestPurchase = usePurchaseGuestTicketPass()
  const showToast = useToastStore((state) => state.show)
  const [selected, setSelected] = useState<string | null>(null)
  const [requestedPass, setRequestedPass] = useState<TicketPass | null>(null)

  useEffect(() => {
    if (isInitialized && !isLoggedIn && !bookingNumber) {
      const target = `/payments/random-table${applicationId ? `?applicationId=${encodeURIComponent(applicationId)}` : ''}`
      router.replace(`/login?returnUrl=${encodeURIComponent(target)}`)
    }
  }, [applicationId, bookingNumber, isInitialized, isLoggedIn, router])

  const isGuestPurchase = Boolean(bookingNumber)
  const data = isGuestPurchase ? guestTickets.data : memberTickets.data
  const isLoading = productsQuery.isLoading
    || (isGuestPurchase ? guestTickets.isLoading : memberTickets.isLoading)
    || Boolean(applicationId && isLoggedIn && memberApplicationDetail.isLoading)
  const purchase = isGuestPurchase ? guestPurchase : memberPurchase

  if (!isInitialized || (!isGuestPurchase && !isLoggedIn) || isLoading) {
    return <div className="flex justify-center py-24"><LoadingSpinner size="lg" /></div>
  }

  const products = productsQuery.data ?? []
  const displayBookingNumber = bookingNumber ?? memberApplicationDetail.data?.bookingNumber ?? data?.bookingNumber ?? null
  const selectedProductId = selected ?? products[0]?.id ?? null
  const product = products.find((item) => item.id === selectedProductId) ?? products[0]
  const canPurchase = data?.purchasable === true
  const matchesCurrentApplication = (pass: TicketPass) => {
    if (!applicationId && !bookingNumber) return true
    return !data?.applicationId || pass.applicationId === data.applicationId
  }
  const pendingPass = requestedPass ?? data?.passes.find((pass) => pass.status === 'PENDING' && matchesCurrentApplication(pass)) ?? null
  const confirmedPass = data?.passes.find((pass) => pass.paymentConfirmedAt !== null && matchesCurrentApplication(pass)) ?? null
  const displayPass = pendingPass ?? confirmedPass
  const isApplicationConfirmed = data?.applicationStatus === 'CONFIRMED' || data?.applicationStatus === 'ATTENDED'
  const isPaymentComplete = Boolean(displayPass?.paymentConfirmedAt && isApplicationConfirmed)
  const submit = async () => {
    if (!product) {
      showToast('구매 가능한 이용권 상품이 없어요.', 'error')
      return
    }
    try {
      if (bookingNumber) {
        const pass = await guestPurchase.mutateAsync({ bookingNumber, productId: product.id })
        setRequestedPass(pass)
      } else {
        const pass = await memberPurchase.mutateAsync({ productId: product.id, applicationId })
        setRequestedPass(pass)
      }
      showToast(`${product.name} 구매 요청이 접수됐어요.`, 'welcome')
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
      {displayBookingNumber && (
        <Card className="p-4 mb-4 bg-tag-bg">
          <p className="text-xs text-tag-text">신청 예약번호</p>
          <p className="font-bold text-primary mt-1">{displayBookingNumber}</p>
        </Card>
      )}
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
                  const query = bookingNumber
                    ? `bookingNumber=${encodeURIComponent(bookingNumber)}`
                    : data.applicationId ? `applicationId=${encodeURIComponent(data.applicationId)}` : ''
                  router.push(`/gatherings/${data.gatheringId}/apply/confirmed${query ? `?${query}` : ''}`)
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
              <p className="font-semibold">우리은행 {PAYMENT_ACCOUNT.accountNumber}</p>
              <p className="text-sm text-tag-text mt-2">예금주 와썹하우스</p>
              <p className="text-lg font-bold text-primary mt-3">{displayPass.purchaseAmount.toLocaleString()}원</p>
            </Card>
            <p className="mb-4 text-center text-xs text-tag-text">입금 확인 → 이용권 1회 자동 사용 → 신청 확정</p>
            <div className="flex min-h-[56px] w-full items-center justify-center rounded-button bg-[#E5968D] text-lg font-bold text-white">
              입금확인중
            </div>
          </>
        )
      ) : (
        <>
          {products.length === 0 ? (
            <Card className="p-5 mb-5 text-sm text-tag-text">현재 구매 가능한 이용권 상품이 없어요.</Card>
          ) : (
          <div className="grid grid-cols-2 gap-3 mb-5">
            {products.map((item) => {
              const active = selectedProductId === item.id
              const label = item.name.replace(/^우연한 식탁\s*/, '')
              const description = item.sessionCount === 1 ? '이번 모임만 가볍게 참여해요' : `${item.sessionCount}번 참여할 계획이라면 편리해요`
              return <button key={item.id} type="button" onClick={() => setSelected(item.id)} className={`relative text-left rounded-card border p-4 ${active ? 'border-primary bg-primary-light' : 'border-tag-bg bg-card'}`}>
                {active && <Check size={16} className="absolute right-3 top-3 text-primary" />}
                <p className="font-bold">{label}</p><p className="text-lg font-bold text-primary mt-2">{item.price.toLocaleString()}원</p><p className="text-xs text-tag-text mt-2">{description}</p>
              </button>
            })}
          </div>
          )}
          {!canPurchase && (
            <Card className="p-4 mb-4 text-sm text-tag-text">
              심사가 완료되면 이용권을 구매할 수 있어요. 승인 안내를 받은 뒤 다시 확인해 주세요.
            </Card>
          )}
          <Button variant="primary" size="lg" className="w-full" disabled={!canPurchase || !product} isLoading={purchase.isPending} onClick={submit}>{product?.name ?? '이용권'} 구매 요청</Button>
        </>
      )}
    </div>
  )
}

export default function RandomTablePaymentPage() {
  return <Suspense fallback={<div className="flex justify-center py-24"><LoadingSpinner size="lg" /></div>}><PaymentContent /></Suspense>
}
