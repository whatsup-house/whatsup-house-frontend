import apiClient from '@/lib/api/client'
import type { ApiResponse, MileageBalanceResponse, MileageHistoryPageResponse } from '@/lib/api/types'

export const fetchMyMileageBalance = async (): Promise<MileageBalanceResponse> => {
  const response = await apiClient.get<ApiResponse<MileageBalanceResponse>>('/api/mileage/me')
  return response.data.data
}

export const fetchMyMileageHistory = async (
  page: number,
  size: number,
): Promise<MileageHistoryPageResponse> => {
  const response = await apiClient.get<ApiResponse<MileageHistoryPageResponse>>(
    '/api/mileage/me/history',
    { params: { page, size } },
  )
  return response.data.data
}
