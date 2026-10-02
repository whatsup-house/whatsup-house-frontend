import type { MetadataRoute } from 'next'

// 홈 화면 설치 시 standalone 앱으로 실행. iOS 웹 푸시도 이 상태에서만 동작한다. (KAN-366)
// background_color(스플래시) 는 globals.css --color-background, theme_color(안드로이드 상단바) 는 헤더(TopNav bg-card)와 맞춰 --color-card. (KAN-385)
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '와썹하우스',
    short_name: '와썹하우스',
    description: '잔잔한 게 좋은 사람들의 공간',
    start_url: '/',
    display: 'standalone',
    background_color: '#F5F0EB',
    theme_color: '#FFFFFF',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
