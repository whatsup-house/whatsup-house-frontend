import { NextRequest, NextResponse } from 'next/server'

const GUEST_ONLY_ROUTES = ['/login', '/register', '/onboarding']

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl
  const accessToken = request.cookies.get('accessToken')

  if (GUEST_ONLY_ROUTES.includes(pathname) && accessToken) {
    const raw = searchParams.get('returnUrl') ?? '/'
    const returnUrl = raw.startsWith('/') ? raw : '/'
    return NextResponse.redirect(new URL(returnUrl, request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/login', '/register', '/onboarding'],
}
