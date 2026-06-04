import BottomNav from '@/components/layout/BottomNav'
import HomeAuthRedirect from '@/components/auth/HomeAuthRedirect'
import TopNav from '@/components/layout/TopNav'

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="mobile-layout flex flex-col min-h-screen">
      <HomeAuthRedirect />
      <TopNav />
      <main className="flex-1">{children}</main>
      <BottomNav />
    </div>
  )
}
