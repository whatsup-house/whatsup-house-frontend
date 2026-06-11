'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { safeReturnUrl } from '@/lib/utils/url'
import { markWelcomeSeen } from '@/lib/utils/welcomeCookie'
import { isDesktopViewport } from '@/lib/utils/viewport'
import AuthOnlyRedirect from './AuthOnlyRedirect'

export default function WelcomePageClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const returnUrl = searchParams.get('returnUrl')
  const redirectTo = safeReturnUrl(returnUrl)
  const loginHref = returnUrl ? `/login?returnUrl=${encodeURIComponent(returnUrl)}` : '/login'

  useEffect(() => {
    markWelcomeSeen()
  }, [])

  // 웰컴 랜딩은 모바일 전용. 데스크탑(lg↑)에서 직접 진입하면 즉시 내보낸다.
  useEffect(() => {
    if (isDesktopViewport()) {
      router.replace(redirectTo)
    }
  }, [router, redirectTo])

  return (
    <main className="relative min-h-screen overflow-hidden bg-foreground text-white lg:hidden">
      <AuthOnlyRedirect redirectTo={redirectTo} />
      <Image
        src="/assets/host-1.jpg"
        alt="와썹하우스 호스트"
        fill
        priority
        sizes="390px"
        className="object-cover object-[60%_center]"
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[200px] bg-gradient-to-b from-black/45 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[60%] bg-gradient-to-b from-transparent via-black/70 to-black/90" />

      <section className="absolute inset-x-0 top-24 z-10 flex flex-col items-center px-6 text-center">
        <h1 className="font-brand-kr text-[38px] font-bold leading-tight text-white drop-shadow-[0_2px_18px_rgba(0,0,0,0.55)]">
          와썹하우스
        </h1>
        <p className="font-brand-script text-[30px] leading-none text-white/90 drop-shadow-[0_1px_10px_rgba(0,0,0,0.55)]">
          What&apos;s up house
        </p>
      </section>

      <section className="absolute inset-x-0 bottom-0 z-10 flex flex-col gap-2.5 px-6 pb-9">
        <Link
          href={loginHref}
          className="flex min-h-[52px] w-full items-center justify-center rounded-button bg-primary px-5 py-4 text-[15px] font-bold text-white shadow-[0_6px_20px_rgba(0,0,0,0.18)]"
        >
          로그인
        </Link>
        <Link
          href="/register"
          className="flex min-h-[52px] w-full items-center justify-center rounded-button bg-card px-5 py-4 text-[15px] font-bold text-foreground shadow-[0_6px_20px_rgba(0,0,0,0.18)]"
        >
          회원가입
        </Link>
        <Link
          href="/"
          onClick={markWelcomeSeen}
          className="self-center px-2 py-3 text-[13px] font-medium text-white/80 underline decoration-white/40 underline-offset-4"
        >
          비회원으로 시작하기
        </Link>
      </section>
    </main>
  )
}
