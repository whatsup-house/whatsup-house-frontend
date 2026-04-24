'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Eye, EyeOff } from 'lucide-react'
import { Button, Input } from '@/components/ui'
import { useCheckNickname } from '@/lib/hooks/useAuth'

const registerSchema = z.object({
  name: z.string().min(1, '이름을 입력해주세요'),
  nickname: z.string()
    .min(2, '닉네임은 2자 이상 입력해주세요')
    .max(50, '닉네임은 50자 이하로 입력해주세요'),
  email: z.string().email('올바른 이메일 형식을 입력해주세요'),
  password: z.string()
    .min(8, '8자 이상 입력해주세요')
    .regex(/^(?=.*[a-zA-Z])(?=.*\d).+$/, '영문과 숫자를 포함해야 합니다'),
  passwordConfirm: z.string().min(1, '비밀번호를 다시 입력해주세요'),
  gender: z.enum(['MALE', 'FEMALE'], '성별을 선택해주세요'),
  age: z.string()
    .min(1, '나이를 입력해주세요')
    .refine((val) => !isNaN(parseInt(val)) && parseInt(val) >= 1, '유효한 나이를 입력해주세요'),
}).refine((data) => data.password === data.passwordConfirm, {
  message: '비밀번호가 일치하지 않아요',
  path: ['passwordConfirm'],
})

type FormValues = z.infer<typeof registerSchema>

const GENDER_OPTIONS = [
  { value: 'MALE' as const, label: '남' },
  { value: 'FEMALE' as const, label: '여' },
]

const TERMS = [
  { id: 'age', label: '[필수] 만 14세 이상입니다', required: true },
  { id: 'terms', label: '[필수] 이용약관에 동의합니다', required: true, link: true },
  { id: 'privacy', label: '[필수] 개인정보처리방침에 동의합니다', required: true, link: true },
  { id: 'marketing', label: '[선택] 마케팅 정보 수신에 동의합니다', required: false },
]

function getPasswordStrength(pw: string): number {
  let s = 0
  if (pw.length >= 8) s++
  if (/[A-Z]/.test(pw)) s++
  if (/[0-9]/.test(pw)) s++
  if (/[^A-Za-z0-9]/.test(pw)) s++
  return s
}

const STRENGTH_LABELS = ['', '취약', '보통', '강함', '안전']
const STRENGTH_COLORS = ['', 'bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-green-500']

const STEP1_KEY = 'register_step1'

