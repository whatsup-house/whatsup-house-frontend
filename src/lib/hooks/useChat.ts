import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { InfiniteData, QueryClient } from '@tanstack/react-query'
import {
  CHAT_PAGE_SIZE,
  deleteChatMessage,
  fetchChatMessages,
  fetchChatMessagesAfter,
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
import type {
  ChatMessage,
  ChatOutgoingMessage,
  ChatReaction,
  ChatRoomDetail,
  ChatRoomPreviewEvent,
  ChatRoomSummary,
  ChatSocketEvent,
} from '@/lib/api/types'
import { connectChatSocket, disconnectChatSocket, flushChatRead, markChatRead, setChatSocketRoom } from '@/lib/chat/socket'
import { useAuthStore } from '@/lib/store/authStore'
import { useToastStore } from '@/lib/store/toastStore'
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
  if (!target) return [...reactions, { emoji, count: 1, mine: true }]
  const count = target.count + (target.mine ? -1 : 1)
  if (count <= 0) return reactions.filter((r) => r.emoji !== emoji)
  return reactions.map((r) => (r.emoji === emoji ? { emoji, count, mine: !r.mine } : r))
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
      patchMessage(queryClient, roomId, messageId, (m) => ({ ...m, content, edited: true }))
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
        imageUrl: null,
        linkPreview: null,
        reactions: [],
        deleted: true,
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

// 읽음은 STOMP SEND /app/rooms/{id}/read 로만 한다(REST 없음). 문서가 보일 때만, 같은 id 는 한 번만 보낸다.
export function useMarkRead(): (roomId: string, messageId: string) => void {
  return markChatRead
}

// ===== 소켓 이벤트 → 캐시 (KAN-333) =====

// 방마다 "읽는 사람 → 마지막으로 읽은 메시지 id". 방 토픽을 구독할 때마다 그 방 것을 비운다(구독 전 이벤트는 못 봤으므로).
type ReadPointers = Map<string, Map<string, string>>

// 소켓 메시지는 방 전체에 한 번 보내는 뷰어 중립 값이다(mine 항상 false, 문의방 관리자 표시명 고정).
// 이미 가진 메시지면 내 시점 값(sender·mine)은 캐시 쪽을 유지한다.
function keepMyReactions(incoming: ChatReaction[], current: ChatReaction[]): ChatReaction[] {
  return incoming.map((r) => ({ ...r, mine: current.some((c) => c.emoji === r.emoji && c.mine) }))
}

function mergeSocketMessage(current: ChatMessage, incoming: ChatMessage): ChatMessage {
  return { ...incoming, sender: current.sender, reactions: keepMyReactions(incoming.reactions, current.reactions) }
}

function patchUnreadCounts(queryClient: QueryClient, roomId: string, counts: Map<string, number>) {
  queryClient.setQueryData<MessagePages>(messagesKey(roomId), (data) =>
    data && {
      ...data,
      pages: data.pages.map((page) =>
        page.map((m) => {
          const unreadCount = counts.get(m.id)
          return unreadCount === undefined ? m : { ...m, unreadCount }
        }),
      ),
    },
  )
}

// "readerId 가 messageId 까지 읽음"을 안 읽은 수에 반영한다. READ 와 새 메시지(보내면 서버가 보낸 사람을 거기까지 읽음 처리) 둘 다 여기로 온다.
// 규칙은 BE ChatResponseAssembler 와 같다: 보낸 사람은 세지 않고, 문의방은 관리자 전원을 한 명으로 센다.
// 이전 읽은 지점 다음 ~ messageId 사이에서 그 사람이 보내지 않은 메시지마다 1을 뺀다.
function applyRead(queryClient: QueryClient, roomId: string, readerId: string, messageId: string, pointers: ReadPointers) {
  const room = queryClient.getQueryData<ChatRoomDetail>(roomKey(roomId))
  const isInquiry = room?.type === 'INQUIRY'
  const staffIds = isInquiry ? room.members.filter((m) => m.admin).map((m) => m.userId) : []
  const isStaff = staffIds.includes(readerId)
  const readerIds = isStaff ? staffIds : [readerId]
  const roomPointers = pointers.get(roomId) ?? new Map<string, string>()
  pointers.set(roomId, roomPointers)
  const pointerKey = isStaff ? 'staff' : readerId
  const previous = roomPointers.get(pointerKey)
  roomPointers.set(pointerKey, messageId)

  // 단체방에서 처음 보는 사람은 이전에 어디까지 읽었는지 몰라 최신 페이지 값을 서버에서 받아 맞춘다.
  // 문의방은 읽는 쪽이 둘뿐이라 처음부터 빼도 정확하다.
  // ponytail: 멤버별 읽은 지점이 API 에 없어 구독마다 사람당 1회 조회한다. 방 상세가 lastReadMessageId 를 주면 이 분기를 없앤다.
  if (!previous && !isInquiry) {
    fetchChatMessages(roomId).then(
      (latest) => patchUnreadCounts(queryClient, roomId, new Map(latest.map((m) => [m.id, m.unreadCount]))),
      () => {},
    )
    return
  }
  const ordered = [...(queryClient.getQueryData<MessagePages>(messagesKey(roomId))?.pages ?? [])].reverse().flat()
  const end = ordered.findIndex((m) => m.id === messageId)
  const start = previous ? ordered.findIndex((m) => m.id === previous) + 1 : 0
  const counts = new Map(
    ordered
      .slice(start, end + 1)
      .filter((m) => m.unreadCount > 0 && !readerIds.includes(m.sender?.id ?? ''))
      .map((m): [string, number] => [m.id, m.unreadCount - 1]),
  )
  if (counts.size > 0) patchUnreadCounts(queryClient, roomId, counts)
}

function applyRoomEvent(queryClient: QueryClient, event: ChatSocketEvent, pointers: ReadPointers) {
  const { roomId } = event
  switch (event.kind) {
    case 'MESSAGE_CREATED':
    case 'MESSAGE_UPDATED':
    case 'MESSAGE_DELETED': {
      const message = event.payload
      // 이미 있으면(내 전송 응답이 먼저 붙인 경우 포함) 교체, 새 메시지면 최신 페이지 끝에 붙인다
      patchMessage(queryClient, roomId, message.id, (m) => mergeSocketMessage(m, message))
      if (event.kind === 'MESSAGE_CREATED') {
        appendMessage(queryClient, roomId, message)
        if (message.sender) applyRead(queryClient, roomId, message.sender.id, message.id, pointers)
      }
      return
    }
    case 'REACTION_CHANGED': {
      const { id, reactions } = event.payload
      patchMessage(queryClient, roomId, id, (m) => ({ ...m, reactions: keepMyReactions(reactions, m.reactions) }))
      return
    }
    case 'READ': {
      const { userId, messageId } = event.payload
      applyRead(queryClient, roomId, userId, messageId, pointers)
      // 내가 방의 마지막 메시지까지 읽었으면 방 목록(바텀 내비 배지)도 바로 0
      if (userId === useAuthStore.getState().userId) {
        queryClient.setQueryData<ChatRoomSummary[]>(roomsKey, (rooms) =>
          rooms?.map((r) => (r.id === roomId && r.lastMessage?.id === messageId ? { ...r, unreadCount: 0 } : r)),
        )
      }
      return
    }
    case 'NOTICE_CHANGED': {
      const notice = event.payload
      queryClient.setQueryData<ChatRoomDetail>(roomKey(roomId), (room) => room && { ...room, notice })
      return
    }
    case 'MEMBER_CHANGED':
      // 멤버 목록·내 권한은 방 상세로 다시 받는다. 내가 내보내졌으면 403 → ChatRoom 이 목록으로 보낸다.
      queryClient.invalidateQueries({ queryKey: roomKey(roomId) })
  }
}

// /user/queue/rooms: 새 메시지가 생긴 방의 미리보기. 목록에 없는 방(새로 초대됨·숨김 해제)이면 목록을 다시 받는다.
function applyRoomPreview(queryClient: QueryClient, { roomId, lastMessage, unreadCount }: ChatRoomPreviewEvent) {
  const rooms = queryClient.getQueryData<ChatRoomSummary[]>(roomsKey)
  const room = rooms?.find((r) => r.id === roomId)
  if (!rooms || !room) {
    queryClient.invalidateQueries({ queryKey: roomsKey })
    return
  }
  // 서버 정렬(최근 메시지 순)에 맞춰 맨 위로
  queryClient.setQueryData<ChatRoomSummary[]>(roomsKey, [
    { ...room, lastMessage, unreadCount },
    ...rooms.filter((r) => r.id !== roomId),
  ])
}

// 방 토픽 구독 직후: 캐시의 마지막 메시지 이후를 받아 끊긴 동안의 공백을 채운다.
// 구독 뒤 실시간 이벤트가 먼저 붙었을 수 있어 최신 페이지를 시간순으로 다시 정렬한다.
async function fillMessageGap(queryClient: QueryClient, roomId: string) {
  const data = queryClient.getQueryData<MessagePages>(messagesKey(roomId))
  if (!data) return // 첫 조회 전: REST 가 최신을 받는다
  const newest = data.pages[0] ?? []
  const lastId = newest[newest.length - 1]?.id
  const missed = lastId ? await fetchChatMessagesAfter(roomId, lastId) : []
  // 빈 방이었거나 공백이 한 페이지 이상이면 처음부터 다시 받는다
  if (!lastId || missed.length >= CHAT_PAGE_SIZE) {
    await queryClient.invalidateQueries({ queryKey: messagesKey(roomId) })
    return
  }
  queryClient.setQueryData<MessagePages>(messagesKey(roomId), (current) => {
    if (!current) return current
    const known = new Set(current.pages.flat().map((m) => m.id))
    const fresh = missed.filter((m) => !known.has(m.id))
    if (fresh.length === 0) return current
    const [head = [], ...older] = current.pages
    // createdAt 은 같은 형식의 ISO 문자열이라 문자열 비교가 시간순이다
    const merged = [...head, ...fresh].sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0))
    return { ...current, pages: [merged, ...older] }
  })
}

