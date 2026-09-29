import ChatRoom from '@/components/chat/ChatRoom'

export default async function ChatRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  // 방을 옮기면 전송 대기열·스크롤 상태를 새로 시작한다
  return <ChatRoom key={id} roomId={id} />
}
