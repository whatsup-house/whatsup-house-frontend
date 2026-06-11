'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import dayjs from 'dayjs'
import 'dayjs/locale/ko'
import { useInitAuth } from '@/lib/hooks/useAuth'
import NavigationTracker from '@/components/layout/NavigationTracker'
import ToastHost from '@/components/ui/ToastHost'

// 요일(ddd/dddd) 포맷이 한글로 표시되도록 전역 로케일을 등록한다. (KAN-212)
dayjs.locale('ko')

function AuthInitializer() {
  useInitAuth()
  return null
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60,
            retry: 1,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      <AuthInitializer />
      <NavigationTracker />
      {children}
      <ToastHost />
    </QueryClientProvider>
  )
}
