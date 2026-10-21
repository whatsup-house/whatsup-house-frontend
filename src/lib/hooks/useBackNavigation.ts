'use client'

import { useCallback, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'

type NavigationApi = EventTarget & { canGoBack?: boolean }

/**
 * 브라우저 기록상 이 앱 안의 이전 화면이 있는지.
 * Navigation API(같은 출처 기록만 셈)가 있으면 그걸 쓰고, 없으면 history.length 로 어림한다.
 * (예전엔 앱이 따로 쌓은 스택을 봐서, 브라우저 뒤로가기 뒤 첫 화면에서 버튼이 아무 일도 안 하는 갇힘이 있었다)
 */
export function canGoBackInApp(): boolean {
  const navigation = (window as Window & { navigation?: NavigationApi }).navigation
  if (typeof navigation?.canGoBack === 'boolean') return navigation.canGoBack
  return window.history.length > 1
}

// 라우터는 화면을 그린 뒤에 기록을 바꾼다 → 기록이 바뀔 때(currententrychange·popstate) 다시 읽는다
function subscribeHistory(onChange: () => void) {
  const navigation = (window as Window & { navigation?: NavigationApi }).navigation
  navigation?.addEventListener('currententrychange', onChange)
  window.addEventListener('popstate', onChange)
  return () => {
    navigation?.removeEventListener('currententrychange', onChange)
    window.removeEventListener('popstate', onChange)
  }
}

/** 앱 안 이전 화면이 있는지 구독한다. 서버 렌더에선 false. */
export function useCanGoBack(): boolean {
  return useSyncExternalStore(subscribeHistory, canGoBackInApp, () => false)
}

/** 브라우저 뒤로가기와 같게 동작한다. 앱 안 이전 화면이 없으면(딥링크 첫 진입 등) fallbackHref 로 이동한다. */
export function useBackNavigation(fallbackHref: string) {
  const router = useRouter()

  return useCallback(() => {
    if (canGoBackInApp()) {
      router.back()
      return
    }
    router.push(fallbackHref)
  }, [router, fallbackHref])
}
