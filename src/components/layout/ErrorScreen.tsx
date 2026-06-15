import AppShell from '@/components/layout/AppShell'
import TopNav from '@/components/layout/TopNav'
import BottomNav from '@/components/layout/BottomNav'
import ErrorView from '@/components/layout/ErrorView'

interface ErrorScreenProps {
  code?: string
  title: string
  description: string
  onRetry?: () => void
  showBack?: boolean
  showHome?: boolean
}

// 그룹 레이아웃 밖(루트)의 not-found/error를 앱 셸(모바일 카드 + 헤더 + 바텀내비)
// 안에 렌더한다. 그룹(main/auth/admin) 에러는 각 레이아웃이 이미 셸을 제공한다. (KAN-248)
export default function ErrorScreen(props: ErrorScreenProps) {
  return (
    <AppShell>
      <TopNav />
      <main className="flex-1 lg:min-h-0 lg:overflow-y-auto">
        <ErrorView {...props} />
      </main>
      <BottomNav />
    </AppShell>
  )
}
