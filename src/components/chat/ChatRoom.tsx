'use client'

import { Fragment, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ChevronDown, Megaphone, Menu, X } from 'lucide-react'
import dayjs from 'dayjs'
import { useLocale, useTranslations } from 'next-intl'
import { ApiErrorMessage, LoadingSpinner } from '@/components/ui'
import {
  useChatMessages,
  useChatRoom,
  useDeleteMessage,
  useEditMessage,
  useMarkRead,
  useReportMessage,
  useSendMessage,
  useSetChatNotice,
  useToggleReaction,
} from '@/lib/hooks/useChat'
import { useBackNavigation } from '@/lib/hooks/useBackNavigation'
import { useRequireAuth } from '@/lib/hooks/useRequireAuth'
import { useAuthStore } from '@/lib/store/authStore'
import { useToastStore } from '@/lib/store/toastStore'
import { getApiErrorCode, getApiErrorStatus, resolveApiErrorMessage } from '@/lib/utils/apiError'
import { getMessagePreview, getSystemMessageText } from '@/lib/utils/chatMessage'
import { formatLocalizedFullDate } from '@/lib/utils/date'
import type { ChatMember, ChatMessage } from '@/lib/api/types'
import ChatActionSheet from './ChatActionSheet'
import type { ChatSheetAction } from './ChatActionSheet'
import ChatComposer from './ChatComposer'
import ChatDialog from './ChatDialog'
import ChatMemberDrawer from './ChatMemberDrawer'
import ChatMessageBubble from './ChatMessageBubble'

const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'] as const
const TEXT_MAX_LENGTH = 2000
const REPORT_MAX_LENGTH = 500
// 이 거리(px) 안이면 "맨 아래에 붙어 있음"으로 보고 새 메시지에 따라 내려간다
const STICK_THRESHOLD = 80
// 이 거리(px) 안으로 위쪽에 닿으면 이전 메시지를 더 불러온다
const LOAD_MORE_THRESHOLD = 60

interface ChatRoomProps {
  roomId: string
  // 뒤로가기 기본 경로·방에 못 들어갈 때 돌아갈 목록 (관리자 화면은 /admin/chat)
  listHref?: string
  // 관리자 화면이 멤버 드로어에 붙이는 액션 (멤버 행 오른쪽, 목록 아래)
  memberActions?: (member: ChatMember) => ReactNode
  drawerFooter?: ReactNode
}

interface DialogState {
  kind: 'edit' | 'delete' | 'report'
  message: ChatMessage
}

// 같은 사람의 연속 메시지(같은 날, 시스템 메시지 없이 이어짐)인지
function isSameRun(a: ChatMessage | undefined, b: ChatMessage | undefined): boolean {
  return (
    !!a &&
    !!b &&
    a.type !== 'SYSTEM' &&
    b.type !== 'SYSTEM' &&
    a.sender?.userId === b.sender?.userId &&
    dayjs(a.createdAt).isSame(b.createdAt, 'day')
  )
}

function CenterPill({ children }: { children: ReactNode }) {
  return (
    <div className="my-3 flex justify-center px-6">
      <span className="rounded-full bg-tag-bg px-3 py-1 text-center text-[11px] text-tag-text">{children}</span>
    </div>
  )
}

