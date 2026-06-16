import * as Sentry from '@sentry/nextjs'

// 클라이언트(브라우저) 에러 자동 수집. (KAN-255)
// 1차는 "에러 수집"만 — 성능 트레이싱/세션 리플레이는 무료 한도 보호 및 PII 보호를 위해 OFF.
// DSN이 없으면 Sentry는 자동으로 비활성(no-op)된다.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
  sendDefaultPii: false,
})
