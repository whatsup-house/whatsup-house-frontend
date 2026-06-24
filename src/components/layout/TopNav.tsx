'use client'

import { usePathname } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useBackNavigation } from '@/lib/hooks/useBackNavigation'
import { useNavigationStore } from '@/lib/store/navigationStore'
import LanguageSwitcher from './LanguageSwitcher'
import NotificationBell from './NotificationBell'

const HIDDEN_PATTERNS: RegExp[] = []

const PAGE_TITLE_KEYS: Record<string, string> = {
  '/': 'home',
  '/gatherings': 'gatherings',
  '/reviews': 'reviews',
  '/social': 'social',
  '/mypage': 'mypage',
  '/mypage/mileage': 'mileage',
  '/applications/check': 'applicationCheck',
  '/login': 'login',
  '/register': 'register',
  '/onboarding': 'onboarding',
}

const ROOT_PATHS = new Set(['/', '/gatherings', '/mypage'])

function getTitleKey(pathname: string): string {
  if (PAGE_TITLE_KEYS[pathname]) return PAGE_TITLE_KEYS[pathname]
  if (pathname.endsWith('/apply/complete')) return 'applyComplete'
  if (pathname.endsWith('/apply')) return 'apply'
  if (pathname.startsWith('/gatherings/')) return 'gatherings'
  if (pathname.startsWith('/story/')) return 'story'
  return ''
}

function getFallbackPath(pathname: string): string {
  if (pathname === '/mypage/mileage') return '/mypage'
  if (pathname.startsWith('/gatherings/')) {
    const match = pathname.match(/^\/gatherings\/([^/]+)/)
    if (pathname.includes('/apply') && match) return `/gatherings/${match[1]}`
    return '/gatherings'
  }
  return '/'
}

export default function TopNav() {
  const t = useTranslations('nav')
  const tCommon = useTranslations('common')
  const pathname = usePathname()
  const stackLength = useNavigationStore((state) => state.stack.length)
  const handleBack = useBackNavigation(getFallbackPath(pathname))

  if (HIDDEN_PATTERNS.some((pattern) => pattern.test(pathname))) {
    return null
  }

  // 첫 진입 화면(루트 탭의 최초 진입)이 아니면 항상 뒤로가기를 노출한다.
  // - 앱 내 이동 기록이 있으면(stack > 1) 루트 탭이어도 노출 (홈→게더링 이동 등)
  // - 루트 탭이 아닌 화면은 딥링크 첫 진입이어도 노출 (fallback 경로로 이동)
  const canGoBack = stackLength > 1 || !ROOT_PATHS.has(pathname)
  const titleKey = getTitleKey(pathname)
  const title = titleKey ? t(`titles.${titleKey}`) : ''

  return (
    <header className="sticky top-0 z-30 bg-card/85 backdrop-blur-md border-b border-tag-bg">
      <div className="flex items-center justify-between h-14 px-4">
        <div className="flex items-center gap-1">
          {canGoBack && (
            <button
              onClick={handleBack}
              className="-ml-1 p-1 min-w-[36px] min-h-[36px] flex items-center justify-center text-foreground"
              aria-label={tCommon('back')}
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <span className="text-base font-bold text-foreground">{title}</span>
        </div>
        <div className="flex items-center gap-1">
          <LanguageSwitcher />
          <NotificationBell />
        </div>
      </div>
    </header>
  )
}
