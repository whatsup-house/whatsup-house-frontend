import TopNav from '@/components/layout/TopNav'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mobile-layout min-h-screen bg-background">
      <TopNav />
      {children}
    </div>
  )
}
