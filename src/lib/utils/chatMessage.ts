import type { ChatLastMessage, ChatMessage } from '@/lib/api/types'

// useTranslations('chat') 의 t
type ChatTranslate = (key: string, values?: Record<string, string | number>) => string

// 방 안 메시지(ChatMessage)와 목록 미리보기(ChatLastMessage) 둘 다 받는다
type ChatMessageLike = ChatMessage | ChatLastMessage

// SYSTEM_NOTICE 는 서버 안내문(text)을 그대로, 나머지는 nicknames 를 ", " 로 이어 번역 문구에 넣는다
export function getSystemMessageText(message: ChatMessageLike, t: ChatTranslate): string {
  const params = message.systemParams
  if (message.systemKind === 'SYSTEM_NOTICE') return params?.text ?? ''
  const nicknames = params?.nicknames?.length ? params.nicknames.map((n) => n ?? t('withdrawn')) : [t('withdrawn')]
  return t(`system.${message.systemKind}`, { nicknames: nicknames.join(', '), count: nicknames.length })
}

// 방 목록·공지 바에 쓰는 한 줄 요약
export function getMessagePreview(message: ChatMessageLike, t: ChatTranslate): string {
  if (message.deleted) return t('message.deleted')
  if (message.type === 'SYSTEM') return getSystemMessageText(message, t)
  if (message.type === 'IMAGE') return t('photo')
  return message.content ?? ''
}
