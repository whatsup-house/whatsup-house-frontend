import apiClient from './client'
import type { ApiResponse, GuestTicketPurchaseRequest, MyTickets, TicketPass, TicketProductItem, TicketPurchaseRequest } from './types'

export const fetchTicketProducts = async (): Promise<TicketProductItem[]> => {
  const response = await apiClient.get<ApiResponse<TicketProductItem[]>>('/api/tickets/products')
  return response.data.data ?? []
}

// 내 이용권/잔여 조회
export const fetchMyTickets = async (applicationId?: string | null): Promise<MyTickets> => {
  const response = await apiClient.get<ApiResponse<MyTickets>>('/api/tickets/me', {
    params: applicationId ? { applicationId } : undefined,
  })
  return response.data.data
}

// 이용권 구매(선결제) 요청 — 입금 확인 전까지 PENDING으로 생성된다.
export const purchaseTicketPass = async (data: TicketPurchaseRequest): Promise<TicketPass> => {
  const response = await apiClient.post<ApiResponse<TicketPass>>('/api/tickets/purchase', data)
  return response.data.data
}

export const fetchGuestTickets = async (bookingNumber: string): Promise<MyTickets> => {
  const response = await apiClient.get<ApiResponse<MyTickets>>('/api/tickets/guest', {
    params: { bookingNumber },
  })
  return response.data.data
}

export const purchaseGuestTicketPass = async (data: GuestTicketPurchaseRequest): Promise<TicketPass> => {
  const response = await apiClient.post<ApiResponse<TicketPass>>('/api/tickets/guest/purchase', data)
  return response.data.data
}
