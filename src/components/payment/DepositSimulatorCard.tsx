'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Check, Smartphone, X } from 'lucide-react'
import { Button, Card } from '@/components/ui'
import { useDemoDeposit, useRefreshPaymentStatus } from '@/lib/hooks/usePayment'
import type { DemoDepositResponse, DemoDepositResult } from '@/lib/api/types'

const STEPS = ['received', 'verified', 'linked', 'completed'] as const
const STEP_INTERVAL_MS = 400

interface DepositSimulatorCardProps {
  amount: number                  // 상태 카드가 보여주는 입금 합계. 버튼 문구에 그대로 쓴다
  applicationId?: string | null   // 결제 대기 건을 가리키는 id (신청 또는 이용권 중 아는 쪽)
  passId?: string | null
}

// 대사 결과가 MATCHED 가 아닐 때 빨간 표시가 붙는 단계(1부터). 0 이면 전부 통과.
// 알림은 항상 도착하고, 입금 알림이 아니거나 못 읽으면 ②에서, 후보가 0/2건 이상이면 ③에서 멈춘다.
function failedStep(result: DemoDepositResult): number {
  if (result === 'MATCHED') return 0
  return result === 'IGNORED' || result === 'PARSE_FAILED' ? 2 : 3
}

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

// 심사용 입금 시뮬레이터: 운영자 폰에 은행 알림이 오고 와썹이 자동 대사하는 과정을 보여준다. 데모 회원에게만 노출. (KAN-409)
export default function DepositSimulatorCard({ amount, applicationId, passId }: DepositSimulatorCardProps) {
  const t = useTranslations('payment.simulator')
  const demoDeposit = useDemoDeposit()
  const refreshPaymentStatus = useRefreshPaymentStatus()
  const [response, setResponse] = useState<DemoDepositResponse | null>(null)
  const [resolved, setResolved] = useState(0)  // 결과가 나온(체크 또는 빨간 표시) 단계 수

  const failAt = response ? failedStep(response.result) : 0
  const lastStep = failAt || STEPS.length
  const isRunning = response !== null && resolved < lastStep
  const isFinished = response !== null && !isRunning

  useEffect(() => {
    if (!isRunning) return
    const timer = setTimeout(() => setResolved((count) => count + 1), STEP_INTERVAL_MS)
    return () => clearTimeout(timer)
  }, [isRunning, resolved])

  // 애니메이션이 끝나면 결제 상태 화면이 따라가는 쿼리를 다시 읽어 상태 카드를 갱신한다.
  useEffect(() => {
    if (isFinished) void refreshPaymentStatus()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refreshPaymentStatus 는 매 렌더 새 함수다. 끝난 시점에 한 번만 호출한다
  }, [isFinished])

  const start = () => {
    setResponse(null)
    setResolved(0)
    demoDeposit.mutate(
      { applicationId: applicationId ?? undefined, passId: passId ?? undefined },
      {
        onSuccess: (data) => {
          setResponse(data)
          // 모션 줄이기: 단계별 간격 없이 결과를 한 번에 보여준다
          setResolved(prefersReducedMotion() ? (failedStep(data.result) || STEPS.length) : 0)
        },
      },
    )
  }

  return (
    <Card className="mb-4 p-5">
      <h2 className="font-bold">{t('title')}</h2>
      <p className="mt-1 text-sm text-tag-text">{t('description')}</p>

      <Button
        variant="primary"
        size="default"
        className="mt-4 w-full"
        isLoading={demoDeposit.isPending}
        disabled={isRunning}
        onClick={start}
      >
        {isFinished ? t('retry') : t('button', { amount: amount.toLocaleString() })}
      </Button>

      {demoDeposit.isError && <p role="alert" className="mt-3 text-sm text-primary">{t('error')}</p>}

      {response && (
        <div className="mt-4">
          {/* 운영자 폰 프레임: 결제자 본인의 알림이 아니라 운영자가 받는 알림이라는 점을 라벨로 분명히 한다 */}
          <div className="mx-auto max-w-xs overflow-hidden rounded-card border-4 border-foreground bg-foreground">
            <div className="flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-card">
              <Smartphone size={14} aria-hidden="true" />
              {t('phoneLabel')}
            </div>
            <div className="min-h-24 bg-tag-bg px-3 py-4">
              <div className="animate-push-in rounded-input bg-card p-3 shadow-sm">
                <p className="text-xs font-semibold text-tag-text">{t('pushApp')}</p>
                <p className="mt-1 break-words whitespace-pre-wrap text-sm text-foreground">{response.rawText}</p>
              </div>
            </div>
          </div>
          <p className="mt-2 text-center text-xs text-tag-text">{t('phoneCaption')}</p>

          <ol aria-live="polite" className="mt-4 space-y-2 text-sm">
            {STEPS.map((step, index) => {
              const order = index + 1
              const isFailed = failAt === order && resolved >= order
              const isDone = resolved >= order && !isFailed
              return (
                <li key={step} className={`flex items-center gap-2 ${isFailed ? 'font-semibold text-primary' : isDone ? 'text-foreground' : 'text-tag-text opacity-60'}`}>
                  <span className={`flex size-5 shrink-0 items-center justify-center rounded-full ${isFailed ? 'bg-primary text-white' : isDone ? 'bg-mileage-earn text-white' : 'bg-tag-bg'}`}>
                    {isFailed ? <X size={12} aria-hidden="true" /> : isDone ? <Check size={12} aria-hidden="true" /> : null}
                  </span>
                  <span>{t(`steps.${step}`)}</span>
                  {isFailed && <span className="ml-auto text-xs">{t('exception')}</span>}
                </li>
              )
            })}
          </ol>
        </div>
      )}
    </Card>
  )
}
