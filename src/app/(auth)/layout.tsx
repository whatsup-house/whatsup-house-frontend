'use client'

import { usePathname } from 'next/navigation'
import AppShell from '@/components/layout/AppShell'
import BottomNav from '@/components/layout/BottomNav'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  // /welcome은 자체 풀스크린 랜딩이라 데스크탑 셸에서 제외한다.
  if (pathname === '/welcome') {
    return <div className="mobile-layout min-h-screen bg-background">{children}</div>
  }

  return (
    <AppShell>
      <div className="flex-1 lg:min-h-0 lg:overflow-y-auto">{children}</div>
      {pathname === '/login' && <BottomNav />}
    </AppShell>
  )
}
