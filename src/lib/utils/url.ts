// 외부 URL로의 오픈 리다이렉트 방지 — 내부 경로만 허용
export function safeReturnUrl(url: string | null | undefined): string {
  if (!url) return '/'
  // /로 시작하되 //는 허용하지 않음 (//evil.com 형태 차단)
  if (url.startsWith('/') && !url.startsWith('//')) return url
  return '/'
}
