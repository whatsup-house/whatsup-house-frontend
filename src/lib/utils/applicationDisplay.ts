import type { ApplicationStatus, PaymentStatus } from '@/lib/api/types'

export function isDepositPendingApplication(
  status: ApplicationStatus,
  paymentStatus?: PaymentStatus | null,
) {
  return status === 'CONFIRMED' && paymentStatus === 'PENDING'
}

export function getApplicationDisplayStatus(
  status: ApplicationStatus,
  paymentStatus?: PaymentStatus | null,
): ApplicationStatus {
  return isDepositPendingApplication(status, paymentStatus) ? 'PAYMENT_PENDING' : status
}
