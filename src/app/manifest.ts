import type { MetadataRoute } from 'next'

// 홈 화면 설치 시 standalone 앱으로 실행. iOS 웹 푸시도 이 상태에서만 동작한다. (KAN-366)
// 색상은 globals.css --color-background 와 맞춘다.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '와썹하우스',
    short_name: '와썹하우스',
    description: '잔잔한 게 좋은 사람들의 공간',
    start_url: '/',
    display: 'standalone',
    background_color: '#F5F0EB',
    theme_color: '#F5F0EB',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
