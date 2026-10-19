import apiClient from './client'
import type {
  ApiResponse,
  DepositMatchResult,
  DepositNotificationLinkRequest,
  DepositNotificationPage,
  PayoutItem,
  PendingPaymentTarget,
  PayoutStatus,
  PayoutType,
} from './types'

// 운영자 입금 알림 로그·송금 목록 (KAN-411)

// result 미지정이면 전체. 최신순
export const fetchDepositNotifications = async (
  result: DepositMatchResult | undefined,
  page: number,
): Promise<DepositNotificationPage> => {
  const response = await apiClient.get<ApiResponse<DepositNotificationPage>>('/api/admin/payments/deposit-notifications', {
    params: { result, page },
  })
  return response.data.data
}

export const linkDepositNotification = async (id: string, data: DepositNotificationLinkRequest): Promise<void> => {
  await apiClient.post<ApiResponse<unknown>>(`/api/admin/payments/deposit-notifications/${id}/link`, data)
}

export const fetchPendingTargets = async (): Promise<PendingPaymentTarget[]> => {
  const response = await apiClient.get<ApiResponse<PendingPaymentTarget[]>>('/api/admin/payments/pending-targets')
  return response.data.data
}

export const fetchPayouts = async (type: PayoutType, status: PayoutStatus): Promise<PayoutItem[]> => {
  const response = await apiClient.get<ApiResponse<PayoutItem[]>>('/api/admin/payments/payouts', {
    params: { type, status },
  })
  return response.data.data
}

export const markPayoutsSent = async (ids: string[]): Promise<void> => {
  await apiClient.post<ApiResponse<unknown>>('/api/admin/payments/payouts/sent', { ids })
}