export default function RegisterPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false)
  const [checkedTerms, setCheckedTerms] = useState<Record<string, boolean>>({})
  const [debouncedNickname, setDebouncedNickname] = useState('')

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(registerSchema) })

  const password = watch('password', '')
  const nicknameValue = watch('nickname', '')
  const genderValue = watch('gender')
  const strength = getPasswordStrength(password)

  // sessionStorage에서 이전 입력값 복원 (뒤로가기 시 유지)
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STEP1_KEY)
      if (!saved) return
      const data = JSON.parse(saved) as {
        name?: string; nickname?: string; email?: string; password?: string
        gender?: 'MALE' | 'FEMALE'; age?: number; terms?: Record<string, boolean>
      }
      reset({
        name: data.name ?? '',
        nickname: data.nickname ?? '',
        email: data.email ?? '',
        password: data.password ?? '',
        passwordConfirm: data.password ?? '',
        gender: data.gender,
        age: data.age != null ? String(data.age) : '',
      })
      if (data.terms) setCheckedTerms(data.terms)
    } catch {
      // ignore parse errors
    }
  }, [reset])

  // 닉네임 디바운싱
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedNickname(nicknameValue), 300)
    return () => clearTimeout(timer)
  }, [nicknameValue])

  const { data: nicknameAvailable, isFetching: isCheckingNickname } = useCheckNickname(debouncedNickname)

  const allRequired = TERMS.filter((t) => t.required).every((t) => checkedTerms[t.id])
  const allChecked = TERMS.every((t) => checkedTerms[t.id])

  const toggleAll = () => {
    const next = !allChecked
    setCheckedTerms(Object.fromEntries(TERMS.map((t) => [t.id, next])))
  }

  const toggleTerm = (id: string) => {
    setCheckedTerms((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const onSubmit = (data: FormValues) => {
    if (!allRequired) return
    if (nicknameAvailable === false) return

    sessionStorage.setItem(STEP1_KEY, JSON.stringify({
      name: data.name,
      nickname: data.nickname,
      email: data.email,
      password: data.password,
      gender: data.gender,
      age: parseInt(data.age),
      terms: checkedTerms,
    }))
    router.push('/onboarding')
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
        <div className="flex justify-center gap-2 mb-8">
          <div className="w-2.5 h-2.5 rounded-full bg-primary" />
          <div className="w-2.5 h-2.5 rounded-full bg-primary opacity-30" />
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
          <Input
            label="이름 *"
            placeholder="이름을 입력해주세요"
            {...register('name')}
            error={errors.name?.message}
          />

          {/* 닉네임 + 실시간 중복 확인 */}
          <div className="flex flex-col gap-1">
            <Input
              label="닉네임 *"
              placeholder="2자 이상 입력해주세요"
              {...register('nickname')}
              error={errors.nickname?.message}
            />
            {!errors.nickname && debouncedNickname.length >= 2 && (
              isCheckingNickname ? (
                <p className="text-xs text-tag-text">확인 중...</p>
              ) : nicknameAvailable === true ? (
                <p className="text-xs text-green-600">✓ 사용 가능한 닉네임입니다</p>
              ) : nicknameAvailable === false ? (
                <p className="text-xs text-primary">이미 사용 중인 닉네임입니다</p>
              ) : null
            )}
          </div>

          <Input
            label="이메일 *"
            type="email"
            placeholder="이메일 주소를 입력해주세요"
            {...register('email')}
            error={errors.email?.message}
          />

          {/* 비밀번호 */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-foreground">비밀번호 *</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="영문+숫자 포함 8자 이상"
                className={`w-full px-4 py-3 pr-12 rounded-input border bg-card text-foreground placeholder:text-tag-text focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent ${errors.password ? 'border-primary' : 'border-tag-bg'}`}
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-tag-text"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {password.length > 0 && (
              <div className="flex items-center gap-2 mt-1">
                <div className="flex gap-1 flex-1">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className={`flex-1 h-1 rounded-full transition-colors ${i <= strength ? STRENGTH_COLORS[strength] : 'bg-tag-bg'}`}
                    />
                  ))}
                </div>
                <span className={`text-xs font-medium ${strength <= 1 ? 'text-red-400' : strength <= 2 ? 'text-orange-400' : strength <= 3 ? 'text-yellow-500' : 'text-green-600'}`}>
                  {STRENGTH_LABELS[strength]}
                </span>
              </div>
            )}
            {errors.password && <p className="text-xs text-primary">{errors.password.message}</p>}
          </div>

          {/* 비밀번호 확인 */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-foreground">비밀번호 확인 *</label>
            <div className="relative">
              <input
                type={showPasswordConfirm ? 'text' : 'password'}
                placeholder="비밀번호를 다시 입력해주세요"
                className={`w-full px-4 py-3 pr-12 rounded-input border bg-card text-foreground placeholder:text-tag-text focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent ${errors.passwordConfirm ? 'border-primary' : 'border-tag-bg'}`}
                {...register('passwordConfirm')}
              />
              <button
                type="button"
                onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-tag-text"
              >
                {showPasswordConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.passwordConfirm ? (
              <p className="text-xs text-primary">{errors.passwordConfirm.message}</p>
            ) : watch('passwordConfirm') && watch('passwordConfirm') === password ? (
              <p className="text-xs text-green-600">✓ 비밀번호가 일치해요</p>
            ) : null}
          </div>

          {/* 성별 (NOT NULL) */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-foreground">성별 *</label>
            <div className="flex gap-2">
              {GENDER_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setValue('gender', option.value, { shouldValidate: true })}
                  className={`flex-1 py-2.5 rounded-input text-sm font-medium transition-colors min-h-[44px] ${
                    genderValue === option.value ? 'bg-primary text-white' : 'bg-tag-bg text-tag-text'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {errors.gender && <p className="text-xs text-primary">{errors.gender.message}</p>}
          </div>

          {/* 나이 (NOT NULL) */}
          <Input
            label="나이 *"
            type="number"
            placeholder="나이를 입력해주세요"
            {...register('age')}
            error={errors.age?.message}
          />

          {/* 약관 동의 */}
          <div className="bg-card rounded-card p-4 flex flex-col gap-3 border border-tag-bg/50">
            <button
              type="button"
              onClick={toggleAll}
              className="flex items-center gap-3 min-h-[44px]"
            >
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${allChecked ? 'border-primary bg-primary' : 'border-tag-bg'}`}>
                {allChecked && <span className="text-white text-xs">✓</span>}
              </div>
              <span className="text-sm font-semibold text-foreground">전체 동의</span>
            </button>

            <div className="h-px bg-tag-bg" />

            {TERMS.map((term) => (
              <button
                key={term.id}
                type="button"
                onClick={() => toggleTerm(term.id)}
                className="flex items-center gap-3 min-h-[44px] text-left"
              >
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${checkedTerms[term.id] ? 'border-primary bg-primary' : 'border-tag-bg'}`}>
                  {checkedTerms[term.id] && <span className="text-white text-xs">✓</span>}
                </div>
                <span className="text-sm text-tag-text flex-1">{term.label}</span>
                {term.link && (
                  <span className="text-xs text-primary shrink-0">전문 보기 →</span>
                )}
              </button>
            ))}
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full mt-2"
            disabled={!allRequired || nicknameAvailable === false}
          >
            다음
          </Button>
        </form>
      </div>
    </div>
  )
}
