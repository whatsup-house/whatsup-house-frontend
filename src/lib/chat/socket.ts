import { Client, ReconnectionTimeMode } from '@stomp/stompjs'
import type { StompSubscription } from '@stomp/stompjs'
import { CHAT_SOCKET_URL, fetchChatSocketToken } from '@/lib/api/chat'
import type { ChatRoomPreviewEvent, ChatSocketEvent } from '@/lib/api/types'
import { getApiErrorStatus } from '@/lib/utils/apiError'

// 채팅 STOMP 단일 클라이언트 (docs chat-design 3절). 소켓은 수신 + 읽음 전송만, 송신은 REST.
// 연결 수명은 useChatSocket(/chat 레이아웃)이 정한다: /chat 하위 라우트 + 로그인 상태일 때만 연결.
// 이벤트 → react-query 캐시 반영은 useChat.ts 가 handlers 로 넘긴다.

export interface ChatSocketHandlers {
  // 방 토픽 구독 직후(연결·재연결·방 이동). 끊긴 동안의 공백 보충용
  onRoomSubscribed: (roomId: string) => void
  onRoomEvent: (event: ChatSocketEvent) => void
  onRoomsEvent: (preview: ChatRoomPreviewEvent) => void
  // 방 구독 거부(비멤버·없는 방)
  onRoomRejected: () => void
}

let client: Client | null = null
let handlers: ChatSocketHandlers | null = null
let currentRoomId: string | null = null
let roomSubscription: StompSubscription | null = null
// 읽음: 방마다 보내려는 마지막 id / 실제로 보낸 마지막 id (같은 id 중복 전송 방지)
const pendingRead = new Map<string, string>()
const sentRead = new Map<string, string>()

function subscribeRoom() {
  const roomId = currentRoomId
  if (!client?.connected || !roomId) return
  roomSubscription = client.subscribe(`/topic/rooms/${roomId}`, (frame) =>
    handlers?.onRoomEvent(JSON.parse(frame.body) as ChatSocketEvent),
  )
  // 끊기기 직전에 보낸 읽음은 유실됐을 수 있어 구독마다 다시 보낸다(서버는 같은·역행 위치를 무시한다)
  sentRead.delete(roomId)
  handlers?.onRoomSubscribed(roomId)
}

// 연결돼 있고 문서가 보일 때만 열린 방의 읽음을 보낸다. 못 보낸 건 연결·방 구독·visible 전환 때 다시 시도한다.
export function flushChatRead() {
  const roomId = currentRoomId
  const messageId = roomId ? pendingRead.get(roomId) : undefined
  if (!roomId || !messageId || sentRead.get(roomId) === messageId) return
  if (!client?.connected || document.visibilityState !== 'visible') return
  client.publish({ destination: `/app/rooms/${roomId}/read`, body: JSON.stringify({ messageId }) })
  sentRead.set(roomId, messageId)
}

export function markChatRead(roomId: string, messageId: string) {
  pendingRead.set(roomId, messageId)
  flushChatRead()
}

// 열린 방 토픽만 구독한다. 다른 방 새 메시지는 /user/queue/rooms 로만 온다.
export function setChatSocketRoom(roomId: string | null) {
  if (roomId === currentRoomId) return
  if (client?.connected) roomSubscription?.unsubscribe()
  roomSubscription = null
  currentRoomId = roomId
  subscribeRoom()
  flushChatRead()
}

export function connectChatSocket(next: ChatSocketHandlers) {
  handlers = next
  if (client) return
  // CONNECT 거부는 한 번만 다시 시도한다(연결에 성공하면 초기화)
  let isAuthRetry = false
  const c = new Client({
    brokerURL: CHAT_SOCKET_URL,
    // 지수 백오프 1s → 2s → … → 30s. 연결에 성공하면 1s 로 돌아간다.
    reconnectDelay: 1000,
    maxReconnectDelay: 30_000,
    reconnectTimeMode: ReconnectionTimeMode.EXPONENTIAL,
    // 연결 시도마다 소켓 토큰을 새로 받는다(수명 2분, 재사용 금지). access 쿠키가 만료됐으면 apiClient 인터셉터가 refresh 후 재시도한다.
    // 여기서 throw 하면 stompjs 재접속 루프가 멈추므로 모든 실패를 잡는다.
    beforeConnect: async () => {
      try {
        const { token } = await fetchChatSocketToken()
        c.connectHeaders = { Authorization: `Bearer ${token}` }
      } catch (error) {
        const status = getApiErrorStatus(error)
        // refresh 까지 실패(401)했거나 정지·탈퇴(403): 소켓은 포기하고 폴링만 유지
        if (status === 401 || status === 403) {
          await c.deactivate()
          return
        }
        // 네트워크·서버 오류: 토큰 없이 CONNECT → 서버가 거부하고 닫으면 백오프로 다시 시도한다
        c.connectHeaders = {}
      }
    },
    onConnect: () => {
      if (client !== c) return
      isAuthRetry = false
      c.subscribe('/user/queue/rooms', (frame) => handlers?.onRoomsEvent(JSON.parse(frame.body) as ChatRoomPreviewEvent))
      subscribeRoom()
      flushChatRead()
    },
    // BE 는 거부 사유(ErrorCode 이름)를 message 헤더에 싣고, ERROR 뒤 연결을 닫는다(→ 백오프 재접속)
    onStompError: () => {
      if (client !== c) return
      if (c.connected) {
        // 연결 뒤 ERROR = 방 구독 거부 (/user/queue/rooms 와 /app SEND 는 거부되지 않는다). 재접속 때 다시 구독하지 않게 비운다.
        currentRoomId = null
        roomSubscription = null
        handlers?.onRoomRejected()
        return
      }
      // CONNECT 거부(TOKEN_EXPIRED·UNAUTHORIZED 등). 토큰 발급이 일시 실패해 헤더 없이 보낸 경우는 백오프 재시도에 맡긴다.
      if (!c.connectHeaders.Authorization) return
      if (isAuthRetry) {
        void c.deactivate()
        return
      }
      // 재접속의 beforeConnect 가 쿠키 갱신(필요 시) + 새 토큰으로 한 번 더 시도한다
      isAuthRetry = true
    },
    onWebSocketClose: () => {
      roomSubscription = null
    },
  })
  client = c
  c.activate()
}

export function disconnectChatSocket() {
  const c = client
  client = null
  handlers = null
  roomSubscription = null
  // 다음 로그인(다른 계정일 수 있음)에 이전 읽음 기록이 남지 않게
  pendingRead.clear()
  sentRead.clear()
  void c?.deactivate()
}
