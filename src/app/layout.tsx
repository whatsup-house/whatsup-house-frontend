import type { Metadata } from 'next'
import { Allura, Gowun_Batang, Press_Start_2P } from 'next/font/google'
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

export const metadata: Metadata = {
  title: '와썹하우스',
  description: '잔잔한 게 좋은 사람들의 공간',
  icons: { icon: '/assets/whatsup-logo.png' },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko" className={`${gowunBatang.variable} ${allura.variable} ${pressStart2P.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
