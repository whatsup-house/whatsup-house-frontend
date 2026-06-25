import apiClient from './client'
import type { ApiResponse, GuestOverview } from './types'

export const fetchGuestOverview = async (phone: string, email: string): Promise<GuestOverview> => {
  const response = await apiClient.get<ApiResponse<GuestOverview>>('/api/guest/overview', {
    params: { phone, email },
  })
  return response.data.data
}
