'use client'

import { useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AlertCircle, ChevronLeft } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useLogin } from '@/lib/hooks/useAuth'
import { useBackNavigation } from '@/lib/hooks/useBackNavigation'
import { safeReturnUrl } from '@/lib/utils/url'
import LanguageSwitcher from '@/components/layout/LanguageSwitcher'
import AuthOnlyRedirect from './AuthOnlyRedirect'

type LoginFormValues = { email: string; password: string }

export default function LoginPageClient() {
  const t = useTranslations('auth.login')
  const tCommon = useTranslations('common')
  const searchParams = useSearchParams()
  const rawReturnUrl = searchParams.get('returnUrl')
  const returnUrl = safeReturnUrl(rawReturnUrl)
  const isWithdrawn = searchParams.get('withdrawn') === '1'
  const loginMutation = useLogin(returnUrl)
  const handleBack = useBackNavigation('/')

  const loginSchema = useMemo(
    () =>
      z.object({
        email: z.string().email(t('validation.email')),
        password: z.string().min(1, t('validation.password')),
      }),
    [t]
  )

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
            onClick={handleBack}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center text-foreground"
            aria-label={tCommon('back')}
          >
            <ChevronLeft size={22} />
          </button>
          <h1 className="text-base font-bold text-foreground">{t('title')}</h1>
          <LanguageSwitcher />
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
            {t('tagline')}
          </p>
        </section>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col">
          {isWithdrawn && (
            <div className="mb-4 rounded-card bg-card px-4 py-3 text-center text-xs font-medium text-tag-text">
              {t('withdrawnNotice')}
            </div>
          )}

          <div className="flex flex-col gap-2.5">
            <label className="flex flex-col gap-1.5">
              <span className="ml-1 text-xs font-medium text-tag-text">{t('emailLabel')}</span>
              <input
                type="email"
                placeholder={t('emailPlaceholder')}
                autoComplete="username"
                className={`w-full rounded-[10px] border bg-card px-4 py-3.5 text-sm text-foreground outline-none transition-colors placeholder:text-tag-text/70 focus:border-primary focus:ring-2 focus:ring-primary-light ${
                  errors.email || hasLoginError ? 'border-primary' : 'border-tag-bg'
                }`}
                {...register('email')}
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="ml-1 text-xs font-medium text-tag-text">{t('passwordLabel')}</span>
              <input
                type="password"
                placeholder={t('passwordPlaceholder')}
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
                <span>{t('credentialError')}</span>
              </div>
            </div>
          )}

          <div className="mt-2 flex justify-end gap-3 text-xs font-medium text-tag-text">
            <Link href="/find-email" className="underline decoration-tag-text/40 underline-offset-4">
              {t('findEmail')}
            </Link>
            <Link href="/password-reset" className="underline decoration-tag-text/40 underline-offset-4">
              {t('findPassword')}
            </Link>
          </div>

          <button
            type="submit"
            disabled={loginMutation.isPending}
            className="mt-5 flex min-h-[52px] w-full items-center justify-center rounded-button bg-primary px-5 py-4 text-[15px] font-bold text-white shadow-[0_4px_14px_rgba(200,57,43,0.25)] disabled:opacity-60"
          >
            {loginMutation.isPending ? t('submitting') : t('submit')}
          </button>
        </form>

        <Link
          href="/register"
          className="block w-full px-0 pb-3 pt-5 text-center text-[13px] font-medium text-tag-text"
        >
          {t('noAccount')}{' '}
          <span className="font-bold text-primary underline underline-offset-4">{tCommon('register')}</span>
        </Link>

        <Link
          href="/guest"
          className="block w-full pb-5 text-center text-[13px] font-bold text-primary underline underline-offset-4"
        >
          비회원 이용내역 조회
        </Link>
      </div>
    </main>
  )
}
