'use client'

import { useState } from 'react'
import type { ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import dayjs from 'dayjs'
import { Plus } from 'lucide-react'
import { ApiErrorMessage, LoadingSpinner } from '@/components/ui'
import AdminChatNav from './AdminChatNav'
import ChatGroupRoomFormPanel from './ChatGroupRoomFormPanel'
import { useAddChatMembers, useAdminChatRooms, useChatSourceGatherings } from '@/lib/hooks/useAdminChat'
import { useAuthStore } from '@/lib/store/authStore'
import { getAdminApiErrorMessage } from '@/lib/utils/apiError'
import type { AdminChatRoomSummary, ChatLastMessage, ChatRoomType } from '@/lib/api/types'

const TABS: { type: ChatRoomType; label: string }[] = [
  { type: 'INQUIRY', label: '문의방' },
  { type: 'GROUP', label: '단체방' },
]

const SYSTEM_PREVIEW = { JOINED: '멤버가 들어왔어요', KICKED: '멤버를 내보냈어요', NOTICE_SET: '공지가 등록되었어요' }

function getPreview(message: ChatLastMessage | null): string {
  if (!message) return '아직 메시지가 없어요'
  if (message.deleted) return '삭제된 메시지입니다'
  if (message.type === 'IMAGE') return '사진'
  if (message.systemKind === 'SYSTEM_NOTICE') return message.systemParams?.text ?? ''
  if (message.type === 'SYSTEM') return message.systemKind ? SYSTEM_PREVIEW[message.systemKind] : ''
  return message.content ?? ''
}

function formatTime(iso: string | undefined): string {
  if (!iso) return ''
  const time = dayjs(iso)
  return time.isSame(dayjs(), 'day') ? time.format('HH:mm') : time.format('M/D')
}

const lastTime = (room: AdminChatRoomSummary) => room.lastMessage?.createdAt ?? ''

// 미답변 먼저, 그 안에서는 최근 메시지 순
function sortInquiries(rooms: AdminChatRoomSummary[]): AdminChatRoomSummary[] {
  return [...rooms].sort(
    (a, b) => Number(b.unanswered) - Number(a.unanswered) || lastTime(b).localeCompare(lastTime(a)),
  )
}

interface RoomRowProps {
  title: string
  badges: string[]
  subtitle: string
  time: string
  unreadCount: number
  onOpen: () => void
}

function RoomRow({ title, badges, subtitle, time, unreadCount, onOpen }: RoomRowProps) {
  return (
    <li>
      <button type="button" onClick={onOpen} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-background">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-[15px] font-semibold text-foreground">{title}</span>
            {badges.map((badge) => (
              <span key={badge} className="shrink-0 rounded-full bg-primary-light px-2 py-0.5 text-[11px] font-medium text-primary">
                {badge}
              </span>
            ))}
          </div>
          <p className="mt-0.5 truncate text-[13px] text-tag-text">{subtitle}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1 self-start pt-0.5">
          <span className="text-[11px] text-tag-text">{time}</span>
          {unreadCount > 0 && (
            <span className="min-w-[18px] rounded-full bg-primary px-1.5 text-center text-[11px] font-bold leading-[18px] text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
      </button>
    </li>
  )
}

export default function AdminChatRoomList() {
  const router = useRouter()
  const userId = useAuthStore((s) => s.userId)
  const roomsQuery = useAdminChatRooms()
  const { data: gatherings } = useChatSourceGatherings()
  const addMembers = useAddChatMembers()

  const [tab, setTab] = useState<ChatRoomType>('INQUIRY')
  const [unansweredOnly, setUnansweredOnly] = useState(false)
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  const rooms = roomsQuery.data ?? []
  const inquiries = sortInquiries(rooms.filter((r) => r.type === 'INQUIRY' && (!unansweredOnly || r.unanswered)))
  const groups = rooms.filter((r) => r.type === 'GROUP')
  const unansweredCount = rooms.filter((r) => r.type === 'INQUIRY' && r.unanswered).length
  const gatheringTitles = new Map(gatherings?.map((g) => [g.id, g.title]))

  const getSourceLabel = (room: AdminChatRoomSummary) => {
    if (room.sourceType === 'GATHERING') return `게더링 · ${gatheringTitles.get(room.sourceId ?? '') ?? '(알 수 없음)'}`
    if (room.sourceType === 'DINING_TABLE') return '우연한 식탁 조'
    return '직접 만든 방'
  }

  // 다른 관리자가 만든 단체방은 먼저 들어가야 볼 수 있다 (입장 시스템 메시지가 남는다)
  const openRoom = (room: AdminChatRoomSummary) => {
    const href = `/admin/chat/${room.id}`
    if (room.member || !userId) {
      router.push(href)
      return
    }
    if (!confirm('참여하지 않은 단체방이에요. 참여하고 들어갈까요? 방에 입장 메시지가 남아요.')) return
    addMembers.mutate({ roomId: room.id, userIds: [userId] }, { onSuccess: () => router.push(href) })
  }

  let content: ReactNode
  if (roomsQuery.isLoading) {
    content = (
      <div className="flex h-48 items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  } else if (roomsQuery.isError) {
    content = (
      <ApiErrorMessage
        message={getAdminApiErrorMessage(roomsQuery.error, '채팅방 목록을 불러오지 못했어요.')}
        onRetry={() => roomsQuery.refetch()}
      />
    )
  } else if (tab === 'INQUIRY') {
    content =
      inquiries.length === 0 ? (
        <p className="p-10 text-center text-sm text-tag-text">{unansweredOnly ? '미답변 문의가 없어요.' : '문의방이 없어요.'}</p>
      ) : (
        <ul className="divide-y divide-tag-bg">
          {inquiries.map((room) => (
            <RoomRow
              key={room.id}
              title={room.name ?? '(탈퇴한 회원)'}
              badges={room.unanswered ? ['미답변'] : []}
              subtitle={getPreview(room.lastMessage)}
              time={formatTime(room.lastMessage?.createdAt)}
              unreadCount={room.unreadCount}
              onOpen={() => openRoom(room)}
            />
          ))}
        </ul>
      )
  } else {
    content =
      groups.length === 0 ? (
        <p className="p-10 text-center text-sm text-tag-text">단체방이 없어요. 새 단체방을 만들어보세요.</p>
      ) : (
        <ul className="divide-y divide-tag-bg">
          {groups.map((room) => (
            <RoomRow
              key={room.id}
              title={`${room.name ?? ''} (${room.memberCount})`}
              badges={room.member ? [] : ['미참여']}
              subtitle={`${getSourceLabel(room)} · ${getPreview(room.lastMessage)}`}
              time={formatTime(room.lastMessage?.createdAt)}
              unreadCount={room.unreadCount}
              onOpen={() => openRoom(room)}
            />
          ))}
        </ul>
      )
  }

  return (
    <div className="max-w-3xl">
      <AdminChatNav title="채팅 관리" />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        {TABS.map(({ type, label }) => (
          <button
            key={type}
            type="button"
            onClick={() => setTab(type)}
            className={`rounded-full px-4 py-1.5 text-sm ${
              tab === type ? 'bg-foreground font-semibold text-white' : 'bg-tag-bg text-tag-text'
            }`}
          >
            {label}
            {type === 'INQUIRY' && unansweredCount > 0 && <span className="ml-1 text-primary">{unansweredCount}</span>}
          </button>
        ))}
        <div className="ml-auto">
          {tab === 'INQUIRY' ? (
            <label className="flex items-center gap-1.5 text-sm text-tag-text">
              <input
                type="checkbox"
                checked={unansweredOnly}
                onChange={(e) => setUnansweredOnly(e.target.checked)}
                className="accent-primary"
              />
              미답변만
            </label>
          ) : (
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex items-center gap-1 rounded-input bg-primary px-3 py-1.5 text-sm font-medium text-white"
            >
              <Plus size={16} />
              새 단체방
            </button>
          )}
        </div>
      </div>

      <section className="overflow-hidden rounded-card bg-card shadow-sm">{content}</section>

      {isCreateOpen && <ChatGroupRoomFormPanel onClose={() => setIsCreateOpen(false)} />}
    </div>
  )
}
