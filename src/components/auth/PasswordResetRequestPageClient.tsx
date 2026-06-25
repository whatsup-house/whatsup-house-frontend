'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AlertCircle, ChevronLeft } from 'lucide-react'
import { useTranslations } from 'next-intl'
import AuthOnlyRedirect from './AuthOnlyRedirect'
import { useRequestPasswordReset } from '@/lib/hooks/useAuth'
import { useBackNavigation } from '@/lib/hooks/useBackNavigation'
import { resolveApiErrorMessage } from '@/lib/utils/apiError'

type PasswordResetRequestFormValues = { email: string }

export default function PasswordResetRequestPageClient() {
  const t = useTranslations('auth.passwordReset.request')
  const tCommon = useTranslations('common')
  const handleBack = useBackNavigation('/login')
  const requestMutation = useRequestPasswordReset()
  const passwordResetRequestSchema = useMemo(
    () =>
      z.object({
        email: z.string().email(t('validation.email')),
      }),
    [t]
  )

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PasswordResetRequestFormValues>({
    resolver: zodResolver(passwordResetRequestSchema),
    defaultValues: {
      email: '',
    },
  })

  const onSubmit = (data: PasswordResetRequestFormValues) => {
    requestMutation.mutate(data)
  }

  const errorMessage = requestMutation.isError
    ? resolveApiErrorMessage(requestMutation.error, tCommon)
    : null

  return (
    <main className="min-h-screen bg-background">
      <AuthOnlyRedirect />
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
          <div className="h-11 w-11" />
        </div>
      </header>

      <div className="px-7 pb-8 pt-8">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="ml-1 text-xs font-medium text-tag-text">{t('emailLabel')}</span>
            <input
              type="email"
              placeholder={t('emailPlaceholder')}
              autoComplete="username"
              className={`w-full rounded-[10px] border bg-card px-4 py-3.5 text-sm text-foreground outline-none transition-colors placeholder:text-tag-text/70 focus:border-primary focus:ring-2 focus:ring-primary-light ${
                errors.email ? 'border-primary' : 'border-tag-bg'
              }`}
              {...register('email')}
            />
            {errors.email && <span className="text-xs text-primary">{errors.email.message}</span>}
          </label>

          {errorMessage && (
            <div className="flex items-center gap-1.5 text-[12.5px] font-medium text-primary">
              <AlertCircle size={13} />
              <span>{errorMessage}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={requestMutation.isPending || requestMutation.isSuccess}
            className="mt-1 flex min-h-[52px] w-full items-center justify-center rounded-button bg-primary px-5 py-4 text-[15px] font-bold text-white shadow-[0_4px_14px_rgba(200,57,43,0.25)] disabled:opacity-60"
          >
            {requestMutation.isPending ? t('submitting') : t('submit')}
          </button>
        </form>

        {requestMutation.isSuccess && (
          <section className="mt-6 rounded-card bg-card p-5 text-center">
            <p className="text-sm font-semibold text-foreground">{t('successTitle')}</p>
            <p className="mt-2 text-xs leading-relaxed text-tag-text">
              {t('successDescription')}
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <Link
                href="/find-email"
                className="flex min-h-[44px] items-center justify-center rounded-button border border-primary px-4 text-sm font-bold text-primary"
              >
                {t('findEmail')}
              </Link>
              <Link
                href="/login"
                className="flex min-h-[44px] items-center justify-center rounded-button bg-primary px-4 text-sm font-bold text-white"
              >
                {tCommon('login')}
              </Link>
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
