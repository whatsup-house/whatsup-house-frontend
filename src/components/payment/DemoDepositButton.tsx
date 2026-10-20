'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui'
import AdminDepositPreview, { type AdminPreviewSession } from '@/components/payment/AdminDepositPreview'
import { useMyProfile } from '@/lib/hooks/useAuth'
import { useJobLabel } from '@/lib/hooks/useJobLabel'
import { useDemoDeposit, useRefreshPaymentStatus } from '@/lib/hooks/usePayment'
import type { DemoDepositResponse } from '@/lib/api/types'

interface DemoDepositButtonProps {
  amount: number                  // 결제 대기 화면이 보여주는 입금 합계. 버튼 문구에 그대로 쓴다
  applicationId?: string | null   // 결제 대기 건을 가리키는 id (신청 또는 이용권 중 아는 쪽)
  passId?: string | null
  isSettled?: boolean             // 폴링으로 결제 상태가 이미 완료로 바뀜. 미리보기는 닫을 때까지 두고 새 입금만 막는다
  session: AdminPreviewSession
  appliedAt?: string | null
}

// 심사용 모의 입금 버튼. 누르면 운영자 폰의 참가자 관리 화면 미리보기에서 입금 알림과 자동 확인을 보여준다. 데모 회원 전용. (KAN-409·417)
export default function DemoDepositButton({ amount, applicationId, passId, isSettled = false, session, appliedAt }: DemoDepositButtonProps) {
  const t = useTranslations('payment.simulator')
  const tPending = useTranslations('payment.pending')
  const { data: profile } = useMyProfile()
  const jobLabel = useJobLabel()
  const demoDeposit = useDemoDeposit()
  const refreshPaymentStatus = useRefreshPaymentStatus()
  const [run, setRun] = useState<{ id: number; at: string; response: DemoDepositResponse } | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  // 모의 입금을 하지 않았는데 이미 완료로 바뀐 경우엔 보여줄 게 없다
  if (isSettled && !run) return null

  const start = () => {
    demoDeposit.mutate(
      { applicationId: applicationId ?? undefined, passId: passId ?? undefined },
      {
        onSuccess: (response) => {
          setRun((prev) => ({ id: (prev?.id ?? 0) + 1, at: new Date().toISOString(), response }))
          setIsOpen(true)
        },
      },
    )
  }

  // 미리보기 카드엔 본인 프로필만 쓴다
  const gender = profile?.gender === 'MALE' ? '남' : profile?.gender === 'FEMALE' ? '여' : null
  const info = [gender, profile?.age != null ? `${profile.age}세` : null, profile?.mbti ?? null, jobLabel(profile?.job)]
    .filter((value): value is string => Boolean(value))

  return (
    <div className="mt-4">
      {!isSettled && (
        <>
          <Button variant="primary" size="lg" className="w-full" isLoading={demoDeposit.isPending} onClick={start}>
            {run ? t('retry') : t('button', { amount: tPending('won', { amount: amount.toLocaleString() }) })}
          </Button>
          <p className="mt-2 text-center text-xs text-tag-text break-keep">{t('hint')}</p>
        </>
      )}
      {demoDeposit.isError && <p role="alert" className="mt-3 text-center text-sm text-primary">{t('error')}</p>}
      {run && !isOpen && (
        <button type="button" onClick={() => setIsOpen(true)} className="mt-2 w-full min-h-10 text-sm font-semibold text-primary underline underline-offset-2">
          {t('open')}
        </button>
      )}
      {run && isOpen && (
        <AdminDepositPreview
          key={run.id}
          response={run.response}
          applicant={{ name: profile?.name ?? profile?.nickname ?? '나', info, appliedAt: appliedAt ?? run.at }}
          session={session}
          onSettled={refreshPaymentStatus}
          onClose={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}
