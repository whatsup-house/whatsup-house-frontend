'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'
import koMessages from '../../messages/ko.json'
import enMessages from '../../messages/en.json'
import jaMessages from '../../messages/ja.json'
import zhMessages from '../../messages/zh.json'
import esMessages from '../../messages/es.json'
import '@/styles/globals.css'

const FALLBACK_COPY = {
  ko: {
    lang: 'ko',
    brand: koMessages.common.brand,
    title: koMessages.common.globalError.title,
    description: koMessages.common.globalError.description,
    retry: koMessages.common.retry,
  },
  en: {
    lang: 'en',
    brand: enMessages.common.brand,
    title: enMessages.common.globalError.title,
    description: enMessages.common.globalError.description,
    retry: enMessages.common.retry,
  },
  ja: {
    lang: 'ja',
    brand: jaMessages.common.brand,
    title: jaMessages.common.globalError.title,
    description: jaMessages.common.globalError.description,
    retry: jaMessages.common.retry,
  },
  zh: {
    lang: 'zh',
    brand: zhMessages.common.brand,
    title: zhMessages.common.globalError.title,
    description: zhMessages.common.globalError.description,
    retry: zhMessages.common.retry,
  },
  es: {
    lang: 'es',
    brand: esMessages.common.brand,
    title: esMessages.common.globalError.title,
    description: esMessages.common.globalError.description,
    retry: esMessages.common.retry,
  },
} as const

function getFallbackCopy() {
  if (typeof document === 'undefined') return FALLBACK_COPY.ko
  const match = document.cookie.match(/(?:^|; )NEXT_LOCALE=(ko|en|ja|zh|es)(?:;|$)/)
  return FALLBACK_COPY[match?.[1] as keyof typeof FALLBACK_COPY] ?? FALLBACK_COPY.ko
}

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
  const copy = getFallbackCopy()

  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang={copy.lang}>
      <body>
        <div className="mobile-layout flex min-h-screen flex-col bg-background">
          <header className="sticky top-0 z-30 border-b border-tag-bg bg-card/85 px-4 backdrop-blur-md">
            <div className="flex h-14 items-center">
              <span className="text-base font-bold text-foreground">{copy.brand}</span>
            </div>
          </header>
          <main className="flex flex-1 flex-col items-center justify-center px-7 py-10 text-center">
            <p className="font-pixel mb-5 text-[60px] leading-none text-tag-text">500</p>
            <h1 className="mb-3 text-xl font-extrabold leading-snug tracking-tight text-foreground">
              {copy.title}
            </h1>
            <p className="mb-8 whitespace-pre-line text-sm leading-relaxed text-tag-text">
              {copy.description}
            </p>
            <button
              type="button"
              onClick={reset}
              className="inline-flex min-h-[52px] w-full max-w-[320px] items-center justify-center rounded-button bg-primary px-6 text-[15px] font-bold text-white"
            >
              {copy.retry}
            </button>
          </main>
        </div>
      </body>
    </html>
  )
}
