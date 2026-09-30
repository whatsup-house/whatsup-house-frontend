'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const LINKS = [
  { href: '/admin/chat', label: '채팅방' },
  { href: '/admin/chat/reports', label: '신고' },
  { href: '/admin/chat/mutes', label: '채팅 금지' },
]

interface AdminChatNavProps {
  title: string
}

// 채팅 관리 하위 페이지 공통 헤더 + 이동 탭
export default function AdminChatNav({ title }: AdminChatNavProps) {
  const pathname = usePathname()
  return (
    <div className="mb-5">
      <h1 className="mb-3 text-[22px] font-bold text-foreground">{title}</h1>
      <nav className="flex gap-1 border-b border-tag-bg">
        {LINKS.map((link) => {
          const isActive = pathname === link.href
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`-mb-px border-b-2 px-3 py-2 text-sm ${
                isActive ? 'border-primary font-semibold text-primary' : 'border-transparent text-tag-text'
              }`}
            >
              {link.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
