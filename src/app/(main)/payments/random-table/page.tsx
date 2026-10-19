'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { Check, Ticket } from 'lucide-react'
import { Button, Card, LoadingSpinner } from '@/components/ui'
import PaymentPendingPanel from '@/components/payment/PaymentPendingPanel'
import PaymentPolicyNotice from '@/components/payment/PaymentPolicyNotice'
import { useMyProfile } from '@/lib/hooks/useAuth'
import { useMyApplicationDetail, useMyDiningApplications } from '@/lib/hooks/useApplications'
import { useGatheringDetail } from '@/lib/hooks/useGatherings'
import { useGuestTickets, useMyTickets, usePurchaseGuestTicketPass, usePurchaseTicketPass, useTicketProducts } from '@/lib/hooks/useTickets'
import { useRequireAuth } from '@/lib/hooks/useRequireAuth'
import { useToastStore } from '@/lib/store/toastStore'
import { DEPOSIT_AMOUNT } from '@/lib/constants/payment'
import { formatLocalizedShortDate } from '@/lib/utils/date'
import { daysUntil, findActiveMembership, getTicketRestriction, isMembershipProduct } from '@/lib/utils/membership'
import { safeReturnUrl } from '@/lib/utils/url'
import type { TicketPass } from '@/lib/api/types'

// 보유 멤버십으로 신청하는 선택지의 id (상품 id 와 겹치지 않는다)
const MEMBERSHIP_OPTION = 'membership'

function PaymentContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const bookingNumber = searchParams.get('bookingNumber')
  const applicationId = searchParams.get('applicationId')
  // 우연한 식탁 신청 흐름에서 들어오면 입력을 유지한 신청 화면으로 돌아갈 수 있게 한다. (KAN-344)
  const returnUrl = searchParams.get('returnUrl')
  const { isLoggedIn, isInitialized } = useRequireAuth()
  const productsQuery = useTicketProducts()
  const memberTickets = useMyTickets(applicationId)
  const guestTickets = useGuestTickets(bookingNumber)
  // 빈 id면 훅이 비활성화된다(enabled: !!id).
  const memberApplicationDetail = useMyApplicationDetail(applicationId && isLoggedIn ? applicationId : '')
  // 입금 계좌는 게더링 상세에서 가져온다. 비회원은 이용권 응답의 gatheringId를 쓴다. 못 구하면 폴백 계좌. (KAN-391)
  const gatheringId = memberApplicationDetail.data?.gathering.id ?? guestTickets.data?.gatheringId ?? ''
  const gatheringDetail = useGatheringDetail(gatheringId)
  const t = useTranslations('payment.pass')
  const locale = useLocale()
  const { data: profile } = useMyProfile()
  // 보증금 상태는 내 우연한 식탁 신청 목록의 신청별 deposit 에서 읽는다 (입금 대기 중엔 10초마다 갱신). (KAN-408)
  const diningApplications = useMyDiningApplications(Boolean(applicationId && isLoggedIn))
  const diningApplication = diningApplications.data?.find((item) => item.id === applicationId)
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
    || diningApplications.isLoading
    // 게더링 상세가 오기 전에 폴백 계좌가 먼저 보이지 않게 한다 (송금 안내라 잠깐이라도 다른 계좌가 뜨면 안 됨)
    || Boolean(gatheringId && gatheringDetail.isLoading)
  const purchase = isGuestPurchase ? guestPurchase : memberPurchase

  if (!isInitialized || (!isGuestPurchase && !isLoggedIn) || isLoading) {
    return <div className="flex justify-center py-24"><LoadingSpinner size="lg" /></div>
  }

  const products = productsQuery.data ?? []
  const membership = isGuestPurchase ? null : findActiveMembership(data?.passes)
  const selectedProductId = selected ?? (membership ? MEMBERSHIP_OPTION : products[0]?.id ?? null)
  const useMembership = membership !== null && selectedProductId === MEMBERSHIP_OPTION
  const product = useMembership ? undefined : (products.find((item) => item.id === selectedProductId) ?? products[0])
  // 참여 자격 심사는 자동 승인이라 제한·차단된 회원만 막는다.
  const restriction = getTicketRestriction(data)
  const canPurchase = restriction === null
  const matchesCurrentApplication = (pass: TicketPass) => {
    if (!applicationId && !bookingNumber) return true
    return !data?.applicationId || pass.applicationId === data.applicationId
  }
  // 방금 요청한 이용권은 폴링으로 받은 최신 상태(입금 확인됨)가 있으면 그걸 쓴다.
  const pendingPass = (requestedPass && (data?.passes.find((pass) => pass.id === requestedPass.id) ?? requestedPass)) ?? data?.passes.find((pass) => pass.status === 'PENDING' && matchesCurrentApplication(pass)) ?? null
  const confirmedPass = data?.passes.find((pass) => pass.paymentConfirmedAt !== null && matchesCurrentApplication(pass)) ?? null
  const displayPass = pendingPass ?? confirmedPass
  const isApplicationConfirmed = data?.applicationStatus === 'CONFIRMED' || data?.applicationStatus === 'ATTENDED'
  // 신청 없이 산 이용권은 입금 확인만으로 끝이다.
  const isPaymentComplete = Boolean(displayPass?.paymentConfirmedAt && (isApplicationConfirmed || !displayPass.applicationId))
  const goBack = () => router.push(returnUrl ? safeReturnUrl(returnUrl) : '/gatherings')
  // purchaseAmount 는 이용권 가격뿐이다. 보증금은 별도 레코드라 입금 대기(PENDING)일 때만 합산한다.
  // 신청의 deposit 정보가 없으면(구형 BE) 보증금 대상 회원이 신청과 함께 산 경우로 보고 기본 보증금을 더한다.
  const deposit = diningApplication?.deposit
  const hasLinkedApplication = Boolean(displayPass?.applicationId ?? applicationId)
  const depositDue = deposit
    ? (deposit.status === 'PENDING' ? deposit.amount : 0)
    : (profile?.depositRequired && hasLinkedApplication ? DEPOSIT_AMOUNT : 0)
  // 이용권은 이미 쓰였고(차감 기록) 보증금만 남은 신청 → 이용권 선택 없이 보증금 입금 화면
  const isDepositFlow = !displayPass && deposit != null && diningApplication?.ticketStatus === 'DEDUCTED'
  const submit = async () => {
    if (useMembership) {
      goBack()
      return
    }
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
        {isPaymentComplete ? '참가 확정 정보를 확인해 주세요.' : displayPass || isDepositFlow ? '입금 정보를 확인해 주세요.' : '원하는 이용권을 선택해 주세요.'}
      </p>
      {displayPass ? (
        isPaymentComplete ? (
          <>
            <Card className="p-5 mb-4 bg-primary-light">
              <p className="text-xs font-bold text-primary mb-2">입금완료</p>
              <p className="font-bold text-lg">{displayPass.productLabel} 결제가 완료됐어요</p>
              {displayPass.applicationId && !displayPass.validUntil && <p className="text-sm text-tag-text mt-2">이번 모임에 이용권 1회가 자동 사용됐어요.</p>}
            </Card>
            <Card className="p-5 mb-5">
              {displayPass.validUntil ? (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-tag-text">{t('validUntil')}</span>
                  <strong className="text-lg text-primary">{formatLocalizedShortDate(displayPass.validUntil, locale)}</strong>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-tag-text">남은 이용권</span>
                  <strong className="text-lg text-primary">{displayPass.remainingCount}회</strong>
                </div>
              )}
              {displayPass.applicationId && (
                <div className="flex items-center justify-between border-t border-tag-bg pt-4 mt-4">
                  <span className="text-sm text-tag-text">신청 상태</span>
                  <strong>참가 확정</strong>
                </div>
              )}
            </Card>
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              onClick={() => {
                if (!displayPass.applicationId) {
                  goBack()
                } else if (data?.gatheringId) {
                  const query = bookingNumber
                    ? `bookingNumber=${encodeURIComponent(bookingNumber)}`
                    : data.applicationId ? `applicationId=${encodeURIComponent(data.applicationId)}` : ''
                  router.push(`/gatherings/${data.gatheringId}/apply/confirmed${query ? `?${query}` : ''}`)
                }
              }}
              disabled={Boolean(displayPass.applicationId) && !data?.gatheringId}
            >
              {displayPass.applicationId ? '예약 확정 페이지로 이동' : t('backToApply')}
            </Button>
          </>
        ) : (
          <>
            <Card className="p-5 mb-4">
              <p className="font-bold text-lg">{displayPass.productLabel} 구매 요청이 접수됐어요</p>
            </Card>
            <PaymentPendingPanel
              gatheringId={gatheringId}
              payerName={profile?.name ?? null}
              deadline={displayPass.paymentDeadline}
              demoTarget={{ applicationId: displayPass.applicationId ?? applicationId, passId: displayPass.id }}
              items={[
                { label: displayPass.productLabel, amount: displayPass.purchaseAmount },
                ...(depositDue > 0 ? [{ label: t('deposit'), amount: depositDue }] : []),
              ]}
            />
          </>
        )
      ) : isDepositFlow ? (
        deposit?.status === 'PENDING' ? (
          <>
            <Card className="p-5 mb-4">
              <p className="font-bold text-lg">{t('depositOnlyTitle')}</p>
              <p className="text-sm text-tag-text mt-2">{t('depositOnlyDescription')}</p>
            </Card>
            <PaymentPendingPanel
              gatheringId={gatheringId}
              payerName={profile?.name ?? null}
              items={[{ label: t('deposit'), amount: deposit.amount }]}
              demoTarget={{ applicationId }}
            />
          </>
        ) : (
          <>
            <Card className="p-5 mb-5 bg-primary-light">
              <p className="text-xs font-bold text-primary mb-2">입금완료</p>
              <p className="font-bold text-lg">{t('depositConfirmed')}</p>
            </Card>
            <Button variant="primary" size="lg" className="w-full" onClick={() => router.push('/mypage?tab=applications')}>
              {t('viewMyApplications')}
            </Button>
          </>
        )
      ) : (
        <>
          {products.length === 0 ? (
            <Card className="p-5 mb-5 text-sm text-tag-text">현재 구매 가능한 이용권 상품이 없어요.</Card>
          ) : (
          <div className="grid grid-cols-2 gap-3 mb-5" role="group" aria-label={t('selectLabel')}>
            {membership?.validUntil && (
              <button
                type="button"
                aria-pressed={useMembership}
                onClick={() => setSelected(MEMBERSHIP_OPTION)}
                className={`relative col-span-2 text-left rounded-card border p-4 ${useMembership ? 'border-primary bg-primary-light' : 'border-tag-bg bg-card'}`}
              >
                {useMembership && <Check size={16} className="absolute right-3 top-3 text-primary" />}
                <p className="font-bold pr-5">{t('useMembership')}</p>
                <p className="mt-1 text-sm text-primary font-semibold">
                  {t('membershipRemaining', { date: formatLocalizedShortDate(membership.validUntil, locale), days: daysUntil(membership.validUntil) })}
                </p>
                <p className="mt-1 text-xs text-tag-text">{depositDue > 0 ? t('membershipDepositOnly', { amount: depositDue.toLocaleString() }) : t('membershipNoPayment')}</p>
              </button>
            )}
            {products.map((item) => {
              const active = selectedProductId === item.id
              const label = item.name.replace(/^우연한 식탁\s*/, '')
              const isPeriod = isMembershipProduct(item) && !!item.periodMonths
              const description = isPeriod
                ? t('periodDescription')
                : item.sessionCount === 1 ? '이번 모임만 가볍게 참여해요' : `${item.sessionCount}번 참여할 계획이라면 편리해요`
              return <button key={item.id} type="button" aria-pressed={active} onClick={() => setSelected(item.id)} className={`relative text-left rounded-card border p-4 ${active ? 'border-primary bg-primary-light' : 'border-tag-bg bg-card'}`}>
                {active && <Check size={16} className="absolute right-3 top-3 text-primary" />}
                <p className="font-bold pr-5">{label}</p>
                <p className="text-lg font-bold text-primary mt-2">{item.price.toLocaleString()}원</p>
                {isPeriod && <p className="text-xs font-semibold text-foreground mt-1">{t('perMonth', { amount: Math.round(item.price / item.periodMonths!).toLocaleString() })}</p>}
                <p className="text-xs text-tag-text mt-2">{description}</p>
              </button>
            })}
          </div>
          )}
          {depositDue > 0 && !useMembership && (
            <p className="mb-4 rounded-input bg-tag-bg px-4 py-3 text-sm text-tag-text">{t('depositNote', { amount: depositDue.toLocaleString() })}</p>
          )}
          <PaymentPolicyNotice />
          {restriction && !useMembership && (
            <Card className="p-4 mb-4 text-sm text-tag-text">{t(`restricted.${restriction}`)}</Card>
          )}
          <Button variant="primary" size="lg" className="w-full" disabled={!useMembership && (!canPurchase || !product)} isLoading={purchase.isPending} onClick={submit}>{useMembership ? t('applyWithMembership') : `${product?.name ?? '이용권'} 구매 요청`}</Button>
        </>
      )}
      {returnUrl && (
        <Button variant="outlined" size="lg" className="w-full mt-3" onClick={() => router.push(safeReturnUrl(returnUrl))}>
          신청 화면으로 돌아가기
        </Button>
      )}
    </div>
  )
}

export default function RandomTablePaymentPage() {
  return <Suspense fallback={<div className="flex justify-center py-24"><LoadingSpinner size="lg" /></div>}><PaymentContent /></Suspense>
}
