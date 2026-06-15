'use client'

import ErrorScreen from '@/components/layout/ErrorScreen'

// 공용 에러 바운더리(숫자 없음) — 루트 세그먼트의 런타임 에러. 앱 셸 안에 표시. (KAN-248)
export default function Error({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <ErrorScreen
      title="앗! 잠시 문제가 생겼어요"
      description={'예상치 못한 오류가 발생했어요.\n잠시 후 다시 시도해주세요.'}
      onRetry={reset}
    />
  )
}
