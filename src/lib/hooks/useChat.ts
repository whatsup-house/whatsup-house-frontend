import { useState } from 'react'
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { InfiniteData, QueryClient } from '@tanstack/react-query'
import {
  CHAT_PAGE_SIZE,
  deleteChatMessage,
  fetchChatMessages,
  fetchChatRoom,
  fetchChatRooms,
  hideChatRoom,
  leaveChatRoom,
  openInquiryRoom,
  reportChatMessage,
  sendChatMessage,
  toggleChatReaction,
  updateChatMessage,
  updateChatNotice,
  uploadChatImage,
} from '@/lib/api/chat'
import type { ChatMessage, ChatOutgoingMessage, ChatReaction, ChatRoomSummary } from '@/lib/api/types'
import { useAuthStore } from '@/lib/store/authStore'
import { getApiErrorStatus } from '@/lib/utils/apiError'

export const roomsKey = ['chat', 'rooms'] as const
export const roomKey = (roomId: string) => ['chat', 'room', roomId] as const
export const messagesKey = (roomId: string) => ['chat', 'messages', roomId] as const

// pages[0] = 최신 페이지, pages[n] = 더 오래된 페이지. 각 페이지 안은 오래된 → 최신 순.
type MessagePages = InfiniteData<ChatMessage[], string | undefined>

function patchMessage(
  queryClient: QueryClient,
  roomId: string,
  messageId: string,
  patch: (message: ChatMessage) => ChatMessage,
) {
  queryClient.setQueryData<MessagePages>(messagesKey(roomId), (data) =>
    data && { ...data, pages: data.pages.map((page) => page.map((m) => (m.id === messageId ? patch(m) : m))) },
  )
}

function appendMessage(queryClient: QueryClient, roomId: string, message: ChatMessage) {
  queryClient.setQueryData<MessagePages>(messagesKey(roomId), (data) => {
    if (!data || data.pages.some((page) => page.some((m) => m.id === message.id))) return data
    const [newest = [], ...older] = data.pages
    return { ...data, pages: [[...newest, message], ...older] }
  })
}

// 토글은 두 번 적용하면 원래대로 돌아온다 → 실패 시 같은 함수로 롤백한다.
function toggleReaction(reactions: ChatReaction[], emoji: string): ChatReaction[] {
  const target = reactions.find((r) => r.emoji === emoji)
  if (!target) return [...reactions, { emoji, count: 1, reactedByMe: true }]
  const count = target.count + (target.reactedByMe ? -1 : 1)
  if (count <= 0) return reactions.filter((r) => r.emoji !== emoji)
  return reactions.map((r) => (r.emoji === emoji ? { emoji, count, reactedByMe: !r.reactedByMe } : r))
}

function removeRoomFromList(queryClient: QueryClient, roomId: string) {
  queryClient.setQueryData<ChatRoomSummary[]>(roomsKey, (rooms) => rooms?.filter((room) => room.id !== roomId))
  queryClient.invalidateQueries({ queryKey: roomsKey })
}

export function useChatRooms() {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn)
  return useQuery({
    queryKey: roomsKey,
    queryFn: fetchChatRooms,
    enabled: isLoggedIn,
    retry: false,
    // 바텀 내비 안읽은 배지용 폴링. 소켓 연동 일감이 같은 캐시를 즉시 갱신한다.
    refetchInterval: 30_000,
  })
}

export function useChatRoom(roomId: string) {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn)
  return useQuery({
    queryKey: roomKey(roomId),
    queryFn: () => fetchChatRoom(roomId),
    enabled: isLoggedIn && !!roomId,
    retry: false,
  })
}

export function useChatMessages(roomId: string) {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn)
  return useInfiniteQuery({
    queryKey: messagesKey(roomId),
    queryFn: ({ pageParam }) => fetchChatMessages(roomId, pageParam),
    initialPageParam: undefined as string | undefined,
    // 마지막으로 받은(가장 오래된) 페이지가 꽉 찼으면 그 첫 메시지 id 가 다음 before 커서
    getNextPageParam: (oldestPage) => (oldestPage.length < CHAT_PAGE_SIZE ? undefined : oldestPage[0]?.id),
    enabled: isLoggedIn && !!roomId,
    retry: false,
  })
}

