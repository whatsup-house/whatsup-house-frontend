'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import dayjs from 'dayjs'
import 'dayjs/locale/en'
import 'dayjs/locale/ja'
import 'dayjs/locale/ko'
import { useLocale } from 'next-intl'
import { useInitAuth } from '@/lib/hooks/useAuth'
import NavigationTracker from '@/components/layout/NavigationTracker'
import ToastHost from '@/components/ui/ToastHost'

function AuthInitializer() {
  useInitAuth()
  return null
}

export function Providers({ children }: { children: React.ReactNode }) {
  const locale = useLocale()
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

  useEffect(() => {
    dayjs.locale(locale)
  }, [locale])

  return (
    <QueryClientProvider client={queryClient}>
      <AuthInitializer />
      <NavigationTracker />
      {children}
      <ToastHost />
    </QueryClientProvider>
  )
}
