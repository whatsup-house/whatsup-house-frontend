'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Eye, EyeOff } from 'lucide-react'
import { Button, Input } from '@/components/ui'
import { useCheckNickname, useRegisterAndLogin } from '@/lib/hooks/useAuth'

const step1Schema = z.object({
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

type Step1Values = z.infer<typeof step1Schema>

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

const MBTI_ROWS = [
  ['E', 'S', 'T', 'J'],
  ['I', 'N', 'F', 'P'],
] as const

const JOB_OPTIONS = [
  { value: 'STUDENT', label: '대학생' },
  { value: 'WORKER', label: '직장인' },
  { value: 'FREELANCER', label: '프리랜서' },
  { value: 'OTHER', label: '기타' },
]

const INTERESTS = ['감성', '독서', '음악', '자연', '요리', '운동', '여행', '영화', '미술', '사진']

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

export default function RegisterPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [step1Data, setStep1Data] = useState<Step1Values | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  // Step 1 상태
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
  } = useForm<Step1Values>({ resolver: zodResolver(step1Schema) })

  const password = watch('password', '')
  const nicknameValue = watch('nickname', '')
  const genderValue = watch('gender')
  const strength = getPasswordStrength(password)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedNickname(nicknameValue), 300)
    return () => clearTimeout(timer)
  }, [nicknameValue])

  const { data: nicknameAvailable, isFetching: isCheckingNickname } = useCheckNickname(debouncedNickname)

  // Step 2 상태
  const [bio, setBio] = useState('')
  const [job, setJob] = useState('')
  const [mbti, setMbti] = useState<(string | null)[]>([null, null, null, null])
  const [selectedInterests, setSelectedInterests] = useState<string[]>([])

  const mbtiString = mbti.every((v) => v !== null) ? mbti.join('') : undefined
  const registerAndLogin = useRegisterAndLogin()

  // 약관
  const allRequired = TERMS.filter((t) => t.required).every((t) => checkedTerms[t.id])
  const allChecked = TERMS.every((t) => checkedTerms[t.id])
  const toggleAll = () => {
    const next = !allChecked
    setCheckedTerms(Object.fromEntries(TERMS.map((t) => [t.id, next])))
  }
  const toggleTerm = (id: string) => setCheckedTerms((prev) => ({ ...prev, [id]: !prev[id] }))

  // 스와이프 감지
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    const diffX = touchStartX.current - e.changedTouches[0].clientX
    const diffY = Math.abs(touchStartY.current - e.changedTouches[0].clientY)
    if (Math.abs(diffX) > 60 && Math.abs(diffX) > diffY) {
      if (diffX > 0 && step === 0) {
        handleSubmit(handleStep1Valid)()
      } else if (diffX < 0 && step === 1) {
        goToStep(0)
      }
    }
  }

  const goToStep = (n: number) => {
    setStep(n)
    window.scrollTo({ top: 0, behavior: 'instant' })
  }

  // 1페이지 → 2페이지
  const handleStep1Valid = (data: Step1Values) => {
    if (!allRequired) return
    if (nicknameAvailable === false) return
    if (debouncedNickname.length >= 2 && isCheckingNickname) return
    setStep1Data(data)
    goToStep(1)
  }

  // 최종 제출
  const handleStep2Submit = async () => {
    if (!step1Data) return
    setFormError(null)
    try {
      await registerAndLogin.mutateAsync({
        email: step1Data.email,
        password: step1Data.password,
        name: step1Data.name,
        nickname: step1Data.nickname,
        gender: step1Data.gender,
        age: parseInt(step1Data.age),
        phone: step1Data.phone || undefined,
      })
    } catch {
      setFormError('회원가입 중 오류가 발생했습니다. 다시 시도해주세요.')
    }
  }

  const handleMbtiSelect = (colIndex: number, value: string) => {
    setMbti((prev) => {
      const next = [...prev]
      next[colIndex] = prev[colIndex] === value ? null : value
      return next
    })
  }

  const toggleInterest = (interest: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]
    )
  }

  return (
    <div
      className="min-h-screen bg-background"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <header className="sticky top-0 z-30 bg-background border-b border-tag-bg/50">
        <div className="flex items-center px-4 py-3">
          <button
            onClick={() => (step === 1 ? goToStep(0) : router.back())}
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

      {/* 스텝 인디케이터 */}
      <div className="flex justify-center gap-2 pt-6 pb-2">
        <div className={`w-2.5 h-2.5 rounded-full bg-primary transition-opacity duration-300 ${step === 0 ? '' : 'opacity-30'}`} />
        <div className={`w-2.5 h-2.5 rounded-full bg-primary transition-opacity duration-300 ${step === 1 ? '' : 'opacity-30'}`} />
      </div>

      {/* 슬라이더 */}
      <div className="overflow-x-hidden">
        <div
          className="flex transition-transform duration-300 ease-in-out"
          style={{ width: '200%', transform: `translateX(${step === 0 ? '0%' : '-50%'})` }}
        >
          {/* ─── 1페이지 ─── */}
          <div className="px-6 pt-4 pb-10 flex flex-col gap-5" style={{ width: '50%' }}>
            <form onSubmit={handleSubmit(handleStep1Valid)} className="flex flex-col gap-5">
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
                label="연락처"
                type="tel"
                placeholder="01012345678 (선택, 11자리)"
                {...register('phone')}
                error={errors.phone?.message}
              />

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

              {/* 성별 */}
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

              {/* 나이 */}
              <Input
                label="나이 *"
                type="number"
                placeholder="나이를 입력해주세요"
                {...register('age')}
                error={errors.age?.message}
              />

              {/* 약관 */}
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

          {/* ─── 2페이지 ─── */}
          <div className="px-6 pt-4 pb-10 flex flex-col gap-6" style={{ width: '50%' }}>
            <p className="text-center text-sm text-tag-text">어떤 분인지 알려주세요 (선택)</p>

            {/* 한 줄 소개 */}
            <div>
              <label className="text-sm font-medium text-foreground block mb-1">
                한 줄 소개 <span className="text-tag-text font-normal">(선택)</span>
              </label>
              <input
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="나를 한 줄로 소개해주세요"
                className="w-full px-4 py-3 rounded-input border border-tag-bg bg-card text-foreground placeholder:text-tag-text focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            {/* 직업 */}
            <div>
              <label className="text-sm font-medium text-foreground block mb-2">직업</label>
              <div className="grid grid-cols-2 gap-2">
                {JOB_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setJob(job === option.value ? '' : option.value)}
                    className={`py-2.5 rounded-input text-sm font-medium transition-colors min-h-[44px] ${
                      job === option.value ? 'bg-primary text-white' : 'bg-tag-bg text-tag-text'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* MBTI */}
            <div>
              <label className="text-sm font-medium text-foreground block mb-2">MBTI</label>
              <div className="grid grid-cols-4 gap-2">
                {MBTI_ROWS[0].map((letter, colIndex) => (
                  <button
                    key={`row0-${letter}`}
                    type="button"
                    onClick={() => handleMbtiSelect(colIndex, letter)}
                    className={`py-3 rounded-input text-sm font-bold transition-colors min-h-[44px] ${
                      mbti[colIndex] === letter ? 'bg-primary text-white' : 'bg-tag-bg text-tag-text'
                    }`}
                  >
                    {letter}
                  </button>
                ))}
                {MBTI_ROWS[1].map((letter, colIndex) => (
                  <button
                    key={`row1-${letter}`}
                    type="button"
                    onClick={() => handleMbtiSelect(colIndex, letter)}
                    className={`py-3 rounded-input text-sm font-bold transition-colors min-h-[44px] ${
                      mbti[colIndex] === letter ? 'bg-primary text-white' : 'bg-tag-bg text-tag-text'
                    }`}
                  >
                    {letter}
                  </button>
                ))}
              </div>
              {mbtiString && (
                <p className="text-center text-sm text-primary font-medium mt-2">
                  {mbtiString} 유형이군요!
                </p>
              )}
            </div>

            {/* 관심 분야 */}
            <div>
              <label className="text-sm font-medium text-foreground block mb-3">관심 분야</label>
              <div className="flex flex-wrap gap-2">
                {INTERESTS.map((interest) => (
                  <button
                    key={interest}
                    type="button"
                    onClick={() => toggleInterest(interest)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors min-h-[44px] ${
                      selectedInterests.includes(interest)
                        ? 'bg-primary text-white'
                        : 'bg-tag-bg text-tag-text'
                    }`}
                  >
                    {interest}
                  </button>
                ))}
              </div>
            </div>

            {formError && (
              <p className="text-sm text-primary text-center">{formError}</p>
            )}

            {/* 하단 버튼 2개 */}
            <div className="flex gap-3 mt-2">
              <Button
                type="button"
                variant="secondary"
                size="lg"
                className="flex-1"
                onClick={() => goToStep(0)}
              >
                이전
              </Button>
              <Button
                variant="primary"
                size="lg"
                className="flex-1"
                onClick={handleStep2Submit}
                isLoading={registerAndLogin.isPending}
              >
                시작하기
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
