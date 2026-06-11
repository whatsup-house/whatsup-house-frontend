'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AlertCircle, X } from 'lucide-react'
import { useChangePassword } from '@/lib/hooks/useAuth'
import { getApiErrorMessage } from '@/lib/utils/apiError'

const PASSWORD_REGEX = /^(?=.*[a-zA-Z])(?=.*\d).+$/

// 비밀번호 변경 — 현재/신규/확인. 정책은 회원가입과 동일(영문+숫자 8자 이상). (KAN-223)
const schema = z
  .object({
    currentPassword: z.string().min(1, '현재 비밀번호를 입력해주세요'),
    newPassword: z
      .string()
      .min(8, '비밀번호는 영문+숫자 포함 8자 이상으로 설정해주세요')
      .regex(PASSWORD_REGEX, '비밀번호는 영문+숫자 포함 8자 이상으로 설정해주세요'),
    newPasswordConfirm: z.string().min(1, '새 비밀번호를 다시 입력해주세요'),
  })
  .refine((d) => d.newPassword === d.newPasswordConfirm, {
    message: '새 비밀번호가 일치하지 않습니다',
    path: ['newPasswordConfirm'],
  })

type FormValues = z.infer<typeof schema>

interface PasswordChangeDialogProps {
  onClose: () => void
}

export default function PasswordChangeDialog({ onClose }: PasswordChangeDialogProps) {
  const changePassword = useChangePassword()

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
      { onSuccess: onClose }
    )
  }

  const errorMessage = changePassword.isError
    ? getApiErrorMessage(changePassword.error, '비밀번호 변경에 실패했습니다.')
    : null

  const inputCls = (hasError: boolean) =>
    `w-full rounded-[10px] border bg-card px-4 py-3.5 text-sm text-foreground outline-none transition-colors placeholder:text-tag-text/70 focus:border-primary focus:ring-2 focus:ring-primary-light ${
      hasError ? 'border-primary' : 'border-tag-bg'
    }`

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/30 px-4 pb-4 sm:items-center sm:pb-0">
      <div className="w-full max-w-[360px] rounded-card bg-background p-5 shadow-lg">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-foreground">비밀번호 변경</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={changePassword.isPending}
            className="flex min-h-[36px] min-w-[36px] items-center justify-center text-tag-text disabled:opacity-50"
            aria-label="닫기"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-5 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="ml-1 text-xs font-medium text-tag-text">현재 비밀번호</span>
            <input
              type="password"
              autoComplete="current-password"
              placeholder="현재 비밀번호"
              className={inputCls(!!errors.currentPassword)}
              {...register('currentPassword')}
            />
            {errors.currentPassword && (
              <span className="text-xs text-primary">{errors.currentPassword.message}</span>
            )}
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="ml-1 text-xs font-medium text-tag-text">새 비밀번호</span>
            <input
              type="password"
              autoComplete="new-password"
              placeholder="영문+숫자 포함 8자 이상"
              className={inputCls(!!errors.newPassword)}
              {...register('newPassword')}
            />
            {errors.newPassword && (
              <span className="text-xs text-primary">{errors.newPassword.message}</span>
            )}
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="ml-1 text-xs font-medium text-tag-text">새 비밀번호 확인</span>
            <input
              type="password"
              autoComplete="new-password"
              placeholder="새 비밀번호 다시 입력"
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
              취소
            </button>
            <button
              type="submit"
              disabled={changePassword.isPending}
              className="flex min-h-[48px] items-center justify-center rounded-button bg-primary px-4 text-sm font-bold text-white disabled:opacity-60"
            >
              {changePassword.isPending ? '변경 중...' : '변경하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
