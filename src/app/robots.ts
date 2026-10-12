import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/constants/site'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // 로그인·개인·관리자 화면은 검색에 노출할 필요가 없다.
      disallow: [
        '/admin', '/mypage', '/chat', '/guest', '/applications', '/payments', '/dining',
        '/login', '/register', '/onboarding', '/welcome', '/find-email', '/password-reset',
        '/gatherings/*/apply',
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
