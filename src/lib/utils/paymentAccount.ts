import { PAYMENT_ACCOUNT } from '@/lib/constants/payment'
import type { GatheringDetail } from '@/lib/api/types'

type GatheringAccount = Pick<GatheringDetail, 'accountBank' | 'accountNumber' | 'accountHolder'>

export interface PaymentAccount {
  bank: string
  number: string
  holder: string | null
  text: string        // 표시·복사용 한 줄
  isFallback: boolean // true면 게더링에 계좌가 없어 PAYMENT_ACCOUNT를 쓴 것
}

// 입금 계좌: 게더링 계좌번호가 있으면 그 계좌, 없으면 폴백 계좌. (KAN-391)
export function resolvePaymentAccount(gathering: GatheringAccount | null | undefined, fallbackBankName: string): PaymentAccount {
  const number = gathering?.accountNumber?.trim()
  if (!number) {
    return {
      bank: fallbackBankName,
      number: PAYMENT_ACCOUNT.accountNumber,
      holder: null,
      text: `${fallbackBankName} ${PAYMENT_ACCOUNT.accountNumber}`,
      isFallback: true,
    }
  }
  const bank = gathering?.accountBank?.trim() || fallbackBankName
  const holder = gathering?.accountHolder?.trim() || null
  return { bank, number, holder, text: `${bank} ${number}${holder ? ` (${holder})` : ''}`, isFallback: false }
}
