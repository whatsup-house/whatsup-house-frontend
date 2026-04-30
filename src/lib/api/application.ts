import apiClient from './client'
import type { ApiResponse, ApplicationListItem, GuestApplicationCheckResponse } from './types'

export const fetchMyApplications = async (): Promise<ApplicationListItem[]> => {
  const response = await apiClient.get<ApiResponse<ApplicationListItem[]>>('/api/applications')
  return response.data.data
}

export const cancelApplication = async (id: string): Promise<void> => {
  await apiClient.delete(`/api/applications/${id}`)
}

export const checkGuestApplication = async (
  bookingNumber: string,
  phone: string,
): Promise<GuestApplicationCheckResponse> => {
  const response = await apiClient.get<ApiResponse<GuestApplicationCheckResponse>>(
    '/api/applications/check',
    { params: { bookingNumber, phone } },
  )
  return response.data.data
}
