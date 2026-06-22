import type { Metadata } from 'next'
import { Allura, Gowun_Batang, Press_Start_2P } from 'next/font/google'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages, getTranslations } from 'next-intl/server'
import { Providers } from './providers'
import '@/styles/globals.css'

const gowunBatang = Gowun_Batang({
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-gowun-batang',
})

const allura = Allura({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-allura',
})

// 에러 페이지 숫자(404/500)용 픽셀 폰트 (KAN-248)
const pressStart2P = Press_Start_2P({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-press-start',
})

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('metadata.root')

  return {
    title: t('title'),
    description: t('description'),
    icons: { icon: '/assets/whatsup-logo.png' },
  }
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // 쿠키 기반 로케일 + 메시지 카탈로그를 서버에서 읽어 Provider로 내려준다. (KAN-264)
  const locale = await getLocale()
  const messages = await getMessages()

  return (
    <html lang={locale} className={`${gowunBatang.variable} ${allura.variable} ${pressStart2P.variable}`}>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
