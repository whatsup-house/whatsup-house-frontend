'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { Home, User, Compass } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useRequireAuth } from '@/lib/hooks/useRequireAuth'
import { useMyProfile } from '@/lib/hooks/useAuth'
import { getAnimalEmoji } from '@/lib/utils/animalProfile'

// 게더링 상세(/gatherings/[id])에서만 숨긴다. 하단에 신청하기 스티키 바가 있기 때문.
// /apply, /apply/complete 등 하위 경로에는 바텀 네비를 노출한다.
const HIDDEN_PATTERNS = [/^\/gatherings\/[^/]+$/]

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

  if (HIDDEN_PATTERNS.some((pattern) => pattern.test(pathname))) {
    return null
  }

  const navItems = [
    { href: '/', icon: Home, label: t('tabs.home'), requireLogin: false },
    { href: '/gatherings', icon: Compass, label: t('tabs.gatherings'), requireLogin: false },
    { href: '/mypage', icon: User, label: t('tabs.my'), requireLogin: true },
  ]

  return (
    <nav className="sticky bottom-0 bg-card border-t border-tag-bg">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const isActive =
            item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href) || (item.href === '/mypage' && pathname === '/login')
          const Icon = item.icon

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
                {isLoggedIn ? (
                  <MyTabIcon avatarUrl={profile?.avatarUrl} animalType={profile?.animalType} />
                ) : (
                  <Icon size={20} />
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
