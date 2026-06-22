'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'
import { useTranslations } from 'next-intl'
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
  const t = useTranslations('common.errorBoundary')
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <ErrorScreen
      title={t('title')}
      description={t('description')}
      onRetry={reset}
    />
  )
}
