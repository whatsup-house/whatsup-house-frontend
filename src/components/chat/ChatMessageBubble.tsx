'use client'

import { RotateCw, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useLongPress } from '@/lib/hooks/useLongPress'
import type { ChatLinkPreview, ChatReaction } from '@/lib/api/types'
import ChatAvatar from './ChatAvatar'

interface ChatMessageBubbleProps {
  isMine: boolean
  // 상대 메시지 연속 묶음의 첫 번째만 아바타·닉네임을 보여준다
  showProfile: boolean
  senderName: string
  senderAvatarUrl: string | null
  isHouseSender: boolean
  type: 'TEXT' | 'IMAGE'
  content: string | null
  isDeleted: boolean
  isEdited: boolean
  // 같은 사람이 같은 분에 연달아 보낸 경우 마지막 메시지에만 시간을 붙인다
  time: string | null
  unreadCount: number
  linkPreview: ChatLinkPreview | null
  reactions: ChatReaction[]
  status: 'sent' | 'sending' | 'failed'
  onLongPress: (() => void) | null
  onToggleReaction: (emoji: string) => void
  onOpenImage: (url: string) => void
  onRetry: () => void
  onDiscard: () => void
}

const isHttpUrl = (url: string) => /^https?:\/\//i.test(url)

export default function ChatMessageBubble({
  isMine,
  showProfile,
  senderName,
  senderAvatarUrl,
  isHouseSender,
  type,
  content,
  isDeleted,
  isEdited,
  time,
  unreadCount,
  linkPreview,
  reactions,
  status,
  onLongPress,
  onToggleReaction,
  onOpenImage,
  onRetry,
  onDiscard,
}: ChatMessageBubbleProps) {
  const t = useTranslations('chat.message')
  const longPress = useLongPress(() => onLongPress?.())

  const bubbleTone = isDeleted
    ? 'bg-tag-bg text-foreground/40'
    : isMine
      ? 'bg-tag-text text-background'
      : 'bg-background text-tag-text'

  let body
  if (isDeleted) {
    body = <p className="px-3 py-2 text-[14px]">{t('deleted')}</p>
  } else if (type === 'IMAGE' && content) {
    body = (
      <button type="button" onClick={() => onOpenImage(content)} className="block">
        {/* eslint-disable-next-line @next/next/no-img-element -- 서명 URL·로컬 blob 미리보기라 next/image 최적화를 거치지 않는다 */}
        <img src={content} alt={t('imageAlt')} className="block h-60 w-60 max-w-full object-cover" />
      </button>
    )
  } else {
    body = <p className="whitespace-pre-wrap break-words px-3 py-2 text-[15px] leading-5">{content}</p>
  }

  return (
    <div className={`flex gap-2 px-3 ${isMine ? 'justify-end' : 'justify-start'} ${showProfile ? 'mt-3' : 'mt-1'}`}>
      {!isMine &&
        (showProfile ? (
          <ChatAvatar name={senderName} avatarUrl={senderAvatarUrl} isHouse={isHouseSender} size="sm" />
        ) : (
          <div className="w-9 shrink-0" />
        ))}
      <div className={`flex min-w-0 max-w-[78%] flex-col ${isMine ? 'items-end' : 'items-start'}`}>
        {!isMine && showProfile && <span className="mb-1 text-xs text-tag-text">{senderName}</span>}
        <div className={`flex max-w-full items-end gap-1 ${isMine ? 'flex-row-reverse' : ''}`}>
          <div
            {...(onLongPress ? longPress : {})}
            className={`min-w-0 select-none overflow-hidden rounded-[12px] [-webkit-touch-callout:none] ${bubbleTone} ${
              status === 'sending' ? 'opacity-50' : ''
            }`}
          >
            {body}
          </div>
          <div className={`flex shrink-0 flex-col text-[10px] leading-tight ${isMine ? 'items-end' : 'items-start'}`}>
            {status === 'failed' ? (
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={onRetry}
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-tag-bg text-primary"
                  aria-label={t('retry')}
                >
                  <RotateCw size={12} />
                </button>
                <button
                  type="button"
                  onClick={onDiscard}
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-tag-bg text-tag-text"
                  aria-label={t('discard')}
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <>
                {unreadCount > 0 && (
                  <span className="font-bold text-primary" aria-label={t('unread', { count: unreadCount })}>
                    {unreadCount}
                  </span>
                )}
                {isEdited && !isDeleted && <span className="text-tag-text/70">{t('edited')}</span>}
                {time && <span className="text-tag-text/70">{time}</span>}
              </>
            )}
          </div>
        </div>
        {status === 'failed' && <span className="mt-0.5 text-[10px] text-primary">{t('failed')}</span>}
        {linkPreview && !isDeleted && isHttpUrl(linkPreview.url) && (
          <a
            href={linkPreview.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 block w-60 max-w-full overflow-hidden rounded-[12px] border border-tag-bg bg-card"
          >
            {linkPreview.image && isHttpUrl(linkPreview.image) && (
              // eslint-disable-next-line @next/next/no-img-element -- 외부 OG 이미지
              <img src={linkPreview.image} alt="" className="block h-32 w-full object-cover" />
            )}
            <div className="px-3 py-2">
              <p className="line-clamp-1 text-sm font-semibold text-foreground">{linkPreview.title ?? linkPreview.url}</p>
              {linkPreview.description && (
                <p className="mt-0.5 line-clamp-2 text-xs text-tag-text">{linkPreview.description}</p>
              )}
            </div>
          </a>
        )}
        {reactions.length > 0 && !isDeleted && (
          <div className={`mt-1 flex flex-wrap gap-1 ${isMine ? 'justify-end' : ''}`}>
            {reactions.map((reaction) => (
              <button
                key={reaction.emoji}
                type="button"
                onClick={() => onToggleReaction(reaction.emoji)}
                aria-pressed={reaction.reactedByMe}
                className={`flex items-center gap-0.5 rounded-full border bg-card px-2 py-0.5 text-xs ${
                  reaction.reactedByMe ? 'border-primary text-primary' : 'border-tag-bg text-tag-text'
                }`}
              >
                <span>{reaction.emoji}</span>
                <span>{reaction.count}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
