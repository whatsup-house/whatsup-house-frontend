'use client'

import Link from 'next/link'
import { Home, ArrowLeft, RotateCcw } from 'lucide-react'
import { useBackNavigation } from '@/lib/hooks/useBackNavigation'

interface ErrorViewProps {
  /** 상단 대형 숫자 (예: '404', '500'). 공용 에러는 생략한다. */
  code?: string
  title: string
  description: string
  /** 제공 시 "다시 시도" 버튼을 노출한다 (error 바운더리의 reset). */
  onRetry?: () => void
  /** "이전 페이지" 버튼 노출 여부 (router.back). */
  showBack?: boolean
  /** "홈으로 가기" 버튼 노출 여부 (기본 true). */
  showHome?: boolean
}

// 와썹하우스 공용 에러/404 뷰. 항상 모바일 단일 컬럼 레이아웃으로,
// 앱 셸(헤더/바텀내비) 안에 들어가는 것을 전제로 한다. (KAN-248)
export default function ErrorView({
  code,
  title,
  description,
  onRetry,
  showBack = false,
  showHome = true,
}: ErrorViewProps) {
  // 헤더(TopNav)의 뒤로가기와 동일하게 동작시키기 위해 같은 훅을 사용한다.
  // 앱 내 이동 기록이 있으면 직전 페이지로, 없으면 홈으로 폴백. (KAN-248)
  const handleBack = useBackNavigation('/')

  const primaryCls =
    'inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-button bg-primary px-6 text-[15px] font-bold text-white transition-opacity hover:opacity-90'
  const outlineCls =
    'inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-button border border-tag-bg bg-card px-6 text-[15px] font-bold text-tag-text transition-colors hover:bg-tag-bg'

  return (
    <div className="flex min-h-[70vh] w-full flex-col items-center justify-center px-7 py-10 text-center">
      {code && (
        <p className="font-pixel mb-5 text-[60px] leading-none text-tag-text">{code}</p>
      )}
      <h1 className="mb-3 text-xl font-extrabold leading-snug tracking-tight text-foreground">
        {title}
      </h1>
      <p className="mb-6 whitespace-pre-line text-sm leading-relaxed text-tag-text">
        {description}
      </p>

      {/* eslint-disable-next-line @next/next/no-img-element -- 에러 바운더리/global-error에서도 안전하게 동작하도록 일반 img 사용 */}
      <img src="/assets/error.png" alt="와썹하우스 에러 안내" className="mb-7 w-full max-w-[220px]" />

      <div className="flex w-full max-w-[320px] flex-col gap-2.5">
        {onRetry ? (
          <>
            <button type="button" onClick={onRetry} className={primaryCls}>
              <RotateCcw size={17} />
              다시 시도
            </button>
            {showHome && (
              <Link href="/" className={outlineCls}>
                <Home size={17} />
                홈으로 가기
              </Link>
            )}
          </>
        ) : (
          <>
            {showHome && (
              <Link href="/" className={primaryCls}>
                <Home size={17} />
                홈으로 가기
              </Link>
            )}
            {showBack && (
              <button type="button" onClick={handleBack} className={outlineCls}>
                <ArrowLeft size={17} />
                이전 페이지
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