// 낙관적 전송: 대기열(outbox)에 임시 항목을 넣어 즉시 보여주고, 성공하면 서버 메시지를 캐시에 붙이고 대기열에서 뺀다.
// 실패 항목은 failed 로 남아 재전송/삭제를 기다린다. scope 로 방마다 직렬 전송해 순서를 보장한다.
export function useSendMessage(roomId: string) {
  const queryClient = useQueryClient()
  const [outbox, setOutbox] = useState<ChatOutgoingMessage[]>([])

  const mutation = useMutation({
    scope: { id: `chat-send-${roomId}` },
    mutationFn: async (item: ChatOutgoingMessage) => {
      const content = item.image ? (await uploadChatImage(item.image)).path : item.content
      return sendChatMessage(roomId, { type: item.type, content })
    },
    onSuccess: (message, item) => {
      appendMessage(queryClient, roomId, message)
      setOutbox((prev) => prev.filter((o) => o.tempId !== item.tempId))
      if (item.image) URL.revokeObjectURL(item.content)
      queryClient.invalidateQueries({ queryKey: roomsKey })
    },
    onError: (error, item) => {
      setOutbox((prev) => prev.map((o) => (o.tempId === item.tempId ? { ...o, failed: true } : o)))
      // 403(CHAT_MUTED·CHAT_NOT_MEMBER): 방 상세를 다시 받아 입력창 비활성 / 목록 이동으로 이어지게 한다.
      if (getApiErrorStatus(error) === 403) queryClient.invalidateQueries({ queryKey: roomKey(roomId) })
    },
  })

  const enqueue = (type: ChatOutgoingMessage['type'], content: string, image: Blob | null) => {
    const item: ChatOutgoingMessage = {
      tempId: `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      type,
      content,
      image,
      createdAt: new Date().toISOString(),
      failed: false,
    }
    setOutbox((prev) => [...prev, item])
    mutation.mutate(item)
  }

  const retry = (tempId: string) => {
    const item = outbox.find((o) => o.tempId === tempId)
    if (!item) return
    const next = { ...item, failed: false }
    setOutbox((prev) => prev.map((o) => (o.tempId === tempId ? next : o)))
    mutation.mutate(next)
  }

  const discard = (tempId: string) => {
    const item = outbox.find((o) => o.tempId === tempId)
    if (item?.image) URL.revokeObjectURL(item.content)
    setOutbox((prev) => prev.filter((o) => o.tempId !== tempId))
  }

  return {
    outbox,
    sendText: (text: string) => enqueue('TEXT', text, null),
    sendImage: (image: Blob) => enqueue('IMAGE', URL.createObjectURL(image), image),
    retry,
    discard,
  }
}

export function useEditMessage(roomId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ messageId, content }: { messageId: string; content: string }) =>
      updateChatMessage(messageId, content),
    onSuccess: (_data, { messageId, content }) => {
      patchMessage(queryClient, roomId, messageId, (m) => ({ ...m, content, editedAt: new Date().toISOString() }))
      queryClient.invalidateQueries({ queryKey: roomKey(roomId) })
    },
  })
}

export function useDeleteMessage(roomId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (messageId: string) => deleteChatMessage(messageId),
    onSuccess: (_data, messageId) => {
      patchMessage(queryClient, roomId, messageId, (m) => ({
        ...m,
        content: null,
        linkPreview: null,
        reactions: [],
        deletedAt: new Date().toISOString(),
      }))
      queryClient.invalidateQueries({ queryKey: roomKey(roomId) })
      queryClient.invalidateQueries({ queryKey: roomsKey })
    },
  })
}

export function useToggleReaction(roomId: string) {
  const queryClient = useQueryClient()
  const apply = ({ messageId, emoji }: { messageId: string; emoji: string }) =>
    patchMessage(queryClient, roomId, messageId, (m) => ({ ...m, reactions: toggleReaction(m.reactions, emoji) }))
  return useMutation({
    mutationFn: ({ messageId, emoji }: { messageId: string; emoji: string }) => toggleChatReaction(messageId, emoji),
    onMutate: apply,
    onError: (_error, variables) => apply(variables),
  })
}

export function useReportMessage() {
  return useMutation({
    mutationFn: ({ messageId, reason }: { messageId: string; reason: string }) =>
      reportChatMessage(messageId, reason),
  })
}

export function useLeaveRoom() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (roomId: string) => leaveChatRoom(roomId),
    onSuccess: (_data, roomId) => removeRoomFromList(queryClient, roomId),
  })
}

export function useHideRoom() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (roomId: string) => hideChatRoom(roomId),
    onSuccess: (_data, roomId) => removeRoomFromList(queryClient, roomId),
  })
}

export function useOpenInquiry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: openInquiryRoom,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: roomsKey }),
  })
}

// 관리자 전용: 공지 등록(messageId) / 해제(null). 등록 시 NOTICE_SET 시스템 메시지가 생기므로 메시지도 다시 받는다.
export function useSetChatNotice(roomId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (messageId: string | null) => updateChatNotice(roomId, messageId),
    onSuccess: (_data, messageId) => {
      queryClient.invalidateQueries({ queryKey: roomKey(roomId) })
      if (messageId) queryClient.invalidateQueries({ queryKey: messagesKey(roomId) })
    },
  })
}

// 읽음 처리 자리. 읽음은 STOMP SEND(/app/rooms/{id}/read)로만 하므로 REST 가 없다 — 소켓 연동 일감이 채운다.
const markReadNoop = () => {}
export function useMarkRead(): (roomId: string, messageId: string) => void {
  return markReadNoop
}
