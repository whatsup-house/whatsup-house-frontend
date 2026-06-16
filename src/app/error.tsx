'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'
import ErrorScreen from '@/components/layout/ErrorScreen'

// 공용 에러 바운더리(숫자 없음) — 루트 세그먼트의 런타임 에러. 앱 셸 안에 표시. (KAN-248)
// 발생한 에러는 Sentry로 전송해 실제 발생을 추적한다. (KAN-255)
export default function Error({
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
    <ErrorScreen
      title="앗! 잠시 문제가 생겼어요"
      description={'예상치 못한 오류가 발생했어요.\n잠시 후 다시 시도해주세요.'}
      onRetry={reset}
    />
  )
}
