'use client'

import { useCallback, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui'
import AdminDepositPreview from '@/components/payment/AdminDepositPreview'
import { useMyProfile } from '@/lib/hooks/useAuth'
import { useDemoDeposit, useRefreshPaymentStatus } from '@/lib/hooks/usePayment'
import type { DemoDepositResponse } from '@/lib/api/types'

interface DemoDepositButtonProps {
  amount: number                  // 결제 대기 화면이 보여주는 입금 합계. 버튼 문구에 그대로 쓴다
  applicationId?: string | null   // 결제 대기 건을 가리키는 id (신청 또는 이용권 중 아는 쪽)
  passId?: string | null
  isSettled?: boolean             // 폴링으로 결제 상태가 이미 완료로 바뀜. 미리보기는 닫을 때까지 두고 새 입금만 막는다
  targetName: string | null       // 이용권이면 상품명, 보증금이면 게더링 제목 (운영자 화면 카드의 구매 대상)
  onHoldChange: (isHolding: boolean) => void  // true 동안 사용자 화면은 입금 전 모습을 유지한다 (시연 연출)
}

// 운영자 화면에서 입금 확인이 뜬 뒤 사용자 화면이 완료로 바뀌기까지의 간격. 둘을 따로 보이게 하는 시연 연출
const USER_SETTLE_DELAY_MS = 1000

// 심사용 모의 입금 버튼. 누르면 운영자 폰의 결제 관리 화면 미리보기에서 입금 알림과 자동 확인을 보여준다. 데모 회원 전용. (KAN-409·417)
export default function DemoDepositButton({ amount, applicationId, passId, isSettled = false, targetName, onHoldChange }: DemoDepositButtonProps) {
  const t = useTranslations('payment.simulator')
  const tPending = useTranslations('payment.pending')
  const { data: profile } = useMyProfile()
  const demoDeposit = useDemoDeposit()
  const refreshPaymentStatus = useRefreshPaymentStatus()
  const [run, setRun] = useState<{ id: number; response: DemoDepositResponse } | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  // 재생마다 올린다. 닫았다 다시 연 뒤 이전 재생의 지연 해제가 새 재생을 풀지 않게 한다
  const playId = useRef(0)

  const play = () => {
    playId.current += 1
    onHoldChange(true)
  }

  const handleSettled = useCallback(() => {
    const id = playId.current
    const delay = new Promise((resolve) => setTimeout(resolve, USER_SETTLE_DELAY_MS))
    Promise.all([refreshPaymentStatus(), delay]).then(() => {
      if (playId.current === id) onHoldChange(false)
    })
  }, [refreshPaymentStatus, onHoldChange])

  const close = () => {
    playId.current += 1
    setIsOpen(false)
    onHoldChange(false)
  }

  // 모의 입금을 하지 않았는데 이미 완료로 바뀐 경우엔 보여줄 게 없다
  if (isSettled && !run) return null

  const start = () => {
    play()
    demoDeposit.mutate(
      { applicationId: applicationId ?? undefined, passId: passId ?? undefined },
      {
        onSuccess: (response) => {
          setRun((prev) => ({ id: (prev?.id ?? 0) + 1, response }))
          setIsOpen(true)
        },
        onError: () => onHoldChange(false),
      },
    )
  }

  return (
    <div className="mt-4">
      {!isSettled && !isOpen && (
        <>
          <Button variant="primary" size="lg" className="w-full" isLoading={demoDeposit.isPending} onClick={start}>
            {run ? t('retry') : t('button', { amount: tPending('won', { amount: amount.toLocaleString() }) })}
          </Button>
          <p className="mt-2 text-center text-xs text-tag-text break-keep">{t('hint')}</p>
        </>
      )}
      {demoDeposit.isError && <p role="alert" className="mt-3 text-center text-sm text-primary">{t('error')}</p>}
      {run && !isOpen && (
        <button type="button" onClick={() => { play(); setIsOpen(true) }} className="mt-2 w-full min-h-10 text-sm font-semibold text-primary underline underline-offset-2">
          {t('open')}
        </button>
      )}
      {run && isOpen && (
        <AdminDepositPreview
          key={run.id}
          response={run.response}
          payerName={profile?.name ?? profile?.nickname ?? '나'}
          amount={amount}
          targetType={passId ? 'TICKET_PASS' : 'DEPOSIT'}
          targetName={targetName}
          onSettled={handleSettled}
          onClose={close}
        />
      )}
    </div>
  )
}
