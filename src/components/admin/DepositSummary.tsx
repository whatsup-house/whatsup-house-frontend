import type { DepositMatchResult, PaymentTargetType } from '@/lib/api/types'

export const TARGET_LABEL: Record<PaymentTargetType, string> = {
  TICKET_PASS: '이용권',
  DEPOSIT: '보증금',
  REGULAR_APPLICATION: '게더링',
}

// 카드 배지는 운영자가 한눈에 읽게 묶는다. 후보 없음·여러 건의 구분은 펼친 상세에서 보여준다.
const STATUS: Record<DepositMatchResult | 'MANUAL', { label: string; cls: string }> = {
  MATCHED: { label: '자동 완료', cls: 'bg-mileage-earn text-white' },
  MANUAL: { label: '수동 연결', cls: 'bg-tag-bg text-mileage-earn' },
  IGNORED: { label: '무시', cls: 'bg-tag-bg text-tag-text' },
  NO_CANDIDATE: { label: '예외', cls: 'bg-primary text-white' },
  MULTIPLE_CANDIDATES: { label: '예외', cls: 'bg-primary text-white' },
  PARSE_FAILED: { label: '파싱 실패', cls: 'bg-primary-light text-primary' },
}

export const won = (amount: number) => `${amount.toLocaleString()}원`

interface DepositSummaryProps {
  name: string | null
  amount: number | null
  targetType: PaymentTargetType | null
  targetName?: string | null
  result: DepositMatchResult
  isManual?: boolean   // 예외였다가 운영자가 직접 연결한 건
}

// 입금 알림 카드 요약 — 결제 관리 화면과 심사용 운영자 폰 미리보기가 같이 쓴다 (KAN-427·423)
export default function DepositSummary({ name, amount, targetType, targetName, result, isManual = false }: DepositSummaryProps) {
  const status = STATUS[isManual && result === 'MATCHED' ? 'MANUAL' : result]
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <p className={`min-w-0 truncate text-[17px] font-bold ${name ? 'text-foreground' : 'text-tag-text'}`}>{name ?? '이름 없음'}</p>
        <p className="shrink-0 text-[17px] font-bold tabular-nums text-foreground">{amount != null ? won(amount) : '-'}</p>
      </div>
      <div className="flex items-center justify-between gap-3">
        {targetType ? (
          <p className="flex min-w-0 items-center gap-1.5 text-sm text-foreground">
            <span className="shrink-0 rounded-md bg-tag-bg px-1.5 py-0.5 text-xs font-semibold text-tag-text">{TARGET_LABEL[targetType]}</span>
            {targetName && <span className="truncate">{targetName}</span>}
          </p>
        ) : (
          <p className="text-sm text-tag-text">연결된 구매 없음</p>
        )}
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${status.cls}`}>{status.label}</span>
      </div>
    </div>
  )
}
