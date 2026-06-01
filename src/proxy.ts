import { NextRequest, NextResponse } from 'next/server'
import { WELCOME_SEEN_COOKIE } from './lib/constants/welcome'

const GUEST_ONLY_ROUTES = ['/login', '/register', '/onboarding', '/welcome']

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const accessToken = request.cookies.get('accessToken')
  const refreshToken = request.cookies.get('refreshToken')
  const hasSeenWelcome = request.cookies.get(WELCOME_SEEN_COOKIE)

  if (GUEST_ONLY_ROUTES.includes(pathname) && accessToken) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  if (pathname === '/') {
    const isGuestEntry = request.nextUrl.searchParams.get('guest') === '1'
    const hasAuthCookie = Boolean(accessToken || refreshToken)

    if (!isGuestEntry && !hasAuthCookie && !hasSeenWelcome) {
      const welcomeUrl = new URL('/welcome', request.url)
      welcomeUrl.searchParams.set('returnUrl', pathname)
      return NextResponse.redirect(welcomeUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/', '/login', '/register', '/onboarding', '/welcome'],
}
