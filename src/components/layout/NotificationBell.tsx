'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, X, CheckCircle, Gift, Heart, type LucideIcon } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { useAuthStore } from '@/lib/store/authStore'
import {
  useNotifications,
  useUnreadCount,
  useMarkNotificationRead,
  useDeleteNotification,
} from '@/lib/hooks/useNotifications'
import { formatLocalizedShortDate } from '@/lib/utils/date'
import type { NotificationItem, NotificationLink, NotificationType } from '@/lib/api/types'

// 유형별 이동 대상 라우트. (KAN-262)
const LINK_ROUTES: Record<NotificationLink, string> = {
  APPLICATIONS: '/mypage?tab=applications',
  MILEAGE: '/mypage/mileage',
  REVIEWS: '/mypage?tab=reviews',
}

const TYPE_ICON: Record<NotificationType, LucideIcon> = {
  PARTICIPATION_CONFIRMED: CheckCircle,
  MILEAGE_EARNED: Gift,
  REVIEW_LIKE_MILESTONE: Heart,
}

export default function NotificationBell() {
  const t = useTranslations('notifications')
  const locale = useLocale()
  const router = useRouter()
  const { isLoggedIn } = useAuthStore()
  const [open, setOpen] = useState(false)
  const { data: unread } = useUnreadCount()
  const { data: notifications, isLoading } = useNotifications(open)
  const markRead = useMarkNotificationRead()
  const removeNotification = useDeleteNotification()

  const unreadCount = unread?.unreadCount ?? 0

  // 모달 열림 동안 ESC 키 닫기 + body 스크롤 잠금. (KAN-303)
  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handleKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [open])

  const handleSelect = (item: NotificationItem) => {
    if (!item.isRead) markRead.mutate(item.id)
    setOpen(false)
    if (item.link) router.push(LINK_ROUTES[item.link])
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(true)}
        className="relative p-1 min-w-[36px] min-h-[36px] flex items-center justify-center text-foreground"
        aria-label={t('label')}
      >
        <Bell size={20} />
        {isLoggedIn && unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-primary text-white text-[10px] font-bold leading-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden="true" />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t('label')}
            className="absolute right-0 top-[calc(100%+10px)] z-[100] flex h-[54vh] min-h-[320px] max-h-[430px] w-[calc(100vw-32px)] max-w-[390px] flex-col overflow-visible rounded-card border border-tag-bg bg-background shadow-lg lg:h-[420px] lg:min-h-0"
            onClick={(e) => e.stopPropagation()}
          >
            <span
              className="absolute -top-2 right-4 h-4 w-4 rotate-45 bg-background border-l border-t border-tag-bg"
            />
            <div className="relative z-10 flex h-full flex-col overflow-hidden rounded-card bg-background">
              <div className="flex items-center justify-between px-5 py-4 border-b border-tag-bg">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-foreground">{t('label')}</h2>
                  {isLoggedIn && unreadCount > 0 && (
                    <span className="min-w-[20px] h-5 px-1.5 flex items-center justify-center rounded-full bg-primary text-white text-[11px] font-bold leading-none">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setOpen(false)}
                  aria-label={t('close')}
                  className="p-1 text-tag-text min-w-[36px] min-h-[36px] flex items-center justify-center rounded-full hover:bg-tag-bg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-3">
                {!isLoggedIn ? (
                  <EmptyMessage text={t('loginRequired')} />
                ) : isLoading ? (
                  <EmptyMessage text={t('loading')} />
                ) : !notifications || notifications.length === 0 ? (
                  <EmptyMessage text={t('empty')} />
                ) : (
                  <ul className="flex flex-col gap-2">
                    {notifications.map((item) => {
                      const Icon = TYPE_ICON[item.type] ?? Bell
                      return (
                        <li key={item.id}>
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => handleSelect(item)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault()
                                handleSelect(item)
                              }
                            }}
                            className={`relative flex gap-3 rounded-card border p-4 cursor-pointer transition-colors ${
                              item.isRead ? 'bg-card border-tag-bg/50' : 'bg-primary-light border-primary/20'
                            }`}
                          >
                            <div className="w-9 h-9 rounded-full bg-tag-bg flex items-center justify-center shrink-0">
                              <Icon size={18} className="text-primary" />
                            </div>
                            <div className="flex-1 min-w-0 pr-6">
                              <p className="text-sm font-semibold text-foreground">{item.title}</p>
                              {item.content && (
                                <p className="text-sm text-tag-text mt-0.5 break-keep">{item.content}</p>
                              )}
                              <p className="text-xs text-tag-text mt-1.5">{formatLocalizedShortDate(item.createdAt, locale)}</p>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                removeNotification.mutate(item.id)
                              }}
                              aria-label={t('delete')}
                              className="absolute top-2 right-2 p-1 text-tag-text min-w-[32px] min-h-[32px] flex items-center justify-center"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function EmptyMessage({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6">
      <div className="w-14 h-14 rounded-full bg-tag-bg flex items-center justify-center">
        <Bell size={26} className="text-tag-text" />
      </div>
      <p className="text-sm text-tag-text break-keep">{text}</p>
    </div>
  )
}
