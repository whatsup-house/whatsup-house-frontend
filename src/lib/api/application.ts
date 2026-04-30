import apiClient from './client'
import type { ApiResponse, ApplicationListItem } from './types'

export const fetchMyApplications = async (): Promise<ApplicationListItem[]> => {
  const response = await apiClient.get<ApiResponse<ApplicationListItem[]>>('/api/applications')
  return response.data.data
}

export const cancelApplication = async (id: string): Promise<void> => {
  await apiClient.delete(`/api/applications/${id}`)
}
