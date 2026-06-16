'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Eye, EyeOff } from 'lucide-react'
import { Button, Input } from '@/components/ui'
import { useCheckEmail, useCheckNickname } from '@/lib/hooks/useAuth'
import { useBackNavigation } from '@/lib/hooks/useBackNavigation'
import { getAge } from '@/lib/utils/date'
import type { Gender } from '@/lib/api/types'

export const REGISTER_SESSION_KEY = 'register-step1'
export const REGISTER_EMAIL_ERROR_KEY = 'register-email-error'

const PASSWORD_REGEX = /^(?=.*[a-zA-Z])(?=.*\d).+$/
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const schema = z.object({
  name: z.string().min(1, '이름을 입력해주세요'),
  gender: z.enum(['MALE', 'FEMALE'], '성별을 선택해주세요'),
  birthDate: z.string()
    .min(1, '생년월일을 선택해주세요')
    .refine((val) => !Number.isNaN(getAge(val)), '올바른 생년월일을 입력해주세요')
    .refine((val) => getAge(val) >= 14, '만 14세 이상만 가입할 수 있어요')
    .refine((val) => getAge(val) <= 120, '올바른 생년월일을 입력해주세요'),
  nickname: z.string()
    .min(2, '닉네임은 2자 이상 입력해주세요')
    .max(50, '닉네임은 50자 이하로 입력해주세요'),
  email: z.string().email('올바른 이메일 형식을 입력해주세요'),
  password: z.string()
    .min(8, '비밀번호는 영문+숫자 포함 8자 이상으로 설정해주세요')
    .regex(PASSWORD_REGEX, '비밀번호는 영문+숫자 포함 8자 이상으로 설정해주세요'),
  passwordConfirm: z.string().min(1, '비밀번호를 다시 입력해주세요'),
  phone: z.string().regex(/^\d{11}$/, '전화번호는 11자리 숫자여야 합니다'),
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
  const handleBack = useBackNavigation('/')
  const [showPassword, setShowPassword] = useState(false)
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false)
  const [checkedTerms, setCheckedTerms] = useState<Record<string, boolean>>({})
  const [debouncedNickname, setDebouncedNickname] = useState('')
  const [debouncedEmail, setDebouncedEmail] = useState('')

  const {
    register,
    control,
    handleSubmit,
    setValue,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const nameValue = useWatch({ control, name: 'name' }) ?? ''
  const genderValue = useWatch({ control, name: 'gender' })
  const birthDateValue = useWatch({ control, name: 'birthDate' }) ?? ''
  const nicknameValue = useWatch({ control, name: 'nickname' }) ?? ''
  const emailValue = useWatch({ control, name: 'email' }) ?? ''
  const password = useWatch({ control, name: 'password' }) ?? ''
  const passwordConfirmValue = useWatch({ control, name: 'passwordConfirm' }) ?? ''
  const phoneValue = useWatch({ control, name: 'phone' }) ?? ''

  const passwordValid = password.length >= 8 && PASSWORD_REGEX.test(password)
  const confirmMatch = passwordConfirmValue.length > 0 && passwordConfirmValue === password
  const agePreview = birthDateValue ? getAge(birthDateValue) : NaN
  const birthValid = !Number.isNaN(agePreview) && agePreview >= 14 && agePreview <= 120

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedNickname(nicknameValue), 300)
    return () => clearTimeout(timer)
  }, [nicknameValue])

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedEmail(emailValue), 300)
    return () => clearTimeout(timer)
  }, [emailValue])

  // 온보딩에서 '이전'으로 돌아오면 1단계 입력값을 복원한다. 성별/생년월일도 setValue로 복원. (KAN-229, KAN-256)
  useEffect(() => {
    const raw = sessionStorage.getItem(REGISTER_SESSION_KEY)
    if (!raw) return
    try {
      const saved = JSON.parse(raw)
      if (saved.email) setValue('email', saved.email)
      if (saved.password) {
        setValue('password', saved.password)
        setValue('passwordConfirm', saved.password)
      }
      if (saved.name) setValue('name', saved.name)
      if (saved.nickname) setValue('nickname', saved.nickname)
      if (saved.gender) setValue('gender', saved.gender)
      if (saved.birthDate) setValue('birthDate', saved.birthDate)
      if (saved.phone) setValue('phone', saved.phone)

      const emailError = sessionStorage.getItem(REGISTER_EMAIL_ERROR_KEY)
      if (emailError) {
        setError('email', { type: 'server', message: emailError })
        sessionStorage.removeItem(REGISTER_EMAIL_ERROR_KEY)
      }
    } catch {
      // 손상된 세션 값은 무시
    }
  }, [setValue, setError])

  const {
    data: nicknameAvailable,
    isFetching: isCheckingNickname,
    isError: isNicknameCheckError,
  } = useCheckNickname(debouncedNickname)
  const {
    data: emailAvailable,
    isFetching: isCheckingEmail,
    isError: isEmailCheckError,
  } = useCheckEmail(debouncedEmail)

  const allRequired = TERMS.filter((t) => t.required).every((t) => checkedTerms[t.id])
  const allChecked = TERMS.every((t) => checkedTerms[t.id])
  const toggleAll = () => {
    const next = !allChecked
    setCheckedTerms(Object.fromEntries(TERMS.map((t) => [t.id, next])))
  }
  const toggleTerm = (id: string) => setCheckedTerms((prev) => ({ ...prev, [id]: !prev[id] }))

  // 한 항목을 충족하면 다음 항목이 순차로 노출된다. (KAN-256)
  // 각 단계의 충족 여부를 앞에서부터 세어 노출 레벨을 구한다.
  const stepFlags = [
    nameValue.trim().length >= 1 && !errors.name,                  // 0 이름
    !!genderValue,                                                  // 1 성별
    birthValid,                                                     // 2 생년월일
    nicknameValue.length >= 2 && nicknameAvailable === true,        // 3 닉네임
    EMAIL_REGEX.test(emailValue) && emailAvailable === true,        // 4 이메일
    passwordValid && confirmMatch,                                  // 5 비밀번호
    /^\d{11}$/.test(phoneValue),                                    // 6 연락처
    allRequired,                                                    // 7 약관
  ]
  let revealLevel = 0
  for (const ok of stepFlags) {
    if (!ok) break
    revealLevel += 1
  }
  const visible = (index: number) => index <= revealLevel
  const allFilled = revealLevel === stepFlags.length

  const handleValid = (data: FormValues) => {
    if (!allRequired) return
    if (nicknameAvailable === false) return
    if (emailAvailable === false) return
    if (debouncedNickname.length >= 2 && isCheckingNickname) return
    if (isCheckingEmail) return
    clearErrors('email')

    sessionStorage.setItem(REGISTER_SESSION_KEY, JSON.stringify({
      email: data.email,
      password: data.password,
      name: data.name,
      nickname: data.nickname,
      gender: data.gender,
      birthDate: data.birthDate,
      // BE(KAN-257) 전환 전까지 호환을 위해 만 나이도 함께 보관한다.
      age: getAge(data.birthDate),
      phone: data.phone,
    }))
    router.push('/onboarding')
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-background border-b border-tag-bg/50">
        <div className="flex items-center px-4 py-3">
          <button
            onClick={handleBack}
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
          {/* 0. 이름 (항상 노출) */}
          <Input
            label="이름"
            requiredMark
            placeholder="이름을 입력해주세요"
            {...register('name')}
            error={errors.name?.message}
          />

          {/* 1. 성별 */}
          {visible(1) && (
            <div className="animate-field-reveal flex flex-col gap-2">
              <label className="text-sm font-medium text-foreground">
                성별<span className="text-primary"> *</span>
              </label>
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
          )}

          {/* 2. 생년월일 + 만 나이 표시 */}
          {visible(2) && (
            <div className="animate-field-reveal flex flex-col gap-1">
              <Input
                label="생년월일"
                requiredMark
                type="date"
                {...register('birthDate')}
                error={errors.birthDate?.message}
              />
              {birthValid && (
                <p className="text-xs text-tag-text pl-1">만 {agePreview}세</p>
              )}
            </div>
          )}

          {/* 3. 닉네임 */}
          {visible(3) && (
            <div className="animate-field-reveal flex flex-col gap-1">
              <Input
                label="닉네임"
                requiredMark
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
                  <p className="text-xs text-primary pl-1">이미 사용 중인 닉네임이에요</p>
                ) : null
              )}
            </div>
          )}

          {/* 4. 이메일(ID) */}
          {visible(4) && (
            <div className="animate-field-reveal flex flex-col gap-1">
              <Input
                label="이메일(ID)"
                requiredMark
                type="email"
                placeholder="이메일 주소를 입력해주세요"
                {...register('email')}
                error={errors.email?.message}
              />
              {!errors.email && debouncedEmail.length > 0 && (
                isCheckingEmail ? (
                  <p className="text-xs text-tag-text pl-1">확인 중...</p>
                ) : isEmailCheckError ? (
                  <p className="text-xs text-tag-text pl-1">중복 확인에 실패했습니다</p>
                ) : emailAvailable === true ? (
                  <p className="text-xs text-green-600 pl-1">사용 가능한 이메일입니다</p>
                ) : emailAvailable === false ? (
                  <p className="text-xs text-primary pl-1">이미 사용 중인 이메일이에요</p>
                ) : null
              )}
            </div>
          )}

          {/* 5. 비밀번호 + 비밀번호 확인 (동시 노출) */}
          {visible(5) && (
            <div className="animate-field-reveal flex flex-col gap-5">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-foreground">
                  비밀번호<span className="text-primary"> *</span>
                </label>
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
                <label className="text-sm font-medium text-foreground">
                  비밀번호 확인<span className="text-primary"> *</span>
                </label>
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
            </div>
          )}

          {/* 6. 연락처 (필수) */}
          {visible(6) && (
            <div className="animate-field-reveal">
              <Input
                label="연락처"
                requiredMark
                type="tel"
                placeholder="01012345678 (11자리)"
                {...register('phone')}
                error={errors.phone?.message}
              />
            </div>
          )}

          {/* 7. 약관 동의 */}
          {visible(7) && (
            <div className="animate-field-reveal bg-card rounded-card p-4 flex flex-col gap-3 border border-tag-bg/50">
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
          )}

          {/* 다음 버튼 — 모든 필수 항목 충족 시에만 활성화 */}
          {visible(7) && (
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-2 animate-field-reveal"
              disabled={!allFilled || (debouncedNickname.length >= 2 && isCheckingNickname) || isCheckingEmail}
            >
              다음
            </Button>
          )}
        </form>
      </div>
    </div>
  )
}
