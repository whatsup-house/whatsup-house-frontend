import apiClient from './client'
import type { ApiResponse, ApplicationListItem, ApplicationStatus, GuestApplicationCheckResponse, ApplicationTokenCheckResponse, DynamicApplicationRequest, ApplicationSubmitResponse, ApplicationDetail } from './types'

// 회원 동적 신청 (EAV 답변 배열) — JWT 필요
export const submitDynamicApplication = async (
  gatheringId: string,
  data: DynamicApplicationRequest,
): Promise<ApplicationSubmitResponse> => {
  const response = await apiClient.post<ApiResponse<ApplicationSubmitResponse>>(
    `/api/gatherings/${gatheringId}/applications`,
    data,
  )
  return response.data.data
}

// 비회원 동적 신청 (EAV 답변 배열)
export const submitDynamicGuestApplication = async (
  gatheringId: string,
  data: DynamicApplicationRequest,
): Promise<ApplicationSubmitResponse> => {
  const response = await apiClient.post<ApiResponse<ApplicationSubmitResponse>>(
    `/api/gatherings/${gatheringId}/applications/guest`,
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
