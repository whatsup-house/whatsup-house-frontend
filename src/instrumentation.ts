import * as Sentry from '@sentry/nextjs'

// 서버/엣지 런타임 에러 자동 수집. DSN이 있을 때만 초기화한다. (KAN-255)
export function register() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN
  if (!dsn) return
  if (process.env.NEXT_RUNTIME === 'nodejs' || process.env.NEXT_RUNTIME === 'edge') {
    Sentry.init({
      dsn,
      tracesSampleRate: 0,
      sendDefaultPii: false,
    })
  }
}

// Next.js 서버 렌더링 중 발생한 에러를 Sentry로 전달 (App Router onRequestError)
export const onRequestError = Sentry.captureRequestError
