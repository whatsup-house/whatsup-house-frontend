import apiClient from './client'
import type { ApiResponse, MyTickets, TicketPass, TicketPurchaseRequest } from './types'

// 내 이용권/잔여 조회
export const fetchMyTickets = async (): Promise<MyTickets> => {
  const response = await apiClient.get<ApiResponse<MyTickets>>('/api/tickets/me')
  return response.data.data
}

// 이용권 구매(선결제) 요청 — 입금 확인 전까지 PENDING으로 생성된다.
export const purchaseTicketPass = async (data: TicketPurchaseRequest): Promise<TicketPass> => {
  const response = await apiClient.post<ApiResponse<TicketPass>>('/api/tickets/purchase', data)
  return response.data.data
}
