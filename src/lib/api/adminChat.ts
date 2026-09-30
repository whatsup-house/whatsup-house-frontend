import apiClient from './client'
import type {
  AdminChatReport,
  AdminChatRoomCreateRequest,
  AdminChatRoomSummary,
  ApiResponse,
  ChatReportStatus,
  ChatRoomIdResponse,
  ChatSourceMember,
  ChatSourceType,
} from './types'

// 전체 방 목록. 조회한 관리자는 미가입 문의방에 자동 등록된다.
export const fetchAdminChatRooms = async (): Promise<AdminChatRoomSummary[]> => {
  const response = await apiClient.get<ApiResponse<AdminChatRoomSummary[]>>('/api/admin/chat/rooms')
  return response.data.data
}

export const createAdminChatRoom = async (data: AdminChatRoomCreateRequest): Promise<ChatRoomIdResponse> => {
  const response = await apiClient.post<ApiResponse<ChatRoomIdResponse>>('/api/admin/chat/rooms', data)
  return response.data.data
}

// type=GATHERING 이면 게더링 ID, DINING_TABLE 이면 매칭 그룹 ID
export const fetchChatSourceMembers = async (type: ChatSourceType, id: string): Promise<ChatSourceMember[]> => {
  const response = await apiClient.get<ApiResponse<ChatSourceMember[]>>('/api/admin/chat/rooms/source-members', {
    params: { type, id },
  })
  return response.data.data
}

export const addChatMembers = async (roomId: string, userIds: string[]): Promise<void> => {
  await apiClient.post<ApiResponse<void>>(`/api/admin/chat/rooms/${roomId}/members`, { userIds })
}

export const kickChatMember = async (roomId: string, userId: string): Promise<void> => {
  await apiClient.delete<ApiResponse<void>>(`/api/admin/chat/rooms/${roomId}/members/${userId}`)
}

export const deleteAdminChatRoom = async (roomId: string): Promise<void> => {
  await apiClient.delete<ApiResponse<void>>(`/api/admin/chat/rooms/${roomId}`)
}

// 이미 뮤트면 사유를 갱신한다
export const muteChatUser = async (userId: string, reason: string): Promise<void> => {
  await apiClient.put<ApiResponse<void>>(`/api/admin/chat/mutes/${userId}`, { reason })
}

export const unmuteChatUser = async (userId: string): Promise<void> => {
  await apiClient.delete<ApiResponse<void>>(`/api/admin/chat/mutes/${userId}`)
}

// status 미지정이면 전체, 최신순
export const fetchChatReports = async (status?: ChatReportStatus): Promise<AdminChatReport[]> => {
  const response = await apiClient.get<ApiResponse<AdminChatReport[]>>('/api/admin/chat/reports', {
    params: { status },
  })
  return response.data.data
}

export const updateChatReportStatus = async (reportId: string, status: ChatReportStatus): Promise<void> => {
  await apiClient.patch<ApiResponse<void>>(`/api/admin/chat/reports/${reportId}`, { status })
}
