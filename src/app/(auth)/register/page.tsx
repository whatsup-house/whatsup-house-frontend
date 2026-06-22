'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import dayjs, { type Dayjs } from 'dayjs'
import { ArrowLeft, CalendarDays, ChevronLeft, ChevronRight, Eye, EyeOff, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button, Input } from '@/components/ui'
import { useCheckEmail, useCheckNickname } from '@/lib/hooks/useAuth'
import { useBackNavigation } from '@/lib/hooks/useBackNavigation'
import { getAge } from '@/lib/utils/date'
import type { Gender } from '@/lib/api/types'

export const REGISTER_SESSION_KEY = 'register-step1'
export const REGISTER_EMAIL_ERROR_KEY = 'register-email-error'

const PASSWORD_REGEX = /^(?=.*[a-zA-Z])(?=.*\d).+$/
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const REVEAL_DELAY_MS = 300

type FormValues = {
  name: string
  gender: Gender
  birthDate: string
  nickname: string
  email: string
  password: string
  passwordConfirm: string
  phone: string
}
type PolicyId = 'terms' | 'privacy'

interface TermItem {
  id: string
  labelKey: string
  required: boolean
  policyId?: PolicyId
}

interface PolicySection {
  title: string
  items: string[]
}

const GENDER_OPTIONS: { value: Gender; labelKey: string }[] = [
  { value: 'MALE', labelKey: 'gender.male' },
  { value: 'FEMALE', labelKey: 'gender.female' },
]

const TERMS: TermItem[] = [
  { id: 'age', labelKey: 'terms.age', required: true },
  { id: 'terms', labelKey: 'terms.terms', required: true, policyId: 'terms' },
  { id: 'privacy', labelKey: 'terms.privacy', required: true, policyId: 'privacy' },
  { id: 'marketing', labelKey: 'terms.marketing', required: false },
]

const getDefaultBirthDate = () => dayjs().year(2000).format('YYYY-MM-DD')

function formatBirthDateInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 4) return digits
  if (digits.length <= 6) return `${digits.slice(0, 4)}.${digits.slice(4)}`
  return `${digits.slice(0, 4)}.${digits.slice(4, 6)}.${digits.slice(6)}`
}

function formatBirthDateDisplay(date: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date.replaceAll('-', '.') : ''
}

function parseBirthDateInput(value: string): string {
  const digits = value.replace(/\D/g, '')
  if (digits.length !== 8) return ''

  const date = `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`
  const parsed = dayjs(date)
  return parsed.isValid() && parsed.format('YYYY-MM-DD') === date ? date : ''
}

function getStoredCheckedTerms(): Record<string, boolean> {
  if (typeof window === 'undefined') return {}

  try {
    const raw = window.sessionStorage.getItem(REGISTER_SESSION_KEY)
    if (!raw) return {}
    const saved = JSON.parse(raw)
    return saved.checkedTerms && typeof saved.checkedTerms === 'object' ? saved.checkedTerms : {}
  } catch {
    return {}
  }
}

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debouncedValue
}

function scrollIntoComfortView(element: HTMLElement) {
  const rect = element.getBoundingClientRect()
  const topPadding = 88
  const bottomPadding = 96
  const isComfortable = rect.top >= topPadding && rect.bottom <= window.innerHeight - bottomPadding
  if (isComfortable) return

  const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
  element.scrollIntoView({ behavior, block: 'center' })
}

interface BirthDateCalendarProps {
  selectedDate: string
  calendarMonth: Dayjs
  error?: string
  onSelectDate: (date: string) => void
  onChangeMonth: (month: Dayjs) => void
}

