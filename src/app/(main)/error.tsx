'use client'

import ErrorView from '@/components/layout/ErrorView'

// (main) 세그먼트 에러 바운더리 — 앱 셸(TopNav/BottomNav) 내부에서 에러를 표시한다. (KAN-248)
export default function MainError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <ErrorView
      title="앗! 잠시 문제가 생겼어요"
      description={'예상치 못한 오류가 발생했어요.\n잠시 후 다시 시도해주세요.'}
      onRetry={reset}
    />
  )
}
