'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AlertCircle, ChevronLeft } from 'lucide-react'
import AuthOnlyRedirect from './AuthOnlyRedirect'
import { useRequestPasswordReset } from '@/lib/hooks/useAuth'
import { getApiErrorMessage } from '@/lib/utils/apiError'

const passwordResetRequestSchema = z.object({
  email: z.string().email('올바른 이메일 형식을 입력해주세요'),
})

type PasswordResetRequestFormValues = z.infer<typeof passwordResetRequestSchema>

export default function PasswordResetRequestPageClient() {
  const router = useRouter()
  const requestMutation = useRequestPasswordReset()

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
    ? getApiErrorMessage(requestMutation.error, '비밀번호 재설정 요청에 실패했습니다.')
    : null

  return (
    <main className="min-h-screen bg-background">
      <AuthOnlyRedirect />
      <header className="sticky top-0 z-30 border-b border-tag-bg/60 bg-background">
        <div className="flex h-14 items-center justify-between px-1">
          <button
            type="button"
            onClick={() => router.push('/login')}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center text-foreground"
            aria-label="뒤로가기"
          >
            <ChevronLeft size={22} />
          </button>
          <h1 className="text-base font-bold text-foreground">비밀번호 재설정</h1>
          <div className="h-11 w-11" />
        </div>
      </header>

      <div className="px-7 pb-8 pt-8">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="ml-1 text-xs font-medium text-tag-text">이메일</span>
            <input
              type="email"
              placeholder="가입한 이메일 주소"
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
            {requestMutation.isPending ? '발송 중...' : '재설정 링크 받기'}
          </button>
        </form>

        {requestMutation.isSuccess && (
          <section className="mt-6 rounded-card bg-card p-5 text-center">
            <p className="text-sm font-semibold text-foreground">재설정 안내를 보냈습니다.</p>
            <p className="mt-2 text-xs leading-relaxed text-tag-text">
              메일함에서 링크를 확인해주세요. 메일이 오지 않으면 가입 이메일을 다시 확인해주세요.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <Link
                href="/find-email"
                className="flex min-h-[44px] items-center justify-center rounded-button border border-primary px-4 text-sm font-bold text-primary"
              >
                아이디 찾기
              </Link>
              <Link
                href="/login"
                className="flex min-h-[44px] items-center justify-center rounded-button bg-primary px-4 text-sm font-bold text-white"
              >
                로그인
              </Link>
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
