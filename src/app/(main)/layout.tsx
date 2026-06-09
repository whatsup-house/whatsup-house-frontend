import BottomNav from '@/components/layout/BottomNav'
import HomeAuthRedirect from '@/components/auth/HomeAuthRedirect'
import TopNav from '@/components/layout/TopNav'
import AppShell from '@/components/layout/AppShell'

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AppShell>
      <HomeAuthRedirect />
      <TopNav />
      <main className="flex-1 lg:min-h-0 lg:overflow-y-auto">{children}</main>
      <BottomNav />
    </AppShell>
  )
}
