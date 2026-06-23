'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'
import { useTranslations } from 'next-intl'
import ErrorView from '@/components/layout/ErrorView'

// (auth) 세그먼트 에러 바운더리 — 로그인/회원가입 등 인증 화면의 런타임 에러. (KAN-248)
// 발생한 에러는 Sentry로 전송한다. (KAN-255)
export default function AuthError({
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
    <ErrorView
      title={t('title')}
      description={t('description')}
      onRetry={reset}
    />
  )
}
