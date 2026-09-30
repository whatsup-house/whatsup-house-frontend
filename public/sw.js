// 채팅 웹 푸시 서비스 워커 (KAN-336). 백엔드 페이로드: { title, body, url }

// 새 버전은 바로 활성화하고 열린 창을 제어해야 notificationclick 의 client.navigate 가 동작한다.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

self.addEventListener('push', (event) => {
  let payload = {}
  try {
    payload = event.data ? event.data.json() : {}
  } catch {
    payload = { body: event.data.text() }
  }
  const url = payload.url || '/chat'

  event.waitUntil(
    self.registration.showNotification(payload.title || '와썹하우스', {
      body: payload.body,
      // 같은 방 알림은 하나로 교체하되, 새 메시지마다 다시 울린다.
      tag: url,
      renotify: true,
      data: { url },
      icon: '/assets/whatsup-logo.png',
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = new URL((event.notification.data && event.notification.data.url) || '/chat', self.location.origin).href

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const client = windows.find((w) => w.focused) || windows[0]
      if (!client) return self.clients.openWindow(url)
      await client.focus()
      // navigate 는 이 워커가 제어하는 창에서만 된다. 실패하면 새 창으로 연다.
      return client.navigate(url).catch(() => self.clients.openWindow(url))
    })(),
  )
})
