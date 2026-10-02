'use client'

import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode, RefObject } from 'react'
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
    a.sender?.id === b.sender?.id &&
    dayjs(a.createdAt).isSame(b.createdAt, 'day')
  )
}

// 맨 아래까지 남은 거리가 STICK_THRESHOLD 안인지. clientHeight 를 넘기면 그 높이였을 때 기준으로 본다.
function isNearBottom(el: HTMLElement, clientHeight = el.clientHeight): boolean {
  return el.scrollHeight - el.scrollTop - clientHeight < STICK_THRESHOLD
}

// 한 줄(truncate) 요소가 잘리는지 직접 잰다 — CSS 만으로 말줄임 발생을 감지하는 표준이 없다 (KAN-373)
// 창 크기·회전·확대/축소·lg 프레임 변화는 요소 폭 변화(ResizeObserver)로, 내용 변경은 text 로,
// 대체 폰트로 잰 뒤 웹폰트(Pretendard)가 늦게 붙는 경우는 fonts.ready 로 다시 잰다.
function useIsTruncated(ref: RefObject<HTMLElement | null>, text: string): boolean {
  const [isTruncated, setIsTruncated] = useState(false)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    let active = true
    const measure = () => {
      if (active) setIsTruncated(el.scrollWidth > el.clientWidth)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    // measure() 의 레이아웃이 트리거한 서브셋 폰트 로드까지 기다리도록 그 뒤에 ready 를 잡는다
    document.fonts.ready.then(measure)
    return () => {
      active = false
      observer.disconnect()
    }
  }, [ref, text])
  return isTruncated
}

