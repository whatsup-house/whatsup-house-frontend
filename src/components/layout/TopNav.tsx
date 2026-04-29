'use client'

import { usePathname, useRouter } from 'next/navigation'
import { ArrowLeft, Bell } from 'lucide-react'
import { useNavigationStore } from '@/lib/store/navigationStore'

const HIDDEN_PATTERNS = [/^\/gatherings\/[^/]+/]

const PAGE_TITLES: Record<string, string> = {
  '/': '와썹하우스',
  '/gatherings': '게더링',
  '/social': '소셜',
  '/mypage': '마이페이지',
  '/login': '로그인',
  '/register': '회원가입',
  '/onboarding': '온보딩',
}

function getTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname]
  if (pathname.endsWith('/apply/complete')) return '신청 완료'
  if (pathname.endsWith('/apply')) return '신청하기'
  if (pathname.startsWith('/gatherings/')) return '게더링'
  return ''
}

export default function TopNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { stack, back } = useNavigationStore()

  if (HIDDEN_PATTERNS.some((pattern) => pattern.test(pathname))) {
    return null
  }

  const canGoBack = stack.length > 1
  const title = getTitle(pathname)

  const handleBack = () => {
    back()
    router.back()
  }

  return (
    <header className="sticky top-0 z-30">
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
        <button
          className="p-1 min-w-[36px] min-h-[36px] flex items-center justify-center text-foreground"
          aria-label="알림"
        >
          <Bell size={20} />
        </button>
      </div>
    </header>
  )
}
