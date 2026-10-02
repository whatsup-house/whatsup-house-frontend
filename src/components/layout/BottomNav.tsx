'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { Home, User, Compass, MessageCircle, Circle } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useRequireAuth } from '@/lib/hooks/useRequireAuth'
import { useMyProfile } from '@/lib/hooks/useAuth'
import { useChatRooms } from '@/lib/hooks/useChat'
import { getAnimalEmoji } from '@/lib/utils/animalProfile'

// 게더링 상세(/gatherings/[id])에서만 숨긴다. 하단에 신청하기 스티키 바가 있기 때문.
// /apply, /apply/complete 등 일반 신청 하위 경로에는 바텀 네비를 노출한다.
// 채팅방(/chat/[id])은 하단 고정 입력창이 있어 숨긴다.
// 우연한 식탁 단계형 신청(/gatherings/[id]/apply/dining)은 하단 고정 단계 이동 바가 있어 숨긴다. (KAN-389)
const HIDDEN_PATTERNS = [/^\/gatherings\/[^/]+$/, /^\/chat\/[^/]+$/, /^\/gatherings\/[^/]+\/apply\/dining$/]

function isValidImageSrc(url: string): boolean {
  return url.startsWith('/') || url.startsWith('http://') || url.startsWith('https://')
}

function MyTabIcon({ avatarUrl, animalType }: { avatarUrl?: string | null; animalType?: string | null }) {
  const t = useTranslations('nav')
  const validAvatarUrl = typeof avatarUrl === 'string' && avatarUrl.trim().length > 0 && isValidImageSrc(avatarUrl) ? avatarUrl : null
  if (validAvatarUrl) {
    return (
      <Image
        src={validAvatarUrl}
        alt={t('profileAlt')}
        width={24}
        height={24}
        className="rounded-full object-cover"
      />
    )
  }
  if (animalType) {
    return <span className="text-lg leading-none">{getAnimalEmoji(animalType)}</span>
  }
  return <User size={20} />
}

export default function BottomNav() {
  const t = useTranslations('nav')
  const pathname = usePathname()
  const router = useRouter()
  const { isLoggedIn, isInitialized, requireAuth } = useRequireAuth()
  const { data: profile } = useMyProfile()
  const { data: rooms, isError } = useChatRooms()

  if (HIDDEN_PATTERNS.some((pattern) => pattern.test(pathname))) {
    return null
  }

  // 조회 실패·비로그인이면 0 → 배지 숨김
  const unreadTotal = isLoggedIn && !isError ? (rooms ?? []).reduce((sum, room) => sum + room.unreadCount, 0) : 0

  // null = 가운데 빈칸
  const navItems = [
    { href: '/gatherings', icon: Compass, label: t('tabs.gatherings'), requireLogin: false },
    null,
    { href: '/', icon: Home, label: t('tabs.home'), requireLogin: false },
    { href: '/chat', icon: MessageCircle, label: t('tabs.chat'), requireLogin: true },
    { href: '/mypage', icon: User, label: t('tabs.my'), requireLogin: true },
  ]

  // z-40: 페이지 콘텐츠·TopNav(z-30) 위, 모달·바텀시트(z-50)·토스트(z-[100]) 아래. (KAN-368)
  return (
    <nav className="sticky bottom-0 z-40 bg-card border-t border-tag-bg pb-[env(safe-area-inset-bottom)]">
      <div className="grid grid-cols-5 items-center h-16">
        {navItems.map((item, index) => {
          if (!item) {
            return (
              <div key={`blank-${index}`} aria-hidden="true" className="flex flex-col items-center gap-1 text-xs text-tag-text/40">
                <Circle size={20} />
                <span className="h-4" />
              </div>
            )
          }

          const isActive =
            item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href) || (item.href === '/mypage' && pathname === '/login')
          const Icon = item.icon

          // 가운데 홈: 라벨 없이 primary 원(52px)으로 강조하고 상단선 위로 살짝 띄운다. 현재 화면이면 ring. (KAN-369)
          // 튀어나온 부분도 nav(z-40) 스태킹 안이라 콘텐츠에 가리지 않고, lg 프레임(overflow-hidden) 안쪽이라 잘리지 않는다.
          if (item.href === '/') {
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
                className={`flex size-13 -translate-y-3 items-center justify-center justify-self-center rounded-full bg-primary text-white shadow-md ${
                  isActive ? 'ring-2 ring-primary ring-offset-2 ring-offset-card' : ''
                }`}
              >
                <Icon size={24} />
              </Link>
            )
          }

          if (item.requireLogin) {
            return (
              <button
                key={item.href}
                onClick={() => {
                  if (requireAuth(item.href)) router.push(item.href)
                }}
                disabled={!isInitialized}
                className={`flex flex-col items-center gap-1 text-xs ${
                  isActive ? 'text-primary' : 'text-tag-text'
                } disabled:opacity-60`}
              >
                {item.href === '/mypage' && isLoggedIn ? (
                  <MyTabIcon avatarUrl={profile?.avatarUrl} animalType={profile?.animalType} />
                ) : (
                  <span className="relative">
                    <Icon size={20} />
                    {item.href === '/chat' && unreadTotal > 0 && (
                      <span className="absolute -top-1.5 -right-2.5 min-w-[18px] rounded-full bg-primary px-1 text-center text-[10px] font-bold leading-[18px] text-white">
                        {unreadTotal > 99 ? '99+' : unreadTotal}
                      </span>
                    )}
                  </span>
                )}
                <span>{item.label}</span>
              </button>
            )
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 text-xs ${
                isActive ? 'text-primary' : 'text-tag-text'
              }`}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