function CenterPill({ children }: { children: ReactNode }) {
  return (
    <div className="my-3 flex justify-center px-6">
      <span className="rounded-full bg-tag-bg px-3 py-1 text-center text-xs text-tag-text whitespace-pre-wrap break-words">{children}</span>
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
  const noticeRulerRef = useRef<HTMLSpanElement>(null)

  const room = roomQuery.data
  const roomErrorCode = getApiErrorCode(roomQuery.error)
  const isRedirecting = roomErrorCode === 'CHAT_NOT_MEMBER' || getApiErrorStatus(roomQuery.error) === 404
  // 문의방을 회원이 볼 때 관리자는 "와썹하우스"로 보인다(BE 메시지 스냅샷). 멤버 닉네임은 실명일 수 있어 쓰지 않는다.
  const isHouseSender = room?.type === 'INQUIRY' && !isAdmin
  // 메시지의 sender.nickname 은 조회 시점 스냅샷이라 옛 페이지와 새 메시지가 다를 수 있다 → 방 상세의 현재 닉네임 우선 (KAN-364)
  const memberNicknames = useMemo(() => new Map(room?.members.map((m) => [m.userId, m.nickname] as const)), [room])
  const noticeText = room?.notice ? getMessagePreview(room.notice, t) : ''
  const isNoticeTruncated = useIsTruncated(noticeRulerRef, noticeText)
  // 펼친 채로 넓어져 한 줄에 들어오면 접힘으로 되돌린다 (다시 좁아져도 저절로 펼쳐지지 않게 상태를 비움)
  if (isNoticeExpanded && !isNoticeTruncated) setIsNoticeExpanded(false)

  // 서버 페이지는 최신 페이지가 앞, 페이지 안은 오래된 → 최신 순
  const messages = messagesQuery.data ? [...messagesQuery.data.pages].reverse().flat() : []
  const outboxById = new Map(outbox.map((item) => [item.tempId, item]))
  const allMessages: ChatMessage[] = [
    ...messages,
    ...outbox.map((item) => ({
      id: item.tempId,
      roomId,
      sender: { id: userId ?? '', nickname, admin: isAdmin },
      type: item.type,
      // IMAGE 는 로컬 미리보기 object URL
      content: item.type === 'TEXT' ? item.content : null,
      imageUrl: item.type === 'IMAGE' ? item.content : null,
      systemKind: null,
      systemParams: null,
      linkPreview: null,
      reactions: [],
      unreadCount: 0,
      edited: false,
      deleted: false,
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

  // 키보드 개폐 등으로 목록 높이가 바뀌면, 바뀌기 직전 높이 기준으로 맨 아래 근처였을 때만 다시 맨 아래로 (KAN-363)
  // stickToBottomRef 는 리사이즈 직후 도착한 scroll 이벤트가 새 높이로 다시 계산해 false 로 만들 수 있어 직전 높이로 판정한다.
  // 늘어날 때(키보드 닫힘)는 브라우저가 scrollTop 을 새 최대값으로 깎아 이미 맨 아래가 유지된다.
  useEffect(() => {
    const el = listRef.current
    if (!el) return
    let prevHeight = el.clientHeight
    const observer = new ResizeObserver(() => {
      if (isNearBottom(el, prevHeight)) el.scrollTop = el.scrollHeight
      prevHeight = el.clientHeight
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const handleScroll = () => {
    const el = listRef.current
    if (!el) return
    stickToBottomRef.current = isNearBottom(el)
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
    const isMine = message.sender?.id === userId
    const actions: ChatSheetAction[] = []
    const text = message.type === 'TEXT' ? message.content : null
    if (text) actions.push({ key: 'copy', label: t('actions.copy'), onSelect: () => copyText(text) })
    if (isMine && text !== null) {
      actions.push({ key: 'edit', label: t('actions.edit'), onSelect: () => setDialog({ kind: 'edit', message }) })
    }
    if (isAdmin) {
      const isNotice = room?.notice?.id === message.id
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
    const isMine = !!pending || (!!userId && message.sender?.id === userId)
    const isDeleted = message.deleted
    const hideTime = isSameRun(message, next) && !!next && dayjs(message.createdAt).isSame(next.createdAt, 'minute')
    const memberName = isHouseSender ? undefined : memberNicknames.get(message.sender?.id ?? '')

    return (
      <ChatMessageBubble
        isMine={isMine}
        showProfile={!isSameRun(prev, message)}
        senderName={memberName ?? message.sender?.nickname ?? t('withdrawn')}
        isHouseSender={isHouseSender}
        type={message.type === 'IMAGE' ? 'IMAGE' : 'TEXT'}
        content={message.type === 'IMAGE' ? message.imageUrl : message.content}
        isDeleted={isDeleted}
        isEdited={message.edited}
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
    // 모바일은 fixed 로 뷰포트에 고정해 문서 스크롤(키보드 개폐 후 잔존 오프셋)과 무관하게 한다.
    // iOS Safari 는 interactive-widget 미지원이라 키보드가 레이아웃 뷰포트를 줄이지 않는데, fixed 가 그 완화책이다. (KAN-363)
    // md↑는 430px 컬럼(.mobile-layout) 안에 기존처럼 흐름 배치, lg↑는 데스크탑 목업 프레임을 채운다.
    <div className="fixed inset-0 z-40 flex flex-col bg-card md:static md:h-dvh lg:h-full">
      <header className="flex h-14 shrink-0 items-center gap-1 border-b border-tag-bg bg-card px-1">
        <button
          type="button"
          onClick={handleBack}
          className="flex h-10 w-10 shrink-0 items-center justify-center text-foreground transition-transform duration-150 ease-out active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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
          className="flex h-10 w-10 shrink-0 items-center justify-center text-foreground disabled:opacity-40 transition-transform duration-150 ease-out active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label={t('room.openMembers')}
        >
          <Menu size={20} />
        </button>
      </header>

      {room?.notice && (
        <div className="shrink-0 bg-card px-3 pt-2">
          <div className="flex items-start gap-2 rounded-[12px] border border-tag-bg bg-background px-3 py-2">
            <Megaphone size={16} className="mt-0.5 shrink-0 text-primary" />
            <div className="relative flex min-w-0 flex-1 items-start gap-2">
              {/* 잘림 판정용 보이지 않는 사본: 한 줄에 다 보일 때의 배치(관리자는 '해제' 포함)를 펼침·버튼 유무와 상관없이 유지한다.
                  보이는 텍스트를 재면 펼칠 때 truncate 가 풀리고, 오른쪽 버튼이 바뀌며 폭이 달라져 판정이 흔들린다. */}
              <div aria-hidden className="invisible absolute inset-x-0 top-0 flex gap-2">
                <span ref={noticeRulerRef} className="min-w-0 flex-1 truncate text-sm">
                  {noticeText}
                </span>
                {isAdmin && <span className="shrink-0 text-xs font-semibold">{t('room.noticeClear')}</span>}
              </div>
              {isNoticeTruncated ? (
                <button
                  type="button"
                  onClick={() => setIsNoticeExpanded((v) => !v)}
                  aria-expanded={isNoticeExpanded}
                  className={`min-w-0 flex-1 text-left text-sm text-foreground ${
                    isNoticeExpanded ? 'whitespace-pre-wrap break-words' : 'truncate'
                  }`}
                >
                  {noticeText}
                </button>
              ) : (
                <p className="min-w-0 flex-1 truncate text-sm text-foreground">{noticeText}</p>
              )}
              {isAdmin && (isNoticeExpanded || !isNoticeTruncated) && (
                <button
                  type="button"
                  onClick={() => handleNotice(null)}
                  disabled={setNotice.isPending}
                  className="shrink-0 text-xs font-semibold text-primary disabled:opacity-50"
                >
                  {t('room.noticeClear')}
                </button>
              )}
              {isNoticeTruncated && (
                <button
                  type="button"
                  onClick={() => setIsNoticeExpanded((v) => !v)}
                  className="shrink-0 text-tag-text"
                  aria-label={t('room.noticeToggle')}
                >
                  <ChevronDown size={16} className={isNoticeExpanded ? 'rotate-180' : ''} />
                </button>
              )}
            </div>
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
        disabledReason={
          !room || room.permissions.canSend ? null : t(room.permissions.muted ? 'room.muted' : 'room.cannotSend')
        }
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
            className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center text-white transition-transform duration-150 ease-out active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label={tCommon('close')}
          >
            <X size={24} />
          </button>
        </div>
      )}
    </div>
  )
}
