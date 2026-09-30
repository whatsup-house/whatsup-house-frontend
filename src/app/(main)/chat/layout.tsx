import ChatSocketConnector from '@/components/chat/ChatSocketConnector'

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ChatSocketConnector />
      {children}
    </>
  )
}