export default function ChatRoom({ roomId, listHref = '/chat', memberActions, drawerFooter }: ChatRoomProps) {
  const t = useTranslations('chat')
  const tCommon = useTranslations('common')
  const locale = useLocale()
  const router = useRouter()
  const handleBack = useBackNavigation(listHref)
  const { isLoggedIn, isInitialized, requireAuth } = useRequireAuth()
  const { userId, nickname, isAdmin } = useAuthStore()
  const showToast = useToastStore((s) => s.show)

  const roomQuery = useChatRoom(roomId)
  const messagesQuery = useChatMessages(roomId)
  const { outbox, sendText, sendImage, retry, discard } = useSendMessage(roomId)
  const editMessage = useEditMessage(roomId)
  const deleteMessage = useDeleteMessage(roomId)
  const toggleReaction = useToggleReaction(roomId)
  const reportMessage = useReportMessage()
  const setNotice = useSetChatNotice(roomId)
  const markRead = useMarkRead()

  const [sheetMessage, setSheetMessage] = useState<ChatMessage | null>(null)
  const [dialog, setDialog] = useState<DialogState | null>(null)
  const [viewerUrl, setViewerUrl] = useState<string | null>(null)
  const [isMembersOpen, setIsMembersOpen] = useState(false)
  const [isNoticeExpanded, setIsNoticeExpanded] = useState(false)

  const listRef = useRef<HTMLDivElement>(null)
  const stickToBottomRef = useRef(true)
  const restoreScrollRef = useRef<{ height: number; top: number } | null>(null)

  const room = roomQuery.data
  const roomErrorCode = getApiErrorCode(roomQuery.error)
  const isRedirecting = roomErrorCode === 'CHAT_NOT_MEMBER' || getApiErrorStatus(roomQuery.error) === 404

  // 서버 페이지는 최신 페이지가 앞, 페이지 안은 오래된 → 최신 순
  const messages = messagesQuery.data ? [...messagesQuery.data.pages].reverse().flat() : []
  const outboxById = new Map(outbox.map((item) => [item.tempId, item]))
  const allMessages: ChatMessage[] = [
    ...messages,
    ...outbox.map((item) => ({
      id: item.tempId,
      roomId,
      sender: { userId: userId ?? '', nickname, avatarUrl: null },
      type: item.type,
      content: item.content,
      systemKind: null,
      systemParams: null,
      linkPreview: null,
      reactions: [],
      unreadCount: 0,
      editedAt: null,
      deletedAt: null,
      createdAt: item.createdAt,
    })),
  ]
  const lastMessageId = messages[messages.length - 1]?.id

  useEffect(() => {
    if (isInitialized && !isLoggedIn) requireAuth()
  }, [isInitialized, isLoggedIn, requireAuth])

  // 403 CHAT_NOT_MEMBER → 토스트 + 목록, 404 → 목록
  useEffect(() => {
    if (!isRedirecting) return
    if (roomErrorCode === 'CHAT_NOT_MEMBER') showToast(t('room.notMember'), 'error')
    router.replace(listHref)
  }, [isRedirecting, roomErrorCode, router, showToast, t, listHref])

  // 읽음 전송: 방 진입·새 메시지 수신 시 (문서가 보일 때만, 같은 id 는 한 번만 — lib/chat/socket.ts)
  useEffect(() => {
    if (lastMessageId) markRead(roomId, lastMessageId)
  }, [markRead, roomId, lastMessageId])

  // 이전 페이지를 붙였으면 보던 위치 유지, 아니면 맨 아래에 붙어 있을 때만 따라 내려간다
  useLayoutEffect(() => {
    const el = listRef.current
    if (!el) return
    const restore = restoreScrollRef.current
    if (restore) {
      if (messagesQuery.isFetchingNextPage) return
      el.scrollTop = el.scrollHeight - restore.height + restore.top
      restoreScrollRef.current = null
      return
    }
    if (stickToBottomRef.current) el.scrollTop = el.scrollHeight
  }, [messagesQuery.data, messagesQuery.isFetchingNextPage, outbox])

  const handleScroll = () => {
    const el = listRef.current
    if (!el) return
    stickToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < STICK_THRESHOLD
    if (el.scrollTop < LOAD_MORE_THRESHOLD && messagesQuery.hasNextPage && !messagesQuery.isFetchingNextPage) {
      restoreScrollRef.current = { height: el.scrollHeight, top: el.scrollTop }
      messagesQuery.fetchNextPage()
    }
  }

  const showError = (error: unknown) => showToast(resolveApiErrorMessage(error, tCommon), 'error')

  const handleSendText = (text: string) => {
    stickToBottomRef.current = true
    sendText(text)
  }

  const handleSendImage = (image: Blob) => {
    stickToBottomRef.current = true
    sendImage(image)
  }

  const handleNotice = (messageId: string | null) =>
    setNotice.mutate(messageId, {
      onSuccess: () => showToast(t(messageId ? 'actions.noticeSet' : 'actions.noticeCleared')),
      onError: showError,
    })

  const copyText = (text: string) => {
    navigator.clipboard?.writeText(text).then(
      () => showToast(t('actions.copied')),
      () => {},
    )
  }

  const buildActions = (message: ChatMessage): ChatSheetAction[] => {
    const isMine = message.sender?.userId === userId
    const actions: ChatSheetAction[] = []
    const text = message.type === 'TEXT' ? message.content : null
    if (text) actions.push({ key: 'copy', label: t('actions.copy'), onSelect: () => copyText(text) })
    if (isMine && text !== null) {
      actions.push({ key: 'edit', label: t('actions.edit'), onSelect: () => setDialog({ kind: 'edit', message }) })
    }
    if (isAdmin) {
      const isNotice = room?.noticeMessage?.id === message.id
      actions.push({
        key: 'notice',
        label: t(isNotice ? 'actions.clearNotice' : 'actions.setNotice'),
        onSelect: () => handleNotice(isNotice ? null : message.id),
      })
    }
    if (!isMine) {
      actions.push({ key: 'report', label: t('actions.report'), danger: true, onSelect: () => setDialog({ kind: 'report', message }) })
    }
    if (isMine || isAdmin) {
      actions.push({ key: 'delete', label: t('actions.delete'), danger: true, onSelect: () => setDialog({ kind: 'delete', message }) })
    }
    return actions
  }

  const handleDialogConfirm = (value: string) => {
    if (!dialog) return
    const { kind, message } = dialog
    const close = () => setDialog(null)
    if (kind === 'edit') {
      editMessage.mutate({ messageId: message.id, content: value }, { onSuccess: close, onError: showError })
    } else if (kind === 'delete') {
      deleteMessage.mutate(message.id, { onSuccess: close, onError: showError })
    } else {
      reportMessage.mutate(
        { messageId: message.id, reason: value },
        {
          onSuccess: () => {
            close()
            showToast(t('actions.reported'))
          },
          onError: showError,
        },
      )
    }
  }

  const dialogProps = dialog
    ? {
        edit: {
          title: t('actions.editTitle'),
          input: { initialValue: dialog.message.content ?? '', maxLength: TEXT_MAX_LENGTH },
          confirmLabel: t('actions.save'),
        },
        delete: {
          title: t('actions.deleteConfirmTitle'),
          description: t('actions.deleteConfirmDescription'),
          confirmLabel: t('actions.delete'),
        },
        report: {
          title: t('actions.reportTitle'),
          input: { initialValue: '', placeholder: t('actions.reportPlaceholder'), maxLength: REPORT_MAX_LENGTH },
          confirmLabel: t('actions.report'),
        },
      }[dialog.kind]
    : null

  const renderMessage = (message: ChatMessage, prev: ChatMessage | undefined, next: ChatMessage | undefined) => {
    if (message.type === 'SYSTEM') return <CenterPill>{getSystemMessageText(message, t)}</CenterPill>

    const pending = outboxById.get(message.id)
    const isMine = !!pending || (!!userId && message.sender?.userId === userId)
    const isDeleted = !!message.deletedAt
    const hideTime = isSameRun(message, next) && !!next && dayjs(message.createdAt).isSame(next.createdAt, 'minute')

    return (
      <ChatMessageBubble
        isMine={isMine}
        showProfile={!isSameRun(prev, message)}
        senderName={message.sender?.nickname ?? t('withdrawn')}
        senderAvatarUrl={message.sender?.avatarUrl ?? null}
        isHouseSender={room?.type === 'INQUIRY' && !isAdmin}
        type={message.type === 'IMAGE' ? 'IMAGE' : 'TEXT'}
        content={message.content}
        isDeleted={isDeleted}
        isEdited={!!message.editedAt}
        time={hideTime ? null : dayjs(message.createdAt).format('HH:mm')}
        unreadCount={message.unreadCount}
        linkPreview={message.linkPreview}
        reactions={message.reactions}
        status={pending ? (pending.failed ? 'failed' : 'sending') : 'sent'}
        onLongPress={pending || isDeleted ? null : () => setSheetMessage(message)}
        onToggleReaction={(emoji) => toggleReaction.mutate({ messageId: message.id, emoji }, { onError: showError })}
        onOpenImage={setViewerUrl}
        onRetry={() => retry(message.id)}
        onDiscard={() => discard(message.id)}
      />
    )
  }

  let listContent: ReactNode
  if ((roomQuery.isError && !isRedirecting) || messagesQuery.isError) {
    listContent = (
      <ApiErrorMessage
        message={t('room.loadError')}
        onRetry={() => {
          roomQuery.refetch()
          messagesQuery.refetch()
        }}
      />
    )
  } else if (!room || !messagesQuery.data) {
    listContent = (
      <div className="flex h-full items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  } else if (allMessages.length === 0) {
    listContent = <p className="flex h-full items-center justify-center text-sm text-tag-text">{t('room.empty')}</p>
  } else {
    listContent = allMessages.map((message, index) => {
      const prev = allMessages[index - 1]
      const isNewDay = !prev || !dayjs(prev.createdAt).isSame(message.createdAt, 'day')
      return (
        <Fragment key={message.id}>
          {isNewDay && <CenterPill>{formatLocalizedFullDate(message.createdAt, locale)}</CenterPill>}
          {renderMessage(message, prev, allMessages[index + 1])}
        </Fragment>
      )
    })
  }

  return (
    <div className="flex h-dvh flex-col bg-card lg:h-full">
      <header className="flex h-14 shrink-0 items-center gap-1 border-b border-tag-bg bg-card px-1">
        <button
          type="button"
          onClick={handleBack}
          className="flex h-10 w-10 shrink-0 items-center justify-center text-foreground"
          aria-label={tCommon('back')}
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="flex min-w-0 flex-1 items-baseline gap-1.5">
          <span className="truncate text-base font-bold text-foreground">{room?.name}</span>
          {room && <span className="shrink-0 text-sm text-tag-text/70">{room.members.length}</span>}
        </h1>
        <button
          type="button"
          onClick={() => setIsMembersOpen(true)}
          disabled={!room}
          className="flex h-10 w-10 shrink-0 items-center justify-center text-foreground disabled:opacity-40"
          aria-label={t('room.openMembers')}
        >
          <Menu size={20} />
        </button>
      </header>

      {room?.noticeMessage && (
        <div className="shrink-0 bg-card px-3 pt-2">
          <div className="flex items-start gap-2 rounded-[12px] border border-tag-bg bg-background px-3 py-2">
            <Megaphone size={16} className="mt-0.5 shrink-0 text-primary" />
            <button
              type="button"
              onClick={() => setIsNoticeExpanded((v) => !v)}
              aria-expanded={isNoticeExpanded}
              className={`min-w-0 flex-1 text-left text-sm text-foreground ${
                isNoticeExpanded ? 'whitespace-pre-wrap break-words' : 'truncate'
              }`}
            >
              {getMessagePreview(room.noticeMessage, t)}
            </button>
            {isAdmin && isNoticeExpanded && (
              <button
                type="button"
                onClick={() => handleNotice(null)}
                disabled={setNotice.isPending}
                className="shrink-0 text-xs font-semibold text-primary disabled:opacity-50"
              >
                {t('room.noticeClear')}
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsNoticeExpanded((v) => !v)}
              className="shrink-0 text-tag-text"
              aria-label={t('room.noticeToggle')}
            >
              <ChevronDown size={16} className={isNoticeExpanded ? 'rotate-180' : ''} />
            </button>
          </div>
        </div>
      )}

      <div className="relative min-h-0 flex-1">
        <div ref={listRef} onScroll={handleScroll} className="h-full overflow-y-auto overscroll-contain pb-3 [overflow-anchor:none]">
          {listContent}
        </div>
        {messagesQuery.isFetchingNextPage && (
          <div className="pointer-events-none absolute inset-x-0 top-2 flex justify-center">
            <LoadingSpinner size="sm" />
          </div>
        )}
      </div>

      <ChatComposer
        disabled={!room || !messagesQuery.data}
        disabledReason={room && !room.canSend ? t('room.muted') : null}
        onSendText={handleSendText}
        onSendImage={handleSendImage}
      />

      {sheetMessage && (
        <ChatActionSheet
          actions={buildActions(sheetMessage)}
          reactionEmojis={REACTION_EMOJIS}
          onSelectReaction={(emoji) =>
            toggleReaction.mutate({ messageId: sheetMessage.id, emoji }, { onError: showError })
          }
          onClose={() => setSheetMessage(null)}
        />
      )}

      {dialog && dialogProps && (
        <ChatDialog
          key={`${dialog.kind}-${dialog.message.id}`}
          {...dialogProps}
          isPending={editMessage.isPending || deleteMessage.isPending || reportMessage.isPending}
          onConfirm={handleDialogConfirm}
          onClose={() => setDialog(null)}
        />
      )}

      {isMembersOpen && room && (
        <ChatMemberDrawer
          members={room.members}
          myUserId={userId}
          renderMemberActions={memberActions}
          footer={drawerFooter}
          onClose={() => setIsMembersOpen(false)}
        />
      )}

      {viewerUrl && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed lg:absolute inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={() => setViewerUrl(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- 서명 URL·로컬 blob 원본 보기 */}
          <img src={viewerUrl} alt={t('message.imageAlt')} className="max-h-full max-w-full object-contain" />
          <button
            type="button"
            onClick={() => setViewerUrl(null)}
            className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center text-white"
            aria-label={tCommon('close')}
          >
            <X size={24} />
          </button>
        </div>
      )}
    </div>
  )
}
