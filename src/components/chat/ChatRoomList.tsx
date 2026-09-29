'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, MessageCircle } from 'lucide-react'
import dayjs from 'dayjs'
import { useTranslations } from 'next-intl'
import { ApiErrorMessage, EmptyState, LoadingSpinner } from '@/components/ui'
import { useChatRooms, useHideRoom, useLeaveRoom, useOpenInquiry } from '@/lib/hooks/useChat'
import { useLongPress } from '@/lib/hooks/useLongPress'
import { useRequireAuth } from '@/lib/hooks/useRequireAuth'
import { useToastStore } from '@/lib/store/toastStore'
import { resolveApiErrorMessage } from '@/lib/utils/apiError'
import { getMessagePreview } from '@/lib/utils/chatMessage'
import type { ChatRoomSummary } from '@/lib/api/types'
import ChatActionSheet from './ChatActionSheet'
import ChatAvatar from './ChatAvatar'
import ChatDialog from './ChatDialog'

interface ChatRoomRowProps {
  name: string
  isInquiry: boolean
  memberCount: number
  preview: string
  time: string
  unreadCount: number
  onOpen: () => void
  onLongPress: () => void
}

function ChatRoomRow({ name, isInquiry, memberCount, preview, time, unreadCount, onOpen, onLongPress }: ChatRoomRowProps) {
  const longPress = useLongPress(onLongPress)
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        {...longPress}
        className="flex w-full select-none items-center gap-3 px-4 py-3 text-left [-webkit-touch-callout:none] active:bg-tag-bg/50"
      >
        {isInquiry ? (
          <ChatAvatar name={name} avatarUrl={null} isHouse />
        ) : (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-tag-bg text-sm font-bold text-tag-text">
            {memberCount}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-1.5">
            <span className="truncate text-[15px] font-semibold text-foreground">{name}</span>
            <span className="shrink-0 text-xs text-tag-text/70">{memberCount}</span>
          </div>
          <p className="mt-0.5 truncate text-[13px] text-tag-text">{preview}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1 self-start pt-0.5">
          <span className="text-[11px] text-tag-text/70">{time}</span>
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

export default function ChatRoomList() {
  const t = useTranslations('chat')
  const tCommon = useTranslations('common')
  const router = useRouter()
  const { isLoggedIn, isInitialized, requireAuth } = useRequireAuth()
  const showToast = useToastStore((s) => s.show)
  const { data: rooms, isLoading, isError, refetch } = useChatRooms()
  const openInquiry = useOpenInquiry()
  const hideRoom = useHideRoom()
  const leaveRoom = useLeaveRoom()
  const [sheetRoom, setSheetRoom] = useState<ChatRoomSummary | null>(null)
  const [leaveRoomId, setLeaveRoomId] = useState<string | null>(null)

  useEffect(() => {
    if (isInitialized && !isLoggedIn) requireAuth()
  }, [isInitialized, isLoggedIn, requireAuth])

  const showError = (error: unknown) => showToast(resolveApiErrorMessage(error, tCommon), 'error')

  const handleOpenInquiry = () =>
    openInquiry.mutate(undefined, {
      onSuccess: ({ roomId }) => router.push(`/chat/${roomId}`),
      onError: showError,
    })

  const handleHide = (roomId: string) =>
    hideRoom.mutate(roomId, { onSuccess: () => showToast(t('list.hidden')), onError: showError })

  const handleLeave = () => {
    if (!leaveRoomId) return
    leaveRoom.mutate(leaveRoomId, {
      onSuccess: () => {
        setLeaveRoomId(null)
        showToast(t('list.left'))
      },
      onError: showError,
    })
  }

  const formatTime = (iso: string) => {
    const date = dayjs(iso)
    return date.isSame(dayjs(), 'day') ? date.format('HH:mm') : date.format(t('list.dateFormat'))
  }

  let listBody
  if (!isInitialized || isLoading) {
    listBody = (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    )
  } else if (isError) {
    listBody = <ApiErrorMessage message={t('list.loadError')} onRetry={() => refetch()} />
  } else if (!rooms || rooms.length === 0) {
    listBody = <EmptyState icon={MessageCircle} title={t('list.empty')} />
  } else {
    listBody = (
      <ul>
        {rooms.map((room) => (
          <ChatRoomRow
            key={room.id}
            name={room.name}
            isInquiry={room.type === 'INQUIRY'}
            memberCount={room.memberCount}
            preview={room.lastMessage ? getMessagePreview(room.lastMessage, t) : ''}
            time={room.lastMessage ? formatTime(room.lastMessage.createdAt) : ''}
            unreadCount={room.unreadCount}
            onOpen={() => router.push(`/chat/${room.id}`)}
            onLongPress={() => setSheetRoom(room)}
          />
        ))}
      </ul>
    )
  }

  return (
    <div className="min-h-full bg-card pb-4">
      <button
        type="button"
        onClick={handleOpenInquiry}
        disabled={openInquiry.isPending || !isLoggedIn}
        className="flex w-full items-center gap-3 border-b border-tag-bg px-4 py-3 text-left active:bg-tag-bg/50 disabled:opacity-60"
      >
        <ChatAvatar name={tCommon('brand')} avatarUrl={null} isHouse />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold text-foreground">{t('list.inquiryCta')}</p>
          <p className="mt-0.5 truncate text-[13px] text-tag-text">{t('list.inquiryCtaDescription')}</p>
        </div>
        <ChevronRight size={18} className="shrink-0 text-tag-text" />
      </button>

      {listBody}

      {sheetRoom && (
        <ChatActionSheet
          actions={[
            sheetRoom.type === 'INQUIRY'
              ? { key: 'hide', label: t('list.hide'), onSelect: () => handleHide(sheetRoom.id) }
              : { key: 'leave', label: t('list.leave'), danger: true, onSelect: () => setLeaveRoomId(sheetRoom.id) },
          ]}
          onClose={() => setSheetRoom(null)}
        />
      )}

      {leaveRoomId && (
        <ChatDialog
          title={t('list.leaveConfirmTitle')}
          description={t('list.leaveConfirmDescription')}
          confirmLabel={t('list.leave')}
          isPending={leaveRoom.isPending}
          onConfirm={handleLeave}
          onClose={() => setLeaveRoomId(null)}
        />
      )}
    </div>
  )
}
