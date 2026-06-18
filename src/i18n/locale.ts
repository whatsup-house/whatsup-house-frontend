'use server'

import { cookies } from 'next/headers'
import { defaultLocale, isLocale, type Locale } from './config'

const COOKIE_NAME = 'NEXT_LOCALE'

// 현재 로케일 조회 (쿠키 기반). (KAN-264)
export async function getUserLocale(): Promise<Locale> {
  const value = (await cookies()).get(COOKIE_NAME)?.value
  return isLocale(value) ? value : defaultLocale
}

// 언어 변경: 쿠키에 저장한다. 서버 액션이라 호출 후 현재 라우트가 재렌더되어 새 로케일이 반영된다.
export async function setUserLocale(locale: Locale) {
  ;(await cookies()).set(COOKIE_NAME, locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  })
}
