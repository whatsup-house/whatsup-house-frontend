import { useEffect, useState, useSyncExternalStore } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { deletePushSubscription, fetchPushPublicKey, registerPushSubscription } from '@/lib/api/chat'
import { useAuthStore } from '@/lib/store/authStore'

const DISMISSED_AT_KEY = 'whatsup_chat_push_dismissed_at'
const DISMISS_MS = 7 * 24 * 60 * 60 * 1000

// 'ios-guide': iOS 브라우저 탭(홈 화면 앱 아님). 이 상태에선 푸시 API 자체가 없다.
type PushEnv = 'unsupported' | 'ios-guide' | 'dismissed' | NotificationPermission

export type ChatPushBanner = 'none' | 'prompt' | 'ios-guide'

// 로그인 세션마다 한 번만 서버 구독을 맞춘다. 로그아웃(unsubscribeChatPush) 때 초기화.
let syncedThisSession = false

function isDismissed(): boolean {
  try {
    return Date.now() - Number(localStorage.getItem(DISMISSED_AT_KEY) ?? 0) < DISMISS_MS
  } catch {
    return false
  }
}

function readPushEnv(): PushEnv {
  const nav = navigator as Navigator & { standalone?: boolean }
  // iPadOS 는 데스크톱 Mac UA 를 쓰므로 터치 여부로 구분한다.
  const isIos = /iPad|iPhone|iPod/.test(nav.userAgent) || (/Macintosh/.test(nav.userAgent) && nav.maxTouchPoints > 1)
  const isStandalone = nav.standalone === true || window.matchMedia('(display-mode: standalone)').matches
  if (isIos && !isStandalone) return isDismissed() ? 'dismissed' : 'ios-guide'
  if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) return 'unsupported'
  if (Notification.permission === 'default' && isDismissed()) return 'dismissed'
  return Notification.permission
}

const subscribeNoop = () => () => {}
const readServerPushEnv = (): PushEnv => 'unsupported'

async function subscribeChatPush(publicKey: string): Promise<void> {
  await navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
  // subscribe 는 활성 워커가 있어야 하므로 ready 를 기다린다.
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    // base64url → bytes (atob 은 패딩 없는 입력도 받는다)
    applicationServerKey: Uint8Array.from(atob(publicKey.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0)),
  })
  const { endpoint, keys } = subscription.toJSON()
  if (!endpoint || !keys?.p256dh || !keys.auth) throw new Error('push subscription has no keys')
  await registerPushSubscription({ endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth } })
}

// /chat 상단 알림 배너 상태. 공개키 조회가 실패(503 VAPID 미설정 등)하면 배너를 숨긴다.
// 이미 허용된 브라우저는 배너 없이 조용히 구독을 맞춘다(로그아웃 후 재로그인·계정 전환 대비).
export function useChatPushBanner() {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn)
  const env = useSyncExternalStore(subscribeNoop, readPushEnv, readServerPushEnv)
  const [closed, setClosed] = useState(false)

  const publicKey = useQuery({
    queryKey: ['chat', 'push-public-key'],
    queryFn: fetchPushPublicKey,
    enabled: isLoggedIn && (env === 'default' || env === 'granted' || env === 'ios-guide'),
    retry: false,
    staleTime: Infinity,
  })

  const { mutate: subscribe } = useMutation({
    mutationFn: subscribeChatPush,
    onError: (error) => console.warn('[chat-push] 구독 등록 실패', error),
  })

  useEffect(() => {
    if (env !== 'granted' || !publicKey.data || syncedThisSession) return
    syncedThisSession = true
    subscribe(publicKey.data)
  }, [env, publicKey.data, subscribe])

  let banner: ChatPushBanner = 'none'
  if (!closed && publicKey.isSuccess) {
    if (env === 'default') banner = 'prompt'
    else if (env === 'ios-guide') banner = 'ios-guide'
  }

  const allow = async () => {
    setClosed(true)
    if (!publicKey.data) return
    // 권한 요청은 클릭 이벤트 안에서 바로 호출해야 한다(Safari).
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return
    syncedThisSession = true
    subscribe(publicKey.data)
  }

  const later = () => {
    setClosed(true)
    try {
      localStorage.setItem(DISMISSED_AT_KEY, String(Date.now()))
    } catch {
      // 저장소 차단 환경: 이번 화면에서만 숨긴다.
    }
  }

  return { banner, allow, later }
}

// 로그아웃 전에 호출: 서버 구독을 지운 뒤 브라우저 구독을 해제한다. 실패해도 로그아웃은 막지 않는다.
export async function unsubscribeChatPush(): Promise<void> {
  syncedThisSession = false
  try {
    if (!('serviceWorker' in navigator)) return
    const registration = await navigator.serviceWorker.getRegistration()
    const subscription = await registration?.pushManager.getSubscription()
    if (!subscription) return
    await deletePushSubscription(subscription.endpoint).catch((error) =>
      console.warn('[chat-push] 서버 구독 삭제 실패', error),
    )
    await subscription.unsubscribe()
  } catch (error) {
    console.warn('[chat-push] 구독 해제 실패', error)
  }
}
