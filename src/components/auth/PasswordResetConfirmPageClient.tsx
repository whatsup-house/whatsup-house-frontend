'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AlertCircle, ChevronLeft } from 'lucide-react'
import { useTranslations } from 'next-intl'
import AuthOnlyRedirect from './AuthOnlyRedirect'
import { useConfirmPasswordReset } from '@/lib/hooks/useAuth'
import { useBackNavigation } from '@/lib/hooks/useBackNavigation'
import { resolveApiErrorMessage } from '@/lib/utils/apiError'

type PasswordResetConfirmFormValues = { newPassword: string; passwordConfirm: string }

export default function PasswordResetConfirmPageClient() {
  const t = useTranslations('auth.passwordReset.confirm')
  const tCommon = useTranslations('common')
  const handleBack = useBackNavigation('/password-reset')
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const confirmMutation = useConfirmPasswordReset()
  const passwordResetConfirmSchema = useMemo(
    () =>
      z.object({
        newPassword: z
          .string()
          .min(8, t('validation.passwordMin'))
          .regex(/^(?=.*[a-zA-Z])(?=.*\d).+$/, t('validation.passwordPattern')),
        passwordConfirm: z.string().min(1, t('validation.passwordConfirm')),
      }).refine((value) => value.newPassword === value.passwordConfirm, {
        message: t('validation.passwordMismatch'),
        path: ['passwordConfirm'],
      }),
    [t]
  )

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PasswordResetConfirmFormValues>({
    resolver: zodResolver(passwordResetConfirmSchema),
    defaultValues: {
      newPassword: '',
      passwordConfirm: '',
    },
  })

  const onSubmit = (data: PasswordResetConfirmFormValues) => {
    if (!token) return
    confirmMutation.mutate({
      token,
      newPassword: data.newPassword,
    })
  }

  const errorMessage = confirmMutation.isError
    ? resolveApiErrorMessage(confirmMutation.error, tCommon)
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
        {!token ? (
          <section className="rounded-card bg-card p-5 text-center">
            <p className="text-sm font-semibold text-foreground">{t('invalidLink')}</p>
            <Link
              href="/password-reset"
              className="mt-5 flex min-h-[44px] items-center justify-center rounded-button bg-primary px-4 text-sm font-bold text-white"
            >
              {t('requestAgain')}
            </Link>
          </section>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="ml-1 text-xs font-medium text-tag-text">{t('newPasswordLabel')}</span>
              <input
                type="password"
                placeholder={t('newPasswordPlaceholder')}
                autoComplete="new-password"
                className={`w-full rounded-[10px] border bg-card px-4 py-3.5 text-sm text-foreground outline-none transition-colors placeholder:text-tag-text/70 focus:border-primary focus:ring-2 focus:ring-primary-light ${
                  errors.newPassword ? 'border-primary' : 'border-tag-bg'
                }`}
                {...register('newPassword')}
              />
              {errors.newPassword && (
                <span className="text-xs text-primary">{errors.newPassword.message}</span>
              )}
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="ml-1 text-xs font-medium text-tag-text">{t('passwordConfirmLabel')}</span>
              <input
                type="password"
                placeholder={t('passwordConfirmPlaceholder')}
                autoComplete="new-password"
                className={`w-full rounded-[10px] border bg-card px-4 py-3.5 text-sm text-foreground outline-none transition-colors placeholder:text-tag-text/70 focus:border-primary focus:ring-2 focus:ring-primary-light ${
                  errors.passwordConfirm ? 'border-primary' : 'border-tag-bg'
                }`}
                {...register('passwordConfirm')}
              />
              {errors.passwordConfirm && (
                <span className="text-xs text-primary">{errors.passwordConfirm.message}</span>
              )}
            </label>

            {errorMessage && (
              <div className="flex items-center gap-1.5 text-[12.5px] font-medium text-primary">
                <AlertCircle size={13} />
                <span>{errorMessage}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={confirmMutation.isPending || confirmMutation.isSuccess}
              className="mt-1 flex min-h-[52px] w-full items-center justify-center rounded-button bg-primary px-5 py-4 text-[15px] font-bold text-white shadow-[0_4px_14px_rgba(200,57,43,0.25)] disabled:opacity-60"
            >
              {confirmMutation.isPending ? t('submitting') : t('submit')}
            </button>
          </form>
        )}

        {confirmMutation.isSuccess && (
          <section className="mt-6 rounded-card bg-card p-5 text-center">
            <p className="text-sm font-semibold text-foreground">{t('successTitle')}</p>
            <Link
              href="/login"
              className="mt-5 flex min-h-[44px] items-center justify-center rounded-button bg-primary px-4 text-sm font-bold text-white"
            >
              {tCommon('login')}
            </Link>
          </section>
        )}
      </div>
    </main>
  )
}
