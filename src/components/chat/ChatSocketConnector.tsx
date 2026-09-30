'use client'

import { useChatSocket } from '@/lib/hooks/useChat'

// /chat 레이아웃에만 둔다: 채팅 탭 안에서 방을 오가는 동안 소켓 하나를 유지하고, 탭을 벗어나면 끊는다.
export default function ChatSocketConnector() {
  useChatSocket()
  return null
}
