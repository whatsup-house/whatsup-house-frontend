import BottomNav from '@/components/layout/BottomNav'
import HomeAuthRedirect from '@/components/auth/HomeAuthRedirect'
import TopNav from '@/components/layout/TopNav'
import DesktopBrandPanel from '@/components/layout/DesktopBrandPanel'

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="lg:mx-auto lg:flex lg:max-w-[1120px] lg:items-stretch">
      <DesktopBrandPanel />
      <div className="mobile-layout flex flex-col min-h-screen lg:mx-0">
        <HomeAuthRedirect />
        <TopNav />
        <main className="flex-1">{children}</main>
        <BottomNav />
      </div>
    </div>
  )
}
