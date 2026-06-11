'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useNavigationStore } from '@/lib/store/navigationStore'

/**
 * 히스토리 스택 기반 뒤로가기 핸들러.
 * 앱 내 이동 기록이 있으면 직전 페이지로 돌아가고,
 * 외부 진입 등으로 기록이 없으면 fallbackHref로 이동한다.
 */
export function useBackNavigation(fallbackHref: string) {
  const router = useRouter()
  const { stack, back } = useNavigationStore()

  return useCallback(() => {
    if (stack.length > 1) {
      back()
      router.back()
      return
    }
    router.push(fallbackHref)
  }, [stack.length, back, router, fallbackHref])
}
