'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Eye, EyeOff } from 'lucide-react'
import { Button, Input } from '@/components/ui'
import { useCheckNickname } from '@/lib/hooks/useAuth'
import type { Gender } from '@/lib/api/types'

export const REGISTER_SESSION_KEY = 'register-step1'

const PASSWORD_REGEX = /^(?=.*[a-zA-Z])(?=.*\d).+$/

const schema = z.object({
  name: z.string().min(1, '이름을 입력해주세요'),
  nickname: z.string()
    .min(2, '닉네임은 2자 이상 입력해주세요')
    .max(50, '닉네임은 50자 이하로 입력해주세요'),
  phone: z.string().refine(
    (val) => !val || /^\d{11}$/.test(val),
    { message: '전화번호는 11자리 숫자여야 합니다' }
  ),
  email: z.string().email('올바른 이메일 형식을 입력해주세요'),
  password: z.string()
    .min(8, '비밀번호는 영문+숫자 포함 8자 이상으로 설정해주세요')
    .regex(PASSWORD_REGEX, '비밀번호는 영문+숫자 포함 8자 이상으로 설정해주세요'),
  passwordConfirm: z.string().min(1, '비밀번호를 다시 입력해주세요'),
  gender: z.enum(['MALE', 'FEMALE'], '성별을 선택해주세요'),
  age: z.string()
    .min(1, '나이를 입력해주세요')
    .refine((val) => !isNaN(parseInt(val)) && parseInt(val) >= 1, '유효한 나이를 입력해주세요'),
}).refine((data) => data.password === data.passwordConfirm, {
  message: '비밀번호가 불일치합니다',
  path: ['passwordConfirm'],
})

type FormValues = z.infer<typeof schema>

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: 'MALE', label: '남' },
  { value: 'FEMALE', label: '여' },
]

const TERMS = [
  { id: 'age', label: '[필수] 만 14세 이상입니다', required: true },
  { id: 'terms', label: '[필수] 이용약관에 동의합니다', required: true, link: true },
  { id: 'privacy', label: '[필수] 개인정보처리방침에 동의합니다', required: true, link: true },
  { id: 'marketing', label: '[선택] 마케팅 정보 수신에 동의합니다', required: false },
]

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
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const password = watch('password', '')
  const passwordConfirmValue = watch('passwordConfirm', '')
  const nicknameValue = watch('nickname', '')
  const genderValue = watch('gender')

  const passwordValid = password.length >= 8 && PASSWORD_REGEX.test(password)
  const confirmMatch = passwordConfirmValue.length > 0 && passwordConfirmValue === password

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedNickname(nicknameValue), 300)
    return () => clearTimeout(timer)
  }, [nicknameValue])

  const {
    data: nicknameAvailable,
    isFetching: isCheckingNickname,
    isError: isNicknameCheckError,
  } = useCheckNickname(debouncedNickname)

  const allRequired = TERMS.filter((t) => t.required).every((t) => checkedTerms[t.id])
  const allChecked = TERMS.every((t) => checkedTerms[t.id])
  const toggleAll = () => {
    const next = !allChecked
    setCheckedTerms(Object.fromEntries(TERMS.map((t) => [t.id, next])))
  }
  const toggleTerm = (id: string) => setCheckedTerms((prev) => ({ ...prev, [id]: !prev[id] }))

  const handleValid = (data: FormValues) => {
    if (!allRequired) return
    if (nicknameAvailable === false) return
    if (debouncedNickname.length >= 2 && isCheckingNickname) return

    sessionStorage.setItem(REGISTER_SESSION_KEY, JSON.stringify({
      email: data.email,
      password: data.password,
      name: data.name,
      nickname: data.nickname,
      gender: data.gender,
      age: parseInt(data.age),
      phone: data.phone || undefined,
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

      <div className="flex justify-center gap-2 pt-6 pb-2">
        <div className="w-2.5 h-2.5 rounded-full bg-primary" />
        <div className="w-2.5 h-2.5 rounded-full bg-primary opacity-30" />
      </div>

      <div className="px-6 pt-4 pb-10">
        <form onSubmit={handleSubmit(handleValid)} className="flex flex-col gap-5">
          <Input
            label="이름 *"
            placeholder="이름을 입력해주세요"
            {...register('name')}
            error={errors.name?.message}
          />

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-foreground">성별 *</label>
            <div className="flex gap-2">
              {GENDER_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setValue('gender', option.value, { shouldValidate: true })}
                  className={`flex-1 py-2.5 rounded-input text-sm font-medium transition-colors min-h-[44px] ${genderValue === option.value ? 'bg-primary text-white' : 'bg-tag-bg text-tag-text'}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {errors.gender && <p className="text-xs text-primary">{errors.gender.message}</p>}
          </div>

          <Input
            label="나이 *"
            type="number"
            placeholder="나이를 입력해주세요"
            {...register('age')}
            error={errors.age?.message}
          />

          <div className="flex flex-col gap-1">
            <Input
              label="닉네임 *"
              placeholder="2자 이상 입력해주세요"
              {...register('nickname')}
              error={errors.nickname?.message}
            />
            {debouncedNickname.length >= 2 && (
              isCheckingNickname ? (
                <p className="text-xs text-tag-text pl-1">확인 중...</p>
              ) : isNicknameCheckError ? (
                <p className="text-xs text-tag-text pl-1">중복 확인에 실패했습니다</p>
              ) : nicknameAvailable === true ? (
                <p className="text-xs text-green-600 pl-1">사용 가능한 닉네임입니다</p>
              ) : nicknameAvailable === false ? (
                <p className="text-xs text-primary pl-1">중복된 닉네임입니다</p>
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

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-foreground">비밀번호 *</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="영문+숫자 포함 8자 이상"
                className={`w-full px-4 py-3 pr-12 rounded-input border bg-card text-foreground placeholder:text-tag-text focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent ${password.length > 0 && !passwordValid ? 'border-primary' : 'border-tag-bg'}`}
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
              passwordValid
                ? <p className="text-xs text-green-600 pl-1">사용 가능한 비밀번호입니다</p>
                : <p className="text-xs text-primary pl-1">비밀번호는 영문+숫자 포함 8자 이상으로 설정해주세요</p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-foreground">비밀번호 확인 *</label>
            <div className="relative">
              <input
                type={showPasswordConfirm ? 'text' : 'password'}
                placeholder="비밀번호를 다시 입력해주세요"
                className={`w-full px-4 py-3 pr-12 rounded-input border bg-card text-foreground placeholder:text-tag-text focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent ${passwordConfirmValue.length > 0 && !confirmMatch ? 'border-primary' : 'border-tag-bg'}`}
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
            {passwordConfirmValue.length > 0 && (
              confirmMatch
                ? <p className="text-xs text-green-600 pl-1">비밀번호가 일치합니다</p>
                : <p className="text-xs text-primary pl-1">비밀번호가 불일치합니다</p>
            )}
          </div>

          <Input
            label="연락처"
            type="tel"
            placeholder="01012345678 (선택, 11자리)"
            {...register('phone')}
            error={errors.phone?.message}
          />

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
                {term.link && <span className="text-xs text-primary shrink-0">전문 보기 →</span>}
              </button>
            ))}
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full mt-2"
            disabled={!allRequired || nicknameAvailable === false || (debouncedNickname.length >= 2 && isCheckingNickname)}
          >
            다음
          </Button>
        </form>
      </div>
    </div>
  )
}
