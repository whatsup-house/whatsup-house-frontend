'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  LayoutDashboard, CalendarDays, MapPin, Users, LogOut, ClipboardList, Home, Utensils, FileText, Mail, Menu, X,
  Ticket,
} from 'lucide-react'
import { useAuthStore } from '@/lib/store/authStore'
import { useLogout } from '@/lib/hooks/useAuth'

const sidebarItems = [
  { href: '/admin', icon: LayoutDashboard, label: '대시보드', exact: true },
  { href: '/admin/gatherings', icon: CalendarDays, label: '게더링 관리' },
  { href: '/admin/home', icon: Home, label: '홈화면 관리' },
  { href: '/admin/applications', icon: ClipboardList, label: '참가자 관리' },
  { href: '/admin/forms', icon: FileText, label: '신청폼 관리' },
  { href: '/admin/matching', icon: Utensils, label: '우연한 식탁 매칭' },
  { href: '/admin/tickets', icon: Ticket, label: '이용권 설정' },
  { href: '/admin/locations', icon: MapPin, label: '장소 관리' },
  { href: '/admin/users', icon: Users, label: '회원 관리' },
  { href: '/admin/email-templates', icon: Mail, label: '메일 템플릿 관리' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { isLoggedIn, isAdmin, nickname, isInitialized } = useAuthStore()
  const logoutMutation = useLogout()
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  useEffect(() => {
    if (!isInitialized) return
    if (!isLoggedIn) router.replace('/login?returnUrl=/admin')
    else if (!isAdmin) router.replace('/')
  }, [isInitialized, isLoggedIn, isAdmin, router])

  if (!isInitialized || !isLoggedIn || !isAdmin) return null

  const renderNav = (onNavigate?: () => void) => (
    <nav className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto">
      {sidebarItems.map((item) => {
        const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href)
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-input text-sm transition-colors ${
              isActive
                ? 'bg-primary text-white font-semibold'
                : 'text-white/60 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Icon size={18} />
            <span>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )

  const renderProfileActions = () => (
    <div className="px-3 py-4 border-t border-white/10">
      <div className="flex items-center gap-3 px-3 py-2 mb-1">
        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
          <span className="text-primary text-xs font-bold">
            {nickname ? nickname[0] : 'A'}
          </span>
        </div>
        <span className="text-sm text-white/80 font-medium truncate">{nickname ?? '관리자'}</span>
      </div>
      <Link
        href="/"
        className="mb-1 flex items-center gap-3 w-full px-3 py-2.5 rounded-input text-sm text-white/50 hover:bg-white/10 hover:text-white transition-colors"
      >
        <Home size={18} />
        <span>서비스 홈으로</span>
      </Link>
      <button
        onClick={() => logoutMutation.mutate()}
        className="flex items-center gap-3 w-full px-3 py-2.5 rounded-input text-sm text-white/50 hover:bg-white/10 hover:text-white transition-colors"
      >
        <LogOut size={18} />
        <span>로그아웃</span>
      </button>
    </div>
  )

  return (
    <div className="flex min-h-screen bg-background">
      {/* 데스크탑 사이드바 */}
      <aside className="hidden lg:flex w-60 bg-foreground flex-col min-h-screen shrink-0">
        {/* 로고 */}
        <div className="px-5 py-6 border-b border-white/10">
          <h1 className="text-sm font-bold text-white/60 uppercase tracking-widest">The Curator&apos;s</h1>
          <h2 className="text-lg font-bold text-primary">House</h2>
        </div>

        {/* 네비게이션 */}
        {renderNav()}

        {/* 하단 프로필 + 로그아웃 */}
        {renderProfileActions()}
      </aside>

      {/* 모바일 상단바 + 드로어 */}
      <div className="lg:hidden fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-tag-bg bg-card px-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-tag-text">The Curator&apos;s</p>
          <p className="text-sm font-bold text-primary leading-tight">House Admin</p>
        </div>
        <button
          type="button"
          onClick={() => setIsDrawerOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-input border border-tag-bg text-foreground"
          aria-label="관리자 메뉴 열기"
        >
          <Menu size={20} />
        </button>
      </div>

      {isDrawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setIsDrawerOpen(false)} />
          <aside className="relative flex h-full w-[min(82vw,320px)] flex-col bg-foreground shadow-2xl">
            <div className="flex items-center justify-between px-5 py-5 border-b border-white/10">
              <div>
                <h1 className="text-sm font-bold text-white/60 uppercase tracking-widest">The Curator&apos;s</h1>
                <h2 className="text-lg font-bold text-primary">House</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-input text-white/70 hover:bg-white/10 hover:text-white"
                aria-label="관리자 메뉴 닫기"
              >
                <X size={20} />
              </button>
            </div>
            {renderNav(() => setIsDrawerOpen(false))}
            {renderProfileActions()}
          </aside>
        </div>
      )}

      {/* 콘텐츠 */}
      <main className="flex-1 min-w-0 pt-20 px-4 pb-6 sm:px-6 lg:p-8">{children}</main>
    </div>
  )
}
