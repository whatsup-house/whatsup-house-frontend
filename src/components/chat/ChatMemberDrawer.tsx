import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { ChatMember } from '@/lib/api/types'
import ChatAvatar from './ChatAvatar'

interface ChatMemberDrawerProps {
  members: ChatMember[]
  myUserId: string | null
  // 관리자 화면 전용: 멤버 행 오른쪽 액션, 목록 아래 영역
  renderMemberActions?: (member: ChatMember) => ReactNode
  footer?: ReactNode
  onClose: () => void
}

export default function ChatMemberDrawer({ members, myUserId, renderMemberActions, footer, onClose }: ChatMemberDrawerProps) {
  const t = useTranslations('chat')
  const tCommon = useTranslations('common')

  return (
    <div className="fixed lg:absolute inset-0 z-50" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative mx-auto flex h-full w-full justify-end md:max-w-[430px]">
        <aside
          role="dialog"
          aria-modal="true"
          aria-label={t('room.members')}
          className="flex h-full w-[78%] max-w-[320px] flex-col bg-card"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-tag-bg pl-4 pr-2">
            <h2 className="text-base font-bold text-foreground">
              {t('room.members')} <span className="font-normal text-tag-text">{members.length}</span>
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center text-tag-text transition-transform duration-150 ease-out active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label={tCommon('close')}
            >
              <X size={20} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <ul className="py-2">
              {members.map((member) => {
                const name = member.nickname ?? t('withdrawn')
                return (
                  <li key={member.userId} className="flex items-center gap-3 px-4 py-2">
                    <ChatAvatar name={name} avatarUrl={null} size="sm" />
                    <span className="min-w-0 truncate text-sm text-foreground">{name}</span>
                    {member.userId === myUserId && (
                      <span className="shrink-0 rounded-full bg-tag-bg px-1.5 py-0.5 text-xs text-tag-text">
                        {t('room.me')}
                      </span>
                    )}
                    {renderMemberActions && <div className="ml-auto shrink-0">{renderMemberActions(member)}</div>}
                  </li>
                )
              })}
            </ul>
            {footer}
          </div>
        </aside>
      </div>
    </div>
  )
}
