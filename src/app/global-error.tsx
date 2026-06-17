'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'
import ErrorView from '@/components/layout/ErrorView'
import '@/styles/globals.css'

// 루트 레이아웃 자체가 깨졌을 때의 최종 폴백 — 자체 html/body를 렌더한다.
// 이 시점엔 Providers(React Query)가 없어 BottomNav를 쓸 수 없으므로 정적 헤더만 둔다. (KAN-248)
// 발생한 에러는 Sentry로 전송한다. (KAN-255)
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="ko">
      <body>
        <div className="mobile-layout flex min-h-screen flex-col bg-background">
          <header className="sticky top-0 z-30 border-b border-tag-bg bg-card/85 px-4 backdrop-blur-md">
            <div className="flex h-14 items-center">
              <span className="text-base font-bold text-foreground">와썹하우스</span>
            </div>
          </header>
          <main className="flex-1">
            <ErrorView
              code="500"
              title="앗! 잠시 문제가 생겼어요"
              description={'서버에 일시적인 오류가 발생했어요.\n잠시 후 다시 시도해주세요.\n계속되면 조금만 기다려 주세요.'}
              onRetry={reset}
            />
          </main>
        </div>
      </body>
    </html>
  )
}