// /chat 하위 라우트 레이아웃에서만 쓴다: 로그인 상태면 소켓을 열고, /chat 을 벗어나거나(언마운트) 로그아웃하면 닫는다.
// 끊긴 동안은 useChatRooms 의 30초 폴링이 그대로 돈다.
export function useChatSocket() {
  const queryClient = useQueryClient()
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn)
  const roomId = usePathname().match(/^\/chat\/([^/]+)$/)?.[1] ?? null
  const router = useRouter()
  const t = useTranslations('chat')
  const showToast = useToastStore((s) => s.show)

  useEffect(() => {
    if (!isLoggedIn) return
    const pointers: ReadPointers = new Map()
    connectChatSocket({
      onRoomSubscribed: (id) => {
        pointers.delete(id)
        fillMessageGap(queryClient, id).catch(() => {})
      },
      onRoomEvent: (event) => applyRoomEvent(queryClient, event, pointers),
      onRoomsEvent: (preview) => applyRoomPreview(queryClient, preview),
      onRoomRejected: () => {
        showToast(t('room.notMember'), 'error')
        router.replace('/chat')
      },
    })
    document.addEventListener('visibilitychange', flushChatRead)
    return () => {
      document.removeEventListener('visibilitychange', flushChatRead)
      disconnectChatSocket()
    }
  }, [isLoggedIn, queryClient, router, showToast, t])

  useEffect(() => {
    setChatSocketRoom(roomId)
    return () => setChatSocketRoom(null)
  }, [roomId])
}

