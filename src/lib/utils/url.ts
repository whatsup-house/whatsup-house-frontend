// 외부 URL로의 오픈 리다이렉트 방지 — 내부 경로만 허용
export function safeReturnUrl(url: string | null | undefined): string {
  if (!url) return '/'
  // /로 시작하되 //는 허용하지 않음 (//evil.com 형태 차단).
  // 브라우저는 역슬래시를 / 로 바꾸고 탭·개행을 지우므로(/\evil.com, /<탭>/evil.com) 역슬래시·제어문자가 있으면 거절한다.
  // 앞 공백·제어문자는 startsWith('/') 에서 이미 걸린다.
  if (url.startsWith('/') && !url.startsWith('//') && !/[\\\u0000-\u001f\u007f]/.test(url)) return url
  return '/'
}
