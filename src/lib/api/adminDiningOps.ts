import apiClient from './client'
import type {
  ApiResponse,
  DiningExceptionCase,
  DiningExceptionStatus,
  DiningExceptionStatusRequest,
  DiningExceptionType,
  DiningMatchingRules,
  DiningTableVenueResponse,
  DiningVenue,
  DiningVenueRequest,
} from './types'

// 우연한 식탁 운영 — 예외함·매칭 규칙·식당 풀 (KAN-353)

// type·status 미지정이면 그 조건은 걸지 않는다. 최신순
export const fetchDiningExceptions = async (
  type?: DiningExceptionType,
  status?: DiningExceptionStatus,
): Promise<DiningExceptionCase[]> => {
  const response = await apiClient.get<ApiResponse<DiningExceptionCase[]>>('/api/admin/dining/exceptions', {
    params: { type, status },
  })
  return response.data.data
}

export const updateDiningExceptionStatus = async (
  id: string,
  data: DiningExceptionStatusRequest,
): Promise<DiningExceptionCase> => {
  const response = await apiClient.patch<ApiResponse<DiningExceptionCase>>(`/api/admin/dining/exceptions/${id}`, data)
  return response.data.data
}

export const fetchDiningMatchingRules = async (): Promise<DiningMatchingRules> => {
  const response = await apiClient.get<ApiResponse<DiningMatchingRules>>('/api/admin/dining/settings/matching-rules')
  return response.data.data
}

export const updateDiningMatchingRules = async (data: DiningMatchingRules): Promise<DiningMatchingRules> => {
  const response = await apiClient.put<ApiResponse<DiningMatchingRules>>('/api/admin/dining/settings/matching-rules', data)
  return response.data.data
}

export const fetchDiningVenues = async (): Promise<DiningVenue[]> => {
  const response = await apiClient.get<ApiResponse<DiningVenue[]>>('/api/admin/dining/venues')
  return response.data.data
}

export const createDiningVenue = async (data: DiningVenueRequest): Promise<DiningVenue> => {
  const response = await apiClient.post<ApiResponse<DiningVenue>>('/api/admin/dining/venues', data)
  return response.data.data
}

export const updateDiningVenue = async (id: string, data: DiningVenueRequest): Promise<DiningVenue> => {
  const response = await apiClient.put<ApiResponse<DiningVenue>>(`/api/admin/dining/venues/${id}`, data)
  return response.data.data
}

// soft delete. 이미 배정된 회차 풀·테이블은 유지된다
export const deleteDiningVenue = async (id: string): Promise<void> => {
  await apiClient.delete<ApiResponse<void>>(`/api/admin/dining/venues/${id}`)
}

// 회차 식당 풀에 있는 활성 식당만. 같은 식당 재배정은 변화 없음(멱등)
export const assignDiningTableVenue = async (tableId: string, venueId: string): Promise<DiningTableVenueResponse> => {
  const response = await apiClient.put<ApiResponse<DiningTableVenueResponse>>(`/api/admin/dining/tables/${tableId}/venue`, {
    venueId,
  })
  return response.data.data
}
