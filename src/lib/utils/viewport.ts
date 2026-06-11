// Tailwind lg 브레이크포인트(64rem). AppShell이 데스크탑 셸로 전환되는 기준과 동일하다.
const DESKTOP_MEDIA_QUERY = '(min-width: 1024px)'

export function isDesktopViewport(): boolean {
  if (typeof window === 'undefined') return false

  return window.matchMedia(DESKTOP_MEDIA_QUERY).matches
}
