import apiClient from './client'
import type { ApiResponse } from './types'

// 관리자 입금 대기 큐 한 행 (PENDING 이용권 + 연결된 PAYMENT_PENDING 신청 맥락)
export interface AdminPendingDeposit {
  ticketPassId: string
  participantId: string
  member: boolean
  applicantName: string
  product: string
  productLabel: string
  amount: number
  requestedAt: string
  paymentDeadline: string | null
  applicationId: string | null
  bookingNumber: string | null
  gatheringId: string | null
  gatheringTitle: string | null
}

// 입금 대기 큐 (요청 오래된 순)
export const fetchPendingDeposits = async (): Promise<AdminPendingDeposit[]> => {
  const res = await apiClient.get<ApiResponse<AdminPendingDeposit[]>>('/api/admin/tickets/deposits/pending')
  return res.data.data ?? []
}

// 입금 대기 건수 (대시보드 뱃지)
export const fetchPendingDepositCount = async (): Promise<number> => {
  const res = await apiClient.get<ApiResponse<number>>('/api/admin/tickets/deposits/count')
  return res.data.data ?? 0
}

// 입금 확인 → 이용권 발급 + 연결된 신청 자동 차감·확정
export const confirmTicketDeposit = async (ticketPassId: string): Promise<void> => {
  await apiClient.patch(`/api/admin/tickets/${ticketPassId}/confirm`)
}
