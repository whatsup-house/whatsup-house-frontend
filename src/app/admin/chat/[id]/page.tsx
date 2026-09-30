import AdminChatRoom from '@/components/admin/AdminChatRoom'

export default async function AdminChatRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  // 방을 옮기면 전송 대기열·스크롤·다이얼로그 상태를 새로 시작한다
  return <AdminChatRoom key={id} roomId={id} />
}
