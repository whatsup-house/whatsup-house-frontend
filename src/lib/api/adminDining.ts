import apiClient from './client'
import type {
  ApiResponse,
  ChatRoomIdResponse,
  DiningApplicant,
  DiningAttendanceRow,
  DiningAttendanceStatus,
  DiningDashboard,
  DiningFeedbackSummary,
  DiningMatchRun,
  DiningTableAdjustRequest,
  DiningTableAdjustResponse,
  DiningTableConfirmResult,
  DiningTableList,
  SessionVenue,
  SessionVenueRequest,
} from './types'

// 우연한 식탁 운영 대시보드 — 타일 수치 + 다가오는 회차 카드 (KAN-348)
export const fetchDiningDashboard = async (): Promise<DiningDashboard> => {
  const response = await apiClient.get<ApiResponse<DiningDashboard>>('/api/admin/dining/dashboard')
  return response.data.data
}

// 회차 식당 풀을 목록으로 통째로 교체. 배정된 테이블보다 줄이면 409, 비활성 식당을 새로 넣으면 400
export const updateSessionVenues = async (sessionId: string, venues: SessionVenueRequest[]): Promise<SessionVenue[]> => {
  const response = await apiClient.put<ApiResponse<SessionVenue[]>>(`/api/admin/dining/sessions/${sessionId}/venues`, venues)
  return response.data.data
}

// ===== 회차 콘솔 (KAN-352) =====

export const fetchDiningApplicants = async (sessionId: string): Promise<DiningApplicant[]> => {
  const response = await apiClient.get<ApiResponse<DiningApplicant[]>>(`/api/admin/dining/sessions/${sessionId}/applicants`)
  return response.data.data ?? []
}

// CSV(UTF-8 BOM) 원본. ApiResponse로 감싸지 않은 byte[] 응답이다
export const fetchDiningApplicantsCsv = async (sessionId: string): Promise<Blob> => {
  const response = await apiClient.get<Blob>(`/api/admin/dining/sessions/${sessionId}/applicants`, {
    params: { format: 'csv' },
    responseType: 'blob',
  })
  return response.data
}

export const fetchDiningTablesCsv = async (sessionId: string): Promise<Blob> => {
  const response = await apiClient.get<Blob>(`/api/admin/dining/sessions/${sessionId}/tables.csv`, { responseType: 'blob' })
  return response.data
}

// 재실행이면 잠기지 않은 제안 테이블만 해체하고 다시 짠다. 취소·종료 회차는 409
export const runDiningMatch = async (sessionId: string): Promise<DiningMatchRun> => {
  const response = await apiClient.post<ApiResponse<DiningMatchRun>>(`/api/admin/dining/sessions/${sessionId}/match-runs`)
  return response.data.data
}

export const fetchDiningTables = async (sessionId: string): Promise<DiningTableList> => {
  const response = await apiClient.get<ApiResponse<DiningTableList>>(`/api/admin/dining/sessions/${sessionId}/tables`)
  return response.data.data
}

// 제안 상태가 아니면 409
export const confirmDiningTableNow = async (tableId: string): Promise<DiningTableConfirmResult> => {
  const response = await apiClient.post<ApiResponse<DiningTableConfirmResult>>(`/api/admin/dining/tables/${tableId}/confirm-now`)
  return response.data.data
}

// 확정 테이블이 아니면 409
export const retryDiningChatRoom = async (tableId: string): Promise<ChatRoomIdResponse> => {
  const response = await apiClient.post<ApiResponse<ChatRoomIdResponse>>(`/api/admin/dining/tables/${tableId}/chat-room/retry`)
  return response.data.data
}

export const retryDiningNotifications = async (tableId: string): Promise<void> => {
  await apiClient.post<ApiResponse<void>>(`/api/admin/dining/tables/${tableId}/notifications/retry`)
}

// 테이블 조정 (KAN-347). 확정 테이블이 끼면 reason 필수
type AdjustOf<T extends DiningTableAdjustRequest['type']> = Extract<DiningTableAdjustRequest, { type: T }>

const postAdjust = async (url: string, body: object): Promise<DiningTableAdjustResponse> => {
  const response = await apiClient.post<ApiResponse<DiningTableAdjustResponse>>(url, body)
  return response.data.data
}

export const moveDiningTableMember = ({ tableId, memberId, targetTableId, reason }: AdjustOf<'move'>) =>
  postAdjust(`/api/admin/dining/tables/${tableId}/members/${memberId}/move`, { targetTableId, reason })

export const splitDiningTable = ({ tableId, memberIds, reason }: AdjustOf<'split'>) =>
  postAdjust(`/api/admin/dining/tables/${tableId}/split`, { memberIds, reason })

export const mergeDiningTables = ({ tableIds, reason }: AdjustOf<'merge'>) =>
  postAdjust('/api/admin/dining/tables/merge', { tableIds, reason })

export const dissolveDiningTable = ({ tableId, reason }: AdjustOf<'dissolve'>) =>
  postAdjust(`/api/admin/dining/tables/${tableId}/dissolve`, { reason })

// KAN-349 계약. 아직 404일 수 있다
export const fetchDiningAttendance = async (sessionId: string): Promise<DiningAttendanceRow[]> => {
  const response = await apiClient.get<ApiResponse<DiningAttendanceRow[]>>(`/api/admin/dining/sessions/${sessionId}/attendance`)
  return response.data.data ?? []
}

export const updateDiningAttendance = async (attendanceId: string, status: DiningAttendanceStatus): Promise<void> => {
  await apiClient.patch<ApiResponse<unknown>>(`/api/admin/dining/attendances/${attendanceId}`, { status })
}

export const fetchDiningFeedbackSummary = async (sessionId: string): Promise<DiningFeedbackSummary> => {
  const response = await apiClient.get<ApiResponse<DiningFeedbackSummary>>(`/api/admin/dining/sessions/${sessionId}/feedback-summary`)
  return response.data.data
}
