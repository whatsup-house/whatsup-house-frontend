'use client'

import { usePathname } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { useBackNavigation } from '@/lib/hooks/useBackNavigation'
import NotificationBell from './NotificationBell'

const HIDDEN_PATTERNS: RegExp[] = []

const PAGE_TITLES: Record<string, string> = {
  '/': '와썹하우스',
  '/gatherings': '게더링',
  '/reviews': '다녀온 사람들의 후기',
  '/social': '소셜',
  '/mypage': '마이페이지',
  '/mypage/mileage': '마일리지',
  '/applications/check': '신청 내역 조회',
  '/login': '로그인',
  '/register': '회원가입',
  '/onboarding': '온보딩',
}

const ROOT_PATHS = new Set(['/', '/gatherings', '/mypage'])

function getTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname]
  if (pathname.endsWith('/apply/complete')) return '신청 완료'
  if (pathname.endsWith('/apply')) return '신청하기'
  if (pathname.startsWith('/gatherings/')) return '게더링'
  if (pathname.startsWith('/story/')) return '소개'
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
  const pathname = usePathname()
  const handleBack = useBackNavigation(getFallbackPath(pathname))

  if (HIDDEN_PATTERNS.some((pattern) => pattern.test(pathname))) {
    return null
  }

  const canGoBack = !ROOT_PATHS.has(pathname)
  const title = getTitle(pathname)

  return (
    <header className="sticky top-0 z-30 bg-card/85 backdrop-blur-md border-b border-tag-bg">
      <div className="flex items-center justify-between h-14 px-4">
        <div className="flex items-center gap-1">
          {canGoBack && (
            <button
              onClick={handleBack}
              className="-ml-1 p-1 min-w-[36px] min-h-[36px] flex items-center justify-center text-foreground"
              aria-label="뒤로가기"
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <span className="text-base font-bold text-foreground">{title}</span>
        </div>
        <NotificationBell />
      </div>
    </header>
  )
}
