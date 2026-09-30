import apiClient from './client'
import type { ApiResponse, ApplicationListItem, ApplicationStatus, GuestApplicationCheckResponse, ApplicationTokenCheckResponse, DynamicApplicationRequest, ApplicationCreateRequest, ApplicationSubmitResponse, ApplicationDetail, DiningApplicationItem, DiningApplicationListResponse, DiningPrefillResponse, DiningResolution, DiningResolutionChooseRequest } from './types'

// 회원 동적 신청 — 종류 ID + 희망 회차 ID (KAN-338). JWT 필요
export const submitDynamicApplication = async (
  data: ApplicationCreateRequest,
): Promise<ApplicationSubmitResponse> => {
  const response = await apiClient.post<ApiResponse<ApplicationSubmitResponse>>('/api/applications', data)
  return response.data.data
}

// 비회원 동적 신청 (EAV 답변 배열) — 경로 ID는 회차 ID (BE 비회원 신청은 일반 모임 회차만)
export const submitDynamicGuestApplication = async (
  sessionId: string,
  data: DynamicApplicationRequest,
): Promise<ApplicationSubmitResponse> => {
  const response = await apiClient.post<ApiResponse<ApplicationSubmitResponse>>(
    `/api/gatherings/${sessionId}/applications/guest`,
    data,
  )
  return response.data.data
}

// 내 신청 상세 (답변 포함) — 회원
export const fetchMyApplicationDetail = async (id: string): Promise<ApplicationDetail> => {
  const response = await apiClient.get<ApiResponse<ApplicationDetail>>(`/api/applications/${id}`)
  return response.data.data
}

// 비회원 신청 상세 (답변 포함) — 전화번호 + 예약번호
export const fetchGuestApplicationDetail = async (
  phone: string,
  bookingNumber: string,
): Promise<ApplicationDetail> => {
  const response = await apiClient.get<ApiResponse<ApplicationDetail>>(
    '/api/applications/check',
    { params: { phone, bookingNumber } },
  )
  return response.data.data
}

export const fetchMyApplications = async (): Promise<ApplicationListItem[]> => {
  const response = await apiClient.get<ApiResponse<ApplicationListItem[]>>('/api/applications')
  return response.data.data
}

export const fetchApplicationsMe = async (status?: ApplicationStatus): Promise<ApplicationListItem[]> => {
  const response = await apiClient.get<ApiResponse<ApplicationListItem[]>>('/api/applications')
  const applications = response.data.data ?? []
  return status ? applications.filter((application) => application.status === status) : applications
}

// 우연한 식탁 신청 폼 프리필 — 표준 질문별 내 최근 답변 (KAN-342)
export const fetchDiningPrefill = async (gatheringId: string): Promise<DiningPrefillResponse> => {
  const response = await apiClient.get<ApiResponse<DiningPrefillResponse>>('/api/dining/prefill', {
    params: { gatheringId },
  })
  return response.data.data
}

// 내 우연한 식탁 신청 목록 + 매칭 상태 (KAN-342)
export const fetchMyDiningApplications = async (): Promise<DiningApplicationItem[]> => {
  const response = await apiClient.get<ApiResponse<DiningApplicationListResponse>>('/api/dining/me/applications')
  return response.data.data?.applications ?? []
}

// 우연한 식탁 사전 취소 — 회차 시작 2일 전까지 (KAN-342)
export const cancelDiningApplication = async (id: string): Promise<void> => {
  await apiClient.post(`/api/dining/applications/${id}/cancel`)
}

// 매칭 실패 해결 선택지 (KAN-347)
export const fetchDiningResolution = async (id: string): Promise<DiningResolution> => {
  const response = await apiClient.get<ApiResponse<DiningResolution>>(`/api/dining/resolutions/${id}`)
  return response.data.data
}

export const chooseDiningResolution = async (id: string, data: DiningResolutionChooseRequest): Promise<void> => {
  await apiClient.post(`/api/dining/resolutions/${id}/choose`, data)
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

// 비회원 신청 목록 조회 — 이메일 인증 후 전화+이메일로 본인 신청 전체를 조회한다. (KAN-292)
export const fetchGuestApplications = async (
  phone: string,
  email: string,
): Promise<ApplicationListItem[]> => {
  const response = await apiClient.get<ApiResponse<ApplicationListItem[]>>(
    '/api/applications/guest/list',
    { params: { phone, email } },
  )
  return response.data.data ?? []
}

export const fetchApplicationByToken = async (token: string): Promise<ApplicationTokenCheckResponse> => {
  const response = await apiClient.get<ApiResponse<ApplicationTokenCheckResponse>>(
    '/api/applications/check',
    { params: { token } },
  )
  return response.data.data
}
