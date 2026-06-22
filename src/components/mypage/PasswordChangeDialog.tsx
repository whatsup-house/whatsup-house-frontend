'use client'

import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AlertCircle, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useChangePassword } from '@/lib/hooks/useAuth'
import { resolveApiErrorMessage } from '@/lib/utils/apiError'

const PASSWORD_REGEX = /^(?=.*[a-zA-Z])(?=.*\d).+$/

type FormValues = { currentPassword: string; newPassword: string; newPasswordConfirm: string }

interface PasswordChangeDialogProps {
  onClose: () => void
  onSuccess?: () => void
}

export default function PasswordChangeDialog({ onClose, onSuccess }: PasswordChangeDialogProps) {
  const t = useTranslations('mypage.password')
  const tCommon = useTranslations('common')
  const changePassword = useChangePassword()
  const schema = useMemo(
    () =>
      z
        .object({
          currentPassword: z.string().min(1, t('validation.currentPassword')),
          newPassword: z
            .string()
            .min(8, t('validation.newPassword'))
            .regex(PASSWORD_REGEX, t('validation.newPassword')),
          newPasswordConfirm: z.string().min(1, t('validation.confirmPassword')),
        })
        .refine((d) => d.newPassword === d.newPasswordConfirm, {
          message: t('validation.mismatch'),
          path: ['newPasswordConfirm'],
        }),
    [t]
  )

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { currentPassword: '', newPassword: '', newPasswordConfirm: '' },
  })

  const onSubmit = (data: FormValues) => {
    changePassword.mutate(
      { currentPassword: data.currentPassword, newPassword: data.newPassword },
      {
        onSuccess: () => {
          onSuccess?.()
          onClose()
        },
      }
    )
  }

  const errorMessage = changePassword.isError
    ? resolveApiErrorMessage(changePassword.error, tCommon)
    : null

  const inputCls = (hasError: boolean) =>
    `w-full rounded-[10px] border bg-card px-4 py-3.5 text-sm text-foreground outline-none transition-colors placeholder:text-tag-text/70 focus:border-primary focus:ring-2 focus:ring-primary-light ${
      hasError ? 'border-primary' : 'border-tag-bg'
    }`

  return (
    <div className="fixed lg:absolute inset-0 z-50 flex items-end justify-center bg-foreground/30 px-4 pb-4 sm:items-center sm:pb-0">
      <div className="w-full max-w-[360px] rounded-card bg-background p-5 shadow-lg">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-foreground">{t('title')}</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={changePassword.isPending}
            className="flex min-h-[36px] min-w-[36px] items-center justify-center text-tag-text disabled:opacity-50"
            aria-label={tCommon('close')}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-5 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="ml-1 text-xs font-medium text-tag-text">{t('currentPassword')}</span>
            <input
              type="password"
              autoComplete="current-password"
              placeholder={t('currentPasswordPlaceholder')}
              className={inputCls(!!errors.currentPassword)}
              {...register('currentPassword')}
            />
            {errors.currentPassword && (
              <span className="text-xs text-primary">{errors.currentPassword.message}</span>
            )}
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="ml-1 text-xs font-medium text-tag-text">{t('newPassword')}</span>
            <input
              type="password"
              autoComplete="new-password"
              placeholder={t('newPasswordPlaceholder')}
              className={inputCls(!!errors.newPassword)}
              {...register('newPassword')}
            />
            {errors.newPassword && (
              <span className="text-xs text-primary">{errors.newPassword.message}</span>
            )}
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="ml-1 text-xs font-medium text-tag-text">{t('confirmPassword')}</span>
            <input
              type="password"
              autoComplete="new-password"
              placeholder={t('confirmPasswordPlaceholder')}
              className={inputCls(!!errors.newPasswordConfirm)}
              {...register('newPasswordConfirm')}
            />
            {errors.newPasswordConfirm && (
              <span className="text-xs text-primary">{errors.newPasswordConfirm.message}</span>
            )}
          </label>

          {errorMessage && (
            <div className="flex items-center gap-1.5 text-[12.5px] font-medium text-primary">
              <AlertCircle size={13} />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={changePassword.isPending}
              className="flex min-h-[48px] items-center justify-center rounded-button bg-tag-bg px-4 text-sm font-bold text-tag-text disabled:opacity-60"
            >
              {tCommon('cancel')}
            </button>
            <button
              type="submit"
              disabled={changePassword.isPending}
              className="flex min-h-[48px] items-center justify-center rounded-button bg-primary px-4 text-sm font-bold text-white disabled:opacity-60"
            >
              {changePassword.isPending ? t('submitting') : t('submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
