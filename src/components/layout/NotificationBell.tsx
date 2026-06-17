'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, X, CheckCircle, Gift, Heart, type LucideIcon } from 'lucide-react'
import { useAuthStore } from '@/lib/store/authStore'
import {
  useNotifications,
  useUnreadCount,
  useMarkNotificationRead,
  useDeleteNotification,
} from '@/lib/hooks/useNotifications'
import { formatKoreanShortDate } from '@/lib/utils/date'
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
  const router = useRouter()
  const { isLoggedIn } = useAuthStore()
  const [open, setOpen] = useState(false)
  const { data: unread } = useUnreadCount()
  const { data: notifications, isLoading } = useNotifications(open)
  const markRead = useMarkNotificationRead()
  const removeNotification = useDeleteNotification()

  const unreadCount = unread?.unreadCount ?? 0

  const handleSelect = (item: NotificationItem) => {
    if (!item.isRead) markRead.mutate(item.id)
    setOpen(false)
    if (item.link) router.push(LINK_ROUTES[item.link])
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative p-1 min-w-[36px] min-h-[36px] flex items-center justify-center text-foreground"
        aria-label="알림"
      >
        <Bell size={20} />
        {isLoggedIn && unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-primary text-white text-[10px] font-bold leading-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-[90vw] max-w-[420px] h-[70vh] bg-background rounded-card shadow-lg flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-tag-bg">
              <h2 className="text-base font-bold text-foreground">알림</h2>
              <button
                onClick={() => setOpen(false)}
                aria-label="닫기"
                className="p-1 text-tag-text min-w-[36px] min-h-[36px] flex items-center justify-center"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3">
              {!isLoggedIn ? (
                <EmptyMessage text="로그인 후 알림을 확인할 수 있어요." />
              ) : isLoading ? (
                <EmptyMessage text="불러오는 중..." />
              ) : !notifications || notifications.length === 0 ? (
                <EmptyMessage text="새로운 알림이 없어요." />
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
                            <p className="text-xs text-tag-text mt-1.5">{formatKoreanShortDate(item.createdAt)}</p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              removeNotification.mutate(item.id)
                            }}
                            aria-label="알림 삭제"
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
      )}
    </>
  )
}

function EmptyMessage({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center h-full">
      <p className="text-sm text-tag-text">{text}</p>
    </div>
  )
}