function BirthDateCalendar({
  selectedDate,
  calendarMonth,
  error,
  onSelectDate,
  onChangeMonth,
}: BirthDateCalendarProps) {
  const t = useTranslations('auth.register.calendar')
  const dayLabels = t.raw('dayLabels') as string[]
  const minBirthDate = dayjs().subtract(120, 'year')
  const maxBirthDate = dayjs().subtract(14, 'year')
  const minDate = minBirthDate.format('YYYY-MM-DD')
  const maxDate = maxBirthDate.format('YYYY-MM-DD')
  const minMonth = minBirthDate.startOf('month').format('YYYY-MM')
  const maxMonth = maxBirthDate.startOf('month').format('YYYY-MM')

  const firstDay = calendarMonth.startOf('month')
  const year = firstDay.year()
  const month = firstDay.month() + 1
  const startDayOfWeek = firstDay.day()
  const daysInMonth = firstDay.daysInMonth()
  const currentMonth = firstDay.format('YYYY-MM')
  const canGoPrev = currentMonth > minMonth
  const canGoNext = currentMonth < maxMonth
  const birthYears = Array.from(
    { length: maxBirthDate.year() - minBirthDate.year() + 1 },
    (_, index) => maxBirthDate.year() - index,
  )

  const cells: (number | null)[] = [
    ...Array(startDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const moveMonth = (nextMonth: Dayjs) => {
    const next = nextMonth.startOf('month')
    const nextKey = next.format('YYYY-MM')
    if (nextKey < minMonth || nextKey > maxMonth) return
    onChangeMonth(next)
  }

  const clampMonth = (nextMonth: Dayjs) => {
    const next = nextMonth.startOf('month')
    const nextKey = next.format('YYYY-MM')
    if (nextKey < minMonth) return minBirthDate.startOf('month')
    if (nextKey > maxMonth) return maxBirthDate.startOf('month')
    return next
  }

  const changeYear = (nextYear: number) => {
    onChangeMonth(clampMonth(dayjs(`${nextYear}-${String(month).padStart(2, '0')}-01`)))
  }

  const changeMonth = (nextMonth: number) => {
    onChangeMonth(clampMonth(dayjs(`${year}-${String(nextMonth).padStart(2, '0')}-01`)))
  }

  return (
    <div className={`bg-card rounded-card p-4 border ${error ? 'border-primary' : 'border-tag-bg/50'}`}>
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={() => moveMonth(firstDay.subtract(1, 'month'))}
          disabled={!canGoPrev}
          className="p-1 min-w-[44px] min-h-[44px] flex items-center justify-center disabled:opacity-30"
          aria-label={t('previousMonth')}
        >
          <ChevronLeft size={20} className="text-tag-text" />
        </button>

        <div className="flex items-center gap-2">
          <select
            value={year}
            onChange={(e) => changeYear(Number(e.target.value))}
            className="h-9 rounded-input border border-tag-bg bg-background px-2 text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label={t('yearSelect')}
          >
            {birthYears.map((birthYear) => (
              <option key={birthYear} value={birthYear}>{t('yearOption', { year: birthYear })}</option>
            ))}
          </select>
          <select
            value={month}
            onChange={(e) => changeMonth(Number(e.target.value))}
            className="h-9 rounded-input border border-tag-bg bg-background px-2 text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label={t('monthSelect')}
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((birthMonth) => {
              const monthKey = `${year}-${String(birthMonth).padStart(2, '0')}`
              return (
                <option key={birthMonth} value={birthMonth} disabled={monthKey < minMonth || monthKey > maxMonth}>
                  {t('monthOption', { month: birthMonth })}
                </option>
              )
            })}
          </select>
        </div>

        <button
          type="button"
          onClick={() => moveMonth(firstDay.add(1, 'month'))}
          disabled={!canGoNext}
          className="p-1 min-w-[44px] min-h-[44px] flex items-center justify-center disabled:opacity-30"
          aria-label={t('nextMonth')}
        >
          <ChevronRight size={20} className="text-tag-text" />
        </button>
      </div>

      <div className="grid grid-cols-7 mb-1">
        {dayLabels.map((day, i) => (
          <div
            key={day}
            className={`text-center text-xs font-medium py-1 ${i === 0 ? 'text-primary' : 'text-tag-text'}`}
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {cells.map((day, idx) => {
          if (!day) return <div key={`empty-${idx}`} className="h-10" />

          const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const isSelected = dateStr === selectedDate
          const isSunday = idx % 7 === 0
          const disabled = dateStr < minDate || dateStr > maxDate

          return (
            <button
              key={dateStr}
              type="button"
              onClick={() => onSelectDate(dateStr)}
              disabled={disabled}
              aria-pressed={isSelected}
              className="flex flex-col items-center py-1 gap-0.5 min-h-[44px] justify-center disabled:pointer-events-none"
            >
              <span
                className={`w-8 h-8 flex items-center justify-center rounded-full text-sm transition-colors
                  ${isSelected ? 'bg-primary text-white font-semibold' : ''}
                  ${!isSelected && !disabled && isSunday ? 'text-primary' : ''}
                  ${!isSelected && !disabled && !isSunday ? 'text-foreground hover:bg-tag-bg' : ''}
                  ${disabled ? 'text-tag-text/30' : ''}
                `}
              >
                {day}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

interface PolicyModalProps {
  policyId: PolicyId | null
  onClose: () => void
  onAgree: (policyId: PolicyId) => void
}

function PolicyModal({ policyId, onClose, onAgree }: PolicyModalProps) {
  const t = useTranslations('auth.register.policies')
  const tCommon = useTranslations('common')
  useEffect(() => {
    if (!policyId) return

    const previousOverflow = document.body.style.overflow
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [policyId, onClose])

  if (!policyId) return null

  const sections = t.raw(`${policyId}.sections`) as PolicySection[]
  const handleAgree = () => {
    onAgree(policyId)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/30 px-4 pb-4 sm:items-center sm:pb-0 lg:absolute"
      onClick={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="policy-modal-title"
        className="animate-field-reveal flex max-h-[82vh] w-full max-w-[390px] flex-col overflow-hidden rounded-card bg-background shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-tag-bg px-5 py-4">
          <h2 id="policy-modal-title" className="text-base font-bold text-foreground">
            {t(`${policyId}.title`)}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-[36px] min-w-[36px] items-center justify-center text-tag-text"
            aria-label={tCommon('close')}
          >
            <X size={18} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <p className="text-sm leading-relaxed text-tag-text">{t(`${policyId}.summary`)}</p>

          <div className="mt-5 flex flex-col gap-5">
            {sections.map((section) => (
              <section key={section.title} className="flex flex-col gap-2">
                <h3 className="text-sm font-bold text-foreground">{section.title}</h3>
                <ul className="flex flex-col gap-1.5">
                  {section.items.map((item) => (
                    <li key={item} className="pl-3 text-sm leading-relaxed text-tag-text before:-ml-3 before:mr-1.5 before:content-['·']">
                      {item}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>

        <div className="border-t border-tag-bg px-5 py-4">
          <Button type="button" variant="primary" className="w-full" onClick={handleAgree}>
            {tCommon('agree')}
          </Button>
        </div>
      </section>
    </div>
  )
}

export default function RegisterPage() {
  const t = useTranslations('auth.register')
  const tCommon = useTranslations('common')
  const router = useRouter()
  const handleBack = useBackNavigation('/')
  const defaultBirthDate = getDefaultBirthDate()
  const [showPassword, setShowPassword] = useState(false)
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false)
  const [checkedTerms, setCheckedTerms] = useState<Record<string, boolean>>(() => getStoredCheckedTerms())
  const [policyModal, setPolicyModal] = useState<PolicyId | null>(null)
  const [debouncedNickname, setDebouncedNickname] = useState('')
  const [debouncedEmail, setDebouncedEmail] = useState('')
  const [birthDateDraft, setBirthDateDraft] = useState<string | null>(null)
  const [isBirthCalendarOpen, setIsBirthCalendarOpen] = useState(false)
  const [birthCalendarMonthValue, setBirthCalendarMonthValue] = useState<string | null>(null)
  const fieldRefs = useRef<Array<HTMLDivElement | null>>([])
  const birthCalendarPanelRef = useRef<HTMLDivElement | null>(null)
  const previousRevealLevelRef = useRef(0)
  const schema = useMemo(
    () =>
      z.object({
        name: z.string().min(2, t('validation.nameMin')),
        gender: z.enum(['MALE', 'FEMALE'], t('validation.gender')),
        birthDate: z.string()
          .min(1, t('validation.birthRequired'))
          .refine((val) => !Number.isNaN(getAge(val)), t('validation.birthInvalid'))
          .refine((val) => getAge(val) >= 14, t('validation.birthAge'))
          .refine((val) => getAge(val) <= 120, t('validation.birthInvalid')),
        nickname: z.string()
          .min(2, t('validation.nicknameMin'))
          .max(50, t('validation.nicknameMax')),
        email: z.string().email(t('validation.email')),
        password: z.string()
          .min(8, t('validation.password'))
          .regex(PASSWORD_REGEX, t('validation.password')),
        passwordConfirm: z.string().min(1, t('validation.passwordConfirm')),
        phone: z.string().regex(/^\d{11}$/, t('validation.phone')),
      }).refine((data) => data.password === data.passwordConfirm, {
        message: t('validation.passwordMismatch'),
        path: ['passwordConfirm'],
      }),
    [t]
  )

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
  const calendarSelectedDate = birthDateValue || defaultBirthDate
  const birthCalendarMonth = dayjs(birthCalendarMonthValue ?? calendarSelectedDate).startOf('month')
  const birthDateInputValue = birthDateDraft ?? formatBirthDateDisplay(birthDateValue)

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

  const handleBirthDateInputChange = (value: string) => {
    const nextValue = formatBirthDateInput(value)
    const parsedDate = parseBirthDateInput(nextValue)
    const isComplete = nextValue.replace(/\D/g, '').length === 8

    setBirthDateDraft(nextValue)

    if (parsedDate) {
      clearErrors('birthDate')
      setBirthCalendarMonthValue(dayjs(parsedDate).startOf('month').format('YYYY-MM-DD'))
      setValue('birthDate', parsedDate, { shouldDirty: true, shouldTouch: true, shouldValidate: true })
      return
    }

    setValue('birthDate', '', { shouldDirty: true, shouldTouch: true })
    if (isComplete) {
      setError('birthDate', { type: 'manual', message: t('validation.birthInvalid') })
    } else {
      clearErrors('birthDate')
    }
  }

  const toggleBirthCalendar = () => {
    if (!isBirthCalendarOpen) {
      setBirthCalendarMonthValue(dayjs(calendarSelectedDate).startOf('month').format('YYYY-MM-DD'))
    }
    setIsBirthCalendarOpen((open) => !open)
  }

  const handleBirthDateSelect = (date: string) => {
    setBirthDateDraft(formatBirthDateDisplay(date))
    setBirthCalendarMonthValue(dayjs(date).startOf('month').format('YYYY-MM-DD'))
    setValue('birthDate', date, { shouldDirty: true, shouldTouch: true, shouldValidate: true })
    setIsBirthCalendarOpen(false)
  }

  // 한 항목을 충족하면 다음 항목이 순차로 노출된다. (KAN-256)
  // 각 단계의 충족 여부를 앞에서부터 세어 노출 레벨을 구한다.
  const nameReady = nameValue.trim().length >= 2 && !errors.name
  const genderReady = !!genderValue
  const passwordReady = passwordValid && confirmMatch
  const phoneReady = /^\d{11}$/.test(phoneValue)
  const delayedNameReady = useDebouncedValue(nameReady, REVEAL_DELAY_MS)
  const delayedGenderReady = useDebouncedValue(genderReady, REVEAL_DELAY_MS)
  const delayedBirthReady = useDebouncedValue(birthValid, REVEAL_DELAY_MS)
  const delayedPasswordReady = useDebouncedValue(passwordReady, REVEAL_DELAY_MS)
  const delayedPhoneReady = useDebouncedValue(phoneReady, REVEAL_DELAY_MS)
  const delayedTermsReady = useDebouncedValue(allRequired, REVEAL_DELAY_MS)
  const stepFlags = [
    delayedNameReady,                                               // 0 이름
    delayedGenderReady,                                             // 1 성별
    delayedBirthReady,                                              // 2 생년월일
    nicknameValue.length >= 2 && nicknameAvailable === true,        // 3 닉네임
    EMAIL_REGEX.test(emailValue) && emailAvailable === true,        // 4 이메일
    delayedPasswordReady,                                           // 5 비밀번호
    delayedPhoneReady,                                              // 6 연락처
    delayedTermsReady,                                              // 7 약관
  ]
  let revealLevel = 0
  for (const ok of stepFlags) {
    if (!ok) break
    revealLevel += 1
  }
  const visible = (index: number) => index <= revealLevel
  const allFilled = revealLevel === stepFlags.length

  useEffect(() => {
    const previousRevealLevel = previousRevealLevelRef.current
    previousRevealLevelRef.current = revealLevel
    if (revealLevel <= previousRevealLevel) return

    const target = fieldRefs.current[revealLevel]
    if (!target) return

    const timer = window.setTimeout(() => scrollIntoComfortView(target), 120)
    return () => window.clearTimeout(timer)
  }, [revealLevel])

  useEffect(() => {
    if (!isBirthCalendarOpen || !birthCalendarPanelRef.current) return

    const timer = window.setTimeout(() => {
      if (birthCalendarPanelRef.current) scrollIntoComfortView(birthCalendarPanelRef.current)
    }, 120)
    return () => window.clearTimeout(timer)
  }, [isBirthCalendarOpen])

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
      checkedTerms,
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
            aria-label={tCommon('back')}
          >
            <ArrowLeft size={20} className="text-foreground" />
          </button>
          <h1 className="flex-1 text-center text-base font-bold text-foreground pr-11">
            {tCommon('register')}
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
            label={t('nameLabel')}
            requiredMark
            placeholder={t('namePlaceholder')}
            {...register('name')}
            error={errors.name?.message}
          />

          {/* 1. 성별 */}
          {visible(1) && (
            <div ref={(node) => { fieldRefs.current[1] = node }} className="animate-field-reveal flex flex-col gap-2">
              <label className="text-sm font-medium text-foreground">
                {t('genderLabel')}<span className="text-primary"> *</span>
              </label>
              <div className="flex gap-2">
                {GENDER_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setValue('gender', option.value, { shouldValidate: true })}
                    className={`flex-1 py-2.5 rounded-input text-sm font-medium transition-colors min-h-[44px] ${genderValue === option.value ? 'bg-primary text-white' : 'bg-tag-bg text-tag-text'}`}
                  >
                    {t(option.labelKey)}
                  </button>
                ))}
              </div>
              {errors.gender && <p className="text-xs text-primary">{errors.gender.message}</p>}
            </div>
          )}

          {/* 2. 생년월일 + 만 나이 표시 */}
          {visible(2) && (
            <div ref={(node) => { fieldRefs.current[2] = node }} className="animate-field-reveal flex flex-col gap-1">
              <label className="text-sm font-medium text-foreground">
                {t('birthDateLabel')}<span className="text-primary"> *</span>
              </label>
              <input type="hidden" {...register('birthDate')} />
              <div className="relative">
                <input
                  value={birthDateInputValue}
                  onChange={(e) => handleBirthDateInputChange(e.target.value)}
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="YYYY.MM.DD"
                  className={`w-full px-4 py-3 pr-12 rounded-input border bg-card text-foreground placeholder:text-tag-text focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent ${errors.birthDate ? 'border-primary' : 'border-tag-bg'}`}
                />
                <button
                  type="button"
                  onClick={toggleBirthCalendar}
                  className="absolute right-2 top-1/2 -translate-y-1/2 min-w-[40px] min-h-[40px] flex items-center justify-center text-tag-text"
                  aria-label={isBirthCalendarOpen ? t('calendar.closeBirth') : t('calendar.openBirth')}
                >
                  <CalendarDays size={19} />
                </button>
              </div>
              {isBirthCalendarOpen && (
                <div ref={birthCalendarPanelRef} className="animate-field-reveal pt-2">
                  <BirthDateCalendar
                    selectedDate={birthDateValue}
                    calendarMonth={birthCalendarMonth}
                    error={errors.birthDate?.message}
                    onSelectDate={handleBirthDateSelect}
                    onChangeMonth={(month) => setBirthCalendarMonthValue(month.format('YYYY-MM-DD'))}
                  />
                </div>
              )}
              {errors.birthDate && (
                <p className="text-xs text-primary pl-1">{errors.birthDate.message}</p>
              )}
              {birthValid && (
                <p className="text-xs text-tag-text pl-1">{t('agePreview', { age: agePreview })}</p>
              )}
            </div>
          )}

          {/* 3. 닉네임 */}
          {visible(3) && (
            <div ref={(node) => { fieldRefs.current[3] = node }} className="animate-field-reveal flex flex-col gap-1">
              <Input
                label={t('nicknameLabel')}
                requiredMark
                placeholder={t('nicknamePlaceholder')}
                {...register('nickname')}
                error={errors.nickname?.message}
              />
              {debouncedNickname.length >= 2 && (
                isCheckingNickname ? (
                  <p className="text-xs text-tag-text pl-1">{t('checking')}</p>
                ) : isNicknameCheckError ? (
                  <p className="text-xs text-tag-text pl-1">{t('duplicateCheckFailed')}</p>
                ) : nicknameAvailable === true ? (
                  <p className="text-xs text-green-600 pl-1">{t('nicknameAvailable')}</p>
                ) : nicknameAvailable === false ? (
                  <p className="text-xs text-primary pl-1">{tCommon('errors.NICKNAME_ALREADY_EXISTS')}</p>
                ) : null
              )}
            </div>
          )}

          {/* 4. 이메일(ID) */}
          {visible(4) && (
            <div ref={(node) => { fieldRefs.current[4] = node }} className="animate-field-reveal flex flex-col gap-1">
              <Input
                label={t('emailLabel')}
                requiredMark
                type="email"
                placeholder={t('emailPlaceholder')}
                {...register('email')}
                error={errors.email?.message}
              />
              {!errors.email && debouncedEmail.length > 0 && (
                isCheckingEmail ? (
                  <p className="text-xs text-tag-text pl-1">{t('checking')}</p>
                ) : isEmailCheckError ? (
                  <p className="text-xs text-tag-text pl-1">{t('duplicateCheckFailed')}</p>
                ) : emailAvailable === true ? (
                  <p className="text-xs text-green-600 pl-1">{t('emailAvailable')}</p>
                ) : emailAvailable === false ? (
                  <p className="text-xs text-primary pl-1">{tCommon('errors.EMAIL_ALREADY_EXISTS')}</p>
                ) : null
              )}
            </div>
          )}

          {/* 5. 비밀번호 + 비밀번호 확인 (동시 노출) */}
          {visible(5) && (
            <div ref={(node) => { fieldRefs.current[5] = node }} className="animate-field-reveal flex flex-col gap-5">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-foreground">
                  {t('passwordLabel')}<span className="text-primary"> *</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder={t('passwordPlaceholder')}
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
                    ? <p className="text-xs text-green-600 pl-1">{t('passwordAvailable')}</p>
                    : <p className="text-xs text-primary pl-1">{t('validation.password')}</p>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-foreground">
                  {t('passwordConfirmLabel')}<span className="text-primary"> *</span>
                </label>
                <div className="relative">
                  <input
                    type={showPasswordConfirm ? 'text' : 'password'}
                    placeholder={t('passwordConfirmPlaceholder')}
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
                    ? <p className="text-xs text-green-600 pl-1">{t('passwordMatch')}</p>
                    : <p className="text-xs text-primary pl-1">{t('validation.passwordMismatch')}</p>
                )}
              </div>
            </div>
          )}

          {/* 6. 연락처 (필수) */}
          {visible(6) && (
            <div ref={(node) => { fieldRefs.current[6] = node }} className="animate-field-reveal">
              <Input
                label={t('phoneLabel')}
                requiredMark
                type="tel"
                placeholder={t('phonePlaceholder')}
                {...register('phone')}
                error={errors.phone?.message}
              />
            </div>
          )}

          {/* 7. 약관 동의 */}
          {visible(7) && (
            <div ref={(node) => { fieldRefs.current[7] = node }} className="animate-field-reveal bg-card rounded-card p-4 flex flex-col gap-3 border border-tag-bg/50">
              <button
                type="button"
                onClick={toggleAll}
                className="flex items-center gap-3 min-h-[44px]"
              >
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${allChecked ? 'border-primary bg-primary' : 'border-tag-bg'}`}>
                  {allChecked && <span className="text-white text-xs">✓</span>}
                </div>
                <span className="text-sm font-semibold text-foreground">{t('terms.all')}</span>
              </button>
              <div className="h-px bg-tag-bg" />
              {TERMS.map((term) => (
                <div key={term.id} className="flex min-h-[44px] items-center gap-3">
                  <button
                    type="button"
                    onClick={() => toggleTerm(term.id)}
                    className="flex min-h-[44px] flex-1 items-center gap-3 text-left"
                    aria-pressed={!!checkedTerms[term.id]}
                  >
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${checkedTerms[term.id] ? 'border-primary bg-primary' : 'border-tag-bg'}`}>
                      {checkedTerms[term.id] && <span className="text-white text-xs">✓</span>}
                    </div>
                    <span className="text-sm text-tag-text">{t(term.labelKey)}</span>
                  </button>
                  {term.policyId && (
                    <button
                      type="button"
                      onClick={() => setPolicyModal(term.policyId ?? null)}
                      className="min-h-[44px] shrink-0 text-xs font-semibold text-primary"
                      aria-label={t(`policies.${term.policyId}.viewFullLabel`)}
                    >
                      {t('policies.viewFull')}
                    </button>
                  )}
                </div>
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
              {tCommon('next')}
            </Button>
          )}
        </form>
      </div>
      <PolicyModal
        policyId={policyModal}
        onClose={() => setPolicyModal(null)}
        onAgree={(policyId) => {
          setCheckedTerms((prev) => ({ ...prev, [policyId]: true }))
          setPolicyModal(null)
        }}
      />
    </div>
  )
}
