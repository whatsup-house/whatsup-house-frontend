import type { ChatMessage } from '@/lib/api/types'

// useTranslations('chat') 의 t
type ChatTranslate = (key: string, values?: Record<string, string>) => string

export function getSystemMessageText(message: ChatMessage, t: ChatTranslate): string {
  return t(`system.${message.systemKind}`, { nickname: message.systemParams?.nickname ?? t('withdrawn') })
}

// 방 목록·공지 바에 쓰는 한 줄 요약
export function getMessagePreview(message: ChatMessage, t: ChatTranslate): string {
  if (message.deletedAt) return t('message.deleted')
  if (message.type === 'SYSTEM') return getSystemMessageText(message, t)
  if (message.type === 'IMAGE') return t('photo')
  return message.content ?? ''
}
