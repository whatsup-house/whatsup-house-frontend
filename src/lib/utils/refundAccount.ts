import type { DepositReturnAccount } from '@/lib/api/types'

export const EMPTY_REFUND_ACCOUNT: DepositReturnAccount = { bank: '', accountNumber: '', holder: '' }

export type RefundAccountErrors = Partial<Record<keyof DepositReturnAccount, string>>

const onlyDigits = (value: string) => value.replace(/\D/g, '')

// 비어 있는 칸에 에러 문구를 채운다. 다 채웠으면 빈 객체. (KAN-410)
export function validateRefundAccount(account: DepositReturnAccount, requiredMessage: string): RefundAccountErrors {
  const errors: RefundAccountErrors = {}
  if (!account.bank.trim()) errors.bank = requiredMessage
  if (!onlyDigits(account.accountNumber)) errors.accountNumber = requiredMessage
  if (!account.holder.trim()) errors.holder = requiredMessage
  return errors
}

// 서버로 보낼 값: 공백 제거, 계좌번호는 숫자만
export const normalizeRefundAccount = (account: DepositReturnAccount): DepositReturnAccount => ({
  bank: account.bank.trim(),
  accountNumber: onlyDigits(account.accountNumber),
  holder: account.holder.trim(),
})
