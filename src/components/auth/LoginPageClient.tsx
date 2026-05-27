'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AlertCircle, ChevronLeft } from 'lucide-react'
import { useLogin } from '@/lib/hooks/useAuth'
import { safeReturnUrl } from '@/lib/utils/url'
import AuthOnlyRedirect from './AuthOnlyRedirect'

const loginSchema = z.object({
  email: z.string().email('올바른 이메일 형식을 입력해주세요'),
  password: z.string().min(1, '비밀번호를 입력해주세요'),
})

type LoginFormValues = z.infer<typeof loginSchema>

export default function LoginPageClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const rawReturnUrl = searchParams.get('returnUrl')
  const returnUrl = safeReturnUrl(rawReturnUrl)
  const loginMutation = useLogin(returnUrl)
  const welcomeHref = rawReturnUrl ? `/welcome?returnUrl=${encodeURIComponent(rawReturnUrl)}` : '/welcome'

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = (data: LoginFormValues) => {
    loginMutation.mutate(data)
  }

  const hasLoginError = loginMutation.isError

  return (
    <main className="min-h-screen bg-background">
      <AuthOnlyRedirect redirectTo={returnUrl} />
      <header className="sticky top-0 z-30 border-b border-tag-bg/60 bg-background">
        <div className="flex h-14 items-center justify-between px-1">
          <button
            type="button"
            onClick={() => router.push(welcomeHref)}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center text-foreground"
            aria-label="뒤로가기"
          >
            <ChevronLeft size={22} />
          </button>
          <h1 className="text-base font-bold text-foreground">로그인</h1>
          <div className="h-11 w-11" />
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-56px)] flex-col px-7 pb-4 pt-9">
        <section className="mb-9 flex flex-col items-center text-center">
          <Image
            src="/assets/whatsup-logo.png"
            alt="와썹하우스"
            width={168}
            height={168}
            priority
            className="object-contain"
          />
          <p className="mt-1.5 text-[13px] leading-relaxed text-tag-text">
            해가 지는 선선한 저녁에 만나요
          </p>
        </section>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col">
          <div className="flex flex-col gap-2.5">
            <label className="flex flex-col gap-1.5">
              <span className="ml-1 text-xs font-medium text-tag-text">이메일</span>
              <input
                type="email"
                placeholder="이메일 주소"
                autoComplete="username"
                className={`w-full rounded-[10px] border bg-card px-4 py-3.5 text-sm text-foreground outline-none transition-colors placeholder:text-tag-text/70 focus:border-primary focus:ring-2 focus:ring-primary-light ${
                  errors.email || hasLoginError ? 'border-primary' : 'border-tag-bg'
                }`}
                {...register('email')}
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="ml-1 text-xs font-medium text-tag-text">비밀번호</span>
              <input
                type="password"
                placeholder="비밀번호 입력"
                autoComplete="current-password"
                className={`w-full rounded-[10px] border bg-card px-4 py-3.5 text-sm text-foreground outline-none transition-colors placeholder:text-tag-text/70 focus:border-primary focus:ring-2 focus:ring-primary-light ${
                  errors.password || hasLoginError ? 'border-primary' : 'border-tag-bg'
                }`}
                {...register('password')}
              />
            </label>
          </div>

          {(errors.email || errors.password) && !hasLoginError && (
            <p className="mt-2 text-xs text-primary">
              {errors.email?.message ?? errors.password?.message}
            </p>
          )}

          {hasLoginError && (
            <div className="mt-2 flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5 text-[12.5px] font-medium text-primary">
                <AlertCircle size={13} />
                <span>아이디 또는 비밀번호를 확인해주세요.</span>
              </div>
              <button
                type="button"
                className="self-end text-xs font-medium text-tag-text underline decoration-tag-text/40 underline-offset-4"
              >
                비밀번호를 잊으셨나요?
              </button>
            </div>
          )}

          {!hasLoginError && (
            <button
              type="button"
              className="mt-2 self-end text-xs font-medium text-tag-text underline decoration-tag-text/40 underline-offset-4"
            >
              비밀번호를 잊으셨나요?
            </button>
          )}

          <button
            type="submit"
            disabled={loginMutation.isPending}
            className="mt-5 flex min-h-[52px] w-full items-center justify-center rounded-button bg-primary px-5 py-4 text-[15px] font-bold text-white shadow-[0_4px_14px_rgba(200,57,43,0.25)] disabled:opacity-60"
          >
            {loginMutation.isPending ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <Link
          href="/register"
          className="block w-full px-0 py-5 text-center text-[13px] font-medium text-tag-text"
        >
          아직 회원이 아니신가요?{' '}
          <span className="font-bold text-primary underline underline-offset-4">회원가입</span>
        </Link>
      </div>
    </main>
  )
}
