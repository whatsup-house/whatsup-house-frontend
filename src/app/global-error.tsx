'use client'

import ErrorView from '@/components/layout/ErrorView'
import '@/styles/globals.css'

// 루트 레이아웃 자체가 깨졌을 때의 최종 폴백 — 자체 html/body를 렌더한다. (KAN-248)
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="ko">
      <body>
        <ErrorView
          code="500"
          title="앗! 잠시 문제가 생겼어요"
          description={'서버에 일시적인 오류가 발생했어요.\n잠시 후 다시 시도해주세요.\n계속되면 조금만 기다려 주세요.'}
          onRetry={reset}
        />
      </body>
    </html>
  )
}
