import { NextResponse, userAgent } from 'next/server'
import type { NextRequest } from 'next/server'
import { WELCOME_COOKIE_NAME } from '@/lib/utils/welcomeCookie'

// 비로그인 모바일 첫 진입(/)을 홈 SSR 전에 /welcome으로 보낸다. (KAN-323)
// 서버는 인증 쿠키를 볼 수 없으므로 로그인·회원가입 성공 시 세팅되는 wh_seen_welcome으로만 거른다.
// 모바일로 확정되지 않으면 그대로 통과시키고 HomeAuthRedirect(클라이언트)가 판단한다.
function isMobileRequest(request: NextRequest): boolean {
  const chMobile = request.headers.get('sec-ch-ua-mobile')
  if (chMobile) return chMobile === '?1'

  return userAgent(request).device.type === 'mobile'
}

export function proxy(request: NextRequest) {
  const { searchParams } = request.nextUrl
  if (searchParams.get('guest') === '1') return NextResponse.next()
  if (request.cookies.get(WELCOME_COOKIE_NAME)?.value === '1') return NextResponse.next()
  if (!isMobileRequest(request)) return NextResponse.next()

  const welcomeUrl = new URL('/welcome', request.url)
  welcomeUrl.searchParams.set('returnUrl', '/')
  const response = NextResponse.redirect(welcomeUrl)
  // 쿠키·UA에 따라 달라지는 응답이라 엣지/브라우저 캐시에 남기지 않는다.
  response.headers.set('Cache-Control', 'no-store')
  return response
}

export const config = {
  matcher: [
    {
      source: '/',
      // 문서 요청만 서버에서 보낸다. RSC(클라이언트 네비게이션·prefetch) 응답까지 리다이렉트하면
      // 라우터 세그먼트 캐시가 '/'→/welcome을 기억해 쿠키 세팅 후에도 홈 이동이 막힌다. 그 경로는 HomeAuthRedirect가 처리.
      // proxy 안에서는 Next가 rsc 헤더를 지우므로 matcher 단계에서 거른다.
      missing: [{ type: 'header', key: 'rsc' }],
    },
  ],
}
