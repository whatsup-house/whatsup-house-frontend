'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AlertCircle, ChevronLeft } from 'lucide-react'
import AuthOnlyRedirect from './AuthOnlyRedirect'
import { useConfirmPasswordReset } from '@/lib/hooks/useAuth'
import { useBackNavigation } from '@/lib/hooks/useBackNavigation'
import { getApiErrorMessage } from '@/lib/utils/apiError'

const passwordResetConfirmSchema = z.object({
  newPassword: z
    .string()
    .min(8, '비밀번호는 8자 이상이어야 합니다')
    .regex(/^(?=.*[a-zA-Z])(?=.*\d).+$/, '비밀번호는 영문과 숫자를 포함해야 합니다'),
  passwordConfirm: z.string().min(1, '비밀번호 확인을 입력해주세요'),
}).refine((value) => value.newPassword === value.passwordConfirm, {
  message: '비밀번호가 일치하지 않습니다',
  path: ['passwordConfirm'],
})

type PasswordResetConfirmFormValues = z.infer<typeof passwordResetConfirmSchema>

export default function PasswordResetConfirmPageClient() {
  const handleBack = useBackNavigation('/password-reset')
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const confirmMutation = useConfirmPasswordReset()

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
    ? getApiErrorMessage(confirmMutation.error, '비밀번호 재설정 링크를 확인해주세요.')
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
            aria-label="뒤로가기"
          >
            <ChevronLeft size={22} />
          </button>
          <h1 className="text-base font-bold text-foreground">새 비밀번호</h1>
          <div className="h-11 w-11" />
        </div>
      </header>

      <div className="px-7 pb-8 pt-8">
        {!token ? (
          <section className="rounded-card bg-card p-5 text-center">
            <p className="text-sm font-semibold text-foreground">재설정 링크가 올바르지 않습니다.</p>
            <Link
              href="/password-reset"
              className="mt-5 flex min-h-[44px] items-center justify-center rounded-button bg-primary px-4 text-sm font-bold text-white"
            >
              링크 다시 받기
            </Link>
          </section>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="ml-1 text-xs font-medium text-tag-text">새 비밀번호</span>
              <input
                type="password"
                placeholder="영문과 숫자를 포함해 8자 이상"
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
              <span className="ml-1 text-xs font-medium text-tag-text">비밀번호 확인</span>
              <input
                type="password"
                placeholder="새 비밀번호 다시 입력"
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
              {confirmMutation.isPending ? '변경 중...' : '비밀번호 변경'}
            </button>
          </form>
        )}

        {confirmMutation.isSuccess && (
          <section className="mt-6 rounded-card bg-card p-5 text-center">
            <p className="text-sm font-semibold text-foreground">비밀번호가 변경되었습니다.</p>
            <Link
              href="/login"
              className="mt-5 flex min-h-[44px] items-center justify-center rounded-button bg-primary px-4 text-sm font-bold text-white"
            >
              로그인
            </Link>
          </section>
        )}
      </div>
    </main>
  )
}
