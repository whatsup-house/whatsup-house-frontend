import { getRequestConfig } from 'next-intl/server'
import { cookies } from 'next/headers'
import { defaultLocale, isLocale, type Locale } from './config'

// 쿠키 기반 로케일 결정(URL 접두사 없는 next-intl "without i18n routing" 방식). (KAN-264)
// NEXT_LOCALE 쿠키를 읽어 로케일을 정하고, 없거나 미지원이면 ko로 폴백한다.
export default getRequestConfig(async () => {
  const store = await cookies()
  const cookieLocale = store.get('NEXT_LOCALE')?.value
  const locale: Locale = isLocale(cookieLocale) ? cookieLocale : defaultLocale

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  }
})
