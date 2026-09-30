import apiClient from './client'
import type {
  ApiResponse,
  ChatImageUploadResponse,
  ChatInquiryRoomResponse,
  ChatMessage,
  ChatPushPublicKeyResponse,
  ChatPushSubscriptionRequest,
  ChatRoomDetail,
  ChatRoomSummary,
  ChatSendMessageRequest,
} from './types'

export const CHAT_PAGE_SIZE = 50

// 내 방 목록 (마지막 메시지·안읽은 수 포함, 숨긴 문의방 제외)
export const fetchChatRooms = async (): Promise<ChatRoomSummary[]> => {
  const response = await apiClient.get<ApiResponse<ChatRoomSummary[]>>('/api/chat/rooms')
  return response.data.data
}

// 문의방 열기: 없으면 생성, 숨김이면 해제
export const openInquiryRoom = async (): Promise<ChatInquiryRoomResponse> => {
  const response = await apiClient.post<ApiResponse<ChatInquiryRoomResponse>>('/api/chat/rooms/inquiry')
  return response.data.data
}

export const fetchChatRoom = async (roomId: string): Promise<ChatRoomDetail> => {
  const response = await apiClient.get<ApiResponse<ChatRoomDetail>>(`/api/chat/rooms/${roomId}`)
  return response.data.data
}

// before 커서(메시지 id) 이전 size건. 응답은 오래된 → 최신 순.
export const fetchChatMessages = async (roomId: string, before?: string): Promise<ChatMessage[]> => {
  const response = await apiClient.get<ApiResponse<ChatMessage[]>>(`/api/chat/rooms/${roomId}/messages`, {
    params: { before, size: CHAT_PAGE_SIZE },
  })
  return response.data.data
}

export const sendChatMessage = async (roomId: string, data: ChatSendMessageRequest): Promise<ChatMessage> => {
  const response = await apiClient.post<ApiResponse<ChatMessage>>(`/api/chat/rooms/${roomId}/messages`, data)
  return response.data.data
}

export const updateChatMessage = async (messageId: string, content: string): Promise<void> => {
  await apiClient.patch<ApiResponse<void>>(`/api/chat/messages/${messageId}`, { content })
}

export const deleteChatMessage = async (messageId: string): Promise<void> => {
  await apiClient.delete<ApiResponse<void>>(`/api/chat/messages/${messageId}`)
}

export const toggleChatReaction = async (messageId: string, emoji: string): Promise<void> => {
  await apiClient.put<ApiResponse<void>>(`/api/chat/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`)
}

export const reportChatMessage = async (messageId: string, reason: string): Promise<void> => {
  await apiClient.post<ApiResponse<void>>(`/api/chat/messages/${messageId}/report`, { reason })
}

// 조용히 나가기 (단체방만)
export const leaveChatRoom = async (roomId: string): Promise<void> => {
  await apiClient.post<ApiResponse<void>>(`/api/chat/rooms/${roomId}/leave`)
}

// 문의방 목록에서 숨기기
export const hideChatRoom = async (roomId: string): Promise<void> => {
  await apiClient.post<ApiResponse<void>>(`/api/chat/rooms/${roomId}/hide`)
}

export const uploadChatImage = async (blob: Blob): Promise<ChatImageUploadResponse> => {
  const formData = new FormData()
  formData.append('file', blob, blob.type === 'image/webp' ? 'chat.webp' : 'chat.jpg')
  const response = await apiClient.post<ApiResponse<ChatImageUploadResponse>>('/api/chat/upload-image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return response.data.data
}

// 공지 등록/해제 (관리자 API). messageId null = 해제
export const updateChatNotice = async (roomId: string, messageId: string | null): Promise<void> => {
  await apiClient.put<ApiResponse<void>>(`/api/admin/chat/rooms/${roomId}/notice`, { messageId })
}

// 웹 푸시 VAPID 공개키. VAPID 미설정이면 503.
export const fetchPushPublicKey = async (): Promise<string> => {
  const response = await apiClient.get<ApiResponse<ChatPushPublicKeyResponse>>('/api/chat/push-subscriptions/public-key')
  return response.data.data.publicKey
}

// 같은 endpoint 재등록은 서버에서 갱신된다. (201)
export const registerPushSubscription = async (data: ChatPushSubscriptionRequest): Promise<void> => {
  await apiClient.post<ApiResponse<void>>('/api/chat/push-subscriptions', data)
}

// 본인 구독만 지운다. 없어도 204.
export const deletePushSubscription = async (endpoint: string): Promise<void> => {
  await apiClient.delete('/api/chat/push-subscriptions', { data: { endpoint } })
}
