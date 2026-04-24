'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { ArrowLeft } from 'lucide-react'
import { Button, Input } from '@/components/ui'
import { useRegisterAndLogin } from '@/lib/hooks/useAuth'
import type { Gender } from '@/lib/api/types'

interface Step1Data {
  name: string
  nickname: string
  email: string
  password: string
  gender: Gender
  age: number
}

interface FormValues {
  phone: string
}

const STEP1_KEY = 'register_step1'
const STEP2_KEY = 'register_step2'

export default function OnboardingPage() {
  const router = useRouter()
  const [formError, setFormError] = useState<string | null>(null)
  const registerAndLogin = useRegisterAndLogin()

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({ defaultValues: { phone: '' } })

  // sessionStorage에서 전화번호 복원
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STEP2_KEY)
      if (!saved) return
      const data = JSON.parse(saved) as { phone?: string }
      if (data.phone) setValue('phone', data.phone)
    } catch {
      // ignore
    }
  }, [setValue])

  const phoneValue = watch('phone')

  // 전화번호 입력값을 sessionStorage에 저장 (뒤로가기 시 복원용)
  useEffect(() => {
    try {
      sessionStorage.setItem(STEP2_KEY, JSON.stringify({ phone: phoneValue ?? '' }))
    } catch {
      // ignore
    }
  }, [phoneValue])

  const onSubmit = async (data: FormValues) => {
    setFormError(null)

    const step1Raw = sessionStorage.getItem(STEP1_KEY)
    if (!step1Raw) {
      router.push('/register')
      return
    }

    let step1: Step1Data
    try {
      step1 = JSON.parse(step1Raw) as Step1Data
    } catch {
      router.push('/register')
      return
    }

    const phone = data.phone?.trim() || undefined

    try {
      await registerAndLogin.mutateAsync({
        email: step1.email,
        password: step1.password,
        name: step1.name,
        nickname: step1.nickname,
        gender: step1.gender,
        age: step1.age,
        phone,
      })
    } catch {
      setFormError('회원가입 중 오류가 발생했습니다. 다시 시도해주세요.')
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-background border-b border-tag-bg/50">
        <div className="flex items-center px-4 py-3">
          <button
            onClick={() => router.back()}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="뒤로가기"
          >
            <ArrowLeft size={20} className="text-foreground" />
          </button>
          <h1 className="flex-1 text-center text-base font-bold text-foreground pr-11">
            회원가입
          </h1>
        </div>
      </header>

      <div className="px-6 pt-6 pb-10">
        {/* 스텝 인디케이터 — 비활성 점은 opacity-30으로 시인성 확보 */}
        <div className="flex justify-center gap-2 mb-2">
          <div className="w-2.5 h-2.5 rounded-full bg-primary opacity-30" />
          <div className="w-2.5 h-2.5 rounded-full bg-primary" />
        </div>
        <p className="text-center text-sm text-tag-text mb-8">연락처를 추가하면 게더링 연락에 도움이 돼요</p>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
          <Input
            label="연락처"
            type="tel"
            placeholder="01012345678 (선택, 11자리 숫자)"
            {...register('phone', {
              validate: (val) =>
                !val || /^\d{11}$/.test(val) || '전화번호는 11자리 숫자여야 합니다',
            })}
            error={errors.phone?.message}
          />

          {formError && (
            <p className="text-sm text-primary text-center">{formError}</p>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full mt-2"
            isLoading={registerAndLogin.isPending}
          >
            시작하기
          </Button>
        </form>
      </div>
    </div>
  )
}
