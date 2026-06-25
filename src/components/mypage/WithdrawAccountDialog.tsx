'use client'

import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AlertCircle, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useWithdrawAccount } from '@/lib/hooks/useAuth'
import { resolveApiErrorMessage } from '@/lib/utils/apiError'

type WithdrawFormValues = {
  password: string
}

interface WithdrawAccountDialogProps {
  onClose: () => void
}

export default function WithdrawAccountDialog({ onClose }: WithdrawAccountDialogProps) {
  const t = useTranslations('mypage.withdraw')
  const tCommon = useTranslations('common')
  const withdrawMutation = useWithdrawAccount()
  const withdrawSchema = useMemo(
    () =>
      z.object({
        password: z.string().min(1, t('validation.password')),
      }),
    [t],
  )

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<WithdrawFormValues>({
    resolver: zodResolver(withdrawSchema),
    defaultValues: {
      password: '',
    },
  })

  const onSubmit = (data: WithdrawFormValues) => {
    withdrawMutation.mutate(data)
  }

  const errorMessage = withdrawMutation.isError
    ? resolveApiErrorMessage(withdrawMutation.error, tCommon)
    : null

  return (
    <div className="fixed lg:absolute inset-0 z-50 flex items-end justify-center bg-foreground/30 px-4 pb-4 sm:items-center sm:pb-0">
      <div className="w-full max-w-[360px] rounded-card bg-background p-5 shadow-lg">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-foreground">{t('title')}</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={withdrawMutation.isPending}
            className="flex min-h-[36px] min-w-[36px] items-center justify-center text-tag-text disabled:opacity-50"
            aria-label={tCommon('close')}
          >
            <X size={18} />
          </button>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-tag-text">
          {t('description')}
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-5 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="ml-1 text-xs font-medium text-tag-text">{t('passwordConfirm')}</span>
            <input
              type="password"
              autoComplete="current-password"
              placeholder={t('passwordPlaceholder')}
              className={`w-full rounded-[10px] border bg-card px-4 py-3.5 text-sm text-foreground outline-none transition-colors placeholder:text-tag-text/70 focus:border-primary focus:ring-2 focus:ring-primary-light ${
                errors.password ? 'border-primary' : 'border-tag-bg'
              }`}
              {...register('password')}
            />
            {errors.password && (
              <span className="text-xs text-primary">{errors.password.message}</span>
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
              disabled={withdrawMutation.isPending}
              className="flex min-h-[48px] items-center justify-center rounded-button bg-tag-bg px-4 text-sm font-bold text-tag-text disabled:opacity-60"
            >
              {tCommon('cancel')}
            </button>
            <button
              type="submit"
              disabled={withdrawMutation.isPending}
              className="flex min-h-[48px] items-center justify-center rounded-button bg-primary px-4 text-sm font-bold text-white disabled:opacity-60"
            >
              {withdrawMutation.isPending ? t('submitting') : t('submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
