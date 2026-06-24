'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, CheckCircle } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button, Card, LoadingSpinner, ApiErrorMessage } from '@/components/ui'
import DynamicQuestionField from './DynamicQuestionField'
import { useGatheringForm } from '@/lib/hooks/useForm'
import {
  useSubmitDynamicApplication,
  useSubmitDynamicGuestApplication,
} from '@/lib/hooks/useApplications'
import { useMyProfile } from '@/lib/hooks/useAuth'
import { useAuthStore } from '@/lib/store/authStore'
import { requestGuestEmailVerification, confirmGuestEmailVerification } from '@/lib/api/auth'
import { resolveApiErrorMessage } from '@/lib/utils/apiError'
import type {
  GatheringDetail,
  FormQuestionDetail,
  AnswerItem,
  UserProfile,
} from '@/lib/api/types'

type FieldValue = string | number | string[]

interface DynamicApplicationFormProps {
  gathering: GatheringDetail
  forceGuest?: boolean
}

// 질문 값이 비었는지 판정 (필수 검증용)
function isEmpty(question: FormQuestionDetail, value: FieldValue | undefined): boolean {
  if (value === undefined) return true
  if (question.type === 'MULTI_CHOICE') return !Array.isArray(value) || value.length === 0
  if (question.type === 'MBTI_INPUT') return typeof value !== 'string' || value.length !== 4 || value.includes('·')
  if (question.type === 'NUMBER') return value === '' || Number.isNaN(Number(value))
  return value === '' || value === null
}

// 회원 프로필에서 questionKey에 대응하는 초기값을 뽑는다.
function prefillFromProfile(question: FormQuestionDetail, profile: UserProfile): FieldValue | undefined {
  switch (question.questionKey) {
    case 'gender':
      return profile.gender ?? undefined
    case 'age':
      return profile.age ?? undefined
    case 'job':
    case 'job_category':
      return profile.job ?? undefined
    case 'mbti':
      return profile.mbti && profile.mbti.length === 4 ? profile.mbti : undefined
    case 'intro':
      return profile.intro ?? profile.bio ?? undefined
    case 'instagram_id':
      return profile.instagramId ?? undefined
    default:
      return undefined
  }
}

export default function DynamicApplicationForm({ gathering, forceGuest = false }: DynamicApplicationFormProps) {
  const t = useTranslations('gathering.apply.form')
  const tCommon = useTranslations('common')
  const router = useRouter()
  const { isLoggedIn } = useAuthStore()
  const { data: profile } = useMyProfile()
  const isGuestMode = forceGuest || !isLoggedIn

  const { data: form, isLoading, isError, refetch } = useGatheringForm(gathering.id)
  const memberMutation = useSubmitDynamicApplication()
  const guestMutation = useSubmitDynamicGuestApplication()

  const [answers, setAnswers] = useState<Record<string, FieldValue>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [emailCode, setEmailCode] = useState('')
  const [emailRequested, setEmailRequested] = useState(false)
  const [emailVerified, setEmailVerified] = useState(false)
  const [emailBusy, setEmailBusy] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(0)

  // 인증번호 유효시간(5분) 카운트다운. 0이 되면 만료된다.
  useEffect(() => {
    if (secondsLeft <= 0) return
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000)
    return () => clearTimeout(timer)
  }, [secondsLeft])

  // 회원은 시스템 예약 질문(이름/연락처)을 계정값으로 처리하므로 폼에서 숨긴다.
  const questions = useMemo<FormQuestionDetail[]>(() => {
    const list = form?.questions ?? []
    const visible = isGuestMode ? list : list.filter((q) => !q.systemReserved)
    return [...visible].sort((a, b) => a.displayOrder - b.displayOrder)
  }, [form, isGuestMode])

  // 회원 프로필 초기값은 state에 넣지 않고 렌더 시 fallback으로 해석한다.
  // (사용자가 직접 입력하면 answers에 들어가 우선 적용된다.)
  const getValue = (q: FormQuestionDetail): FieldValue | undefined => {
    if (answers[q.questionId] !== undefined) return answers[q.questionId]
    if (isGuestMode || !profile) return undefined
    return prefillFromProfile(q, profile)
  }

  const setValue = (questionId: string, value: FieldValue) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
    setErrors((prev) => {
      if (!prev[questionId]) return prev
      const next = { ...prev }
      delete next[questionId]
      return next
    })
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)

    if (isGuestMode && !emailVerified) {
      setSubmitError('이메일 인증을 완료해주세요.')
      return
    }

    // 필수 검증
    const nextErrors: Record<string, string> = {}
    for (const q of questions) {
      if (q.required && isEmpty(q, getValue(q))) {
        nextErrors[q.questionId] = t('requiredError')
      }
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    // 답변 payload 구성 (비어있는 선택 항목은 제외)
    const payload: AnswerItem[] = []
    for (const q of questions) {
      const v = getValue(q)
      if (v === undefined || isEmpty(q, v)) continue
      payload.push({ questionId: q.questionId, value: q.type === 'NUMBER' ? Number(v) : v })
    }

    try {
      if (isGuestMode) {
        const result = await guestMutation.mutateAsync({ gatheringId: gathering.id, data: { answers: payload } })
        if (gathering.gatheringType === 'RANDOM_TABLE' && result.status === 'PAYMENT_PENDING') {
          router.push(`/payments/random-table?bookingNumber=${encodeURIComponent(result.bookingNumber)}`)
          return
        }
        if (gathering.gatheringType === 'RANDOM_TABLE' && result.status === 'CONFIRMED') {
          router.push(`/gatherings/${gathering.id}/apply/confirmed?bookingNumber=${encodeURIComponent(result.bookingNumber)}`)
          return
        }
        router.push(`/gatherings/${gathering.id}/apply/complete?bookingNumber=${result.bookingNumber}&status=${result.status}`)
      } else {
        const result = await memberMutation.mutateAsync({ gatheringId: gathering.id, data: { answers: payload } })
        if (gathering.gatheringType === 'RANDOM_TABLE' && result.status === 'PAYMENT_PENDING') {
          router.push(`/gatherings/${gathering.id}/apply/complete?applicationId=${encodeURIComponent(result.id)}&status=${result.status}`)
          return
        }
        if (gathering.gatheringType === 'RANDOM_TABLE' && result.status === 'CONFIRMED') {
          router.push(`/gatherings/${gathering.id}/apply/confirmed`)
          return
        }
        router.push(`/gatherings/${gathering.id}/apply/complete?status=${result.status}`)
      }
    } catch (err) {
      setSubmitError(resolveApiErrorMessage(err, tCommon))
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (isError || !form) {
    return <ApiErrorMessage message={t('loadFailed')} onRetry={() => { refetch() }} />
  }

  const isPending = isGuestMode ? guestMutation.isPending : memberMutation.isPending
  const emailQuestion = questions.find((q) => q.questionKey === 'email')
  const guestEmail = emailQuestion ? String(getValue(emailQuestion) ?? '').trim() : ''

  const requestEmailCode = async () => {
    if (!guestEmail) { setEmailError('이메일을 먼저 입력해주세요.'); return }
    setEmailBusy(true); setEmailError(null)
    try {
      await requestGuestEmailVerification(guestEmail)
      setEmailRequested(true); setEmailVerified(false); setEmailCode(''); setSecondsLeft(300)
    } catch { setEmailError('인증번호 발송에 실패했어요.') }
    finally { setEmailBusy(false) }
  }

  const confirmEmailCode = async () => {
    if (!/^\d{6}$/.test(emailCode)) { setEmailError('6자리 인증번호를 입력해주세요.'); return }
    setEmailBusy(true); setEmailError(null)
    try {
      await confirmGuestEmailVerification(guestEmail, emailCode)
      setEmailVerified(true)
    } catch { setEmailError('인증번호가 올바르지 않거나 만료됐어요.') }
    finally { setEmailBusy(false) }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      {isGuestMode ? (
        <Card className="p-4 bg-tag-bg border border-tag-bg">
          <div className="flex items-start gap-2.5">
            <AlertTriangle size={18} className="text-primary mt-0.5 shrink-0" />
            <p className="text-sm text-tag-text">
              {t('guestMileageNotice')}{' '}
              <button
                type="button"
                onClick={() => router.push('/login')}
                className="text-primary font-semibold underline"
              >
                {t('loginToApply')}
              </button>
              {t('loginBenefitSuffix')}
            </p>
          </div>
        </Card>
      ) : (
        <div className="flex items-center gap-2 px-4 py-3 bg-primary-light rounded-input">
          <CheckCircle size={18} className="text-primary shrink-0" />
          <p className="text-sm text-primary font-medium">
            {t('memberMileageNotice', { mileage: gathering.mileageReward || 500 })}
          </p>
        </div>
      )}

      {form.guideText && (
        <p className="text-sm text-tag-text whitespace-pre-line">{form.guideText}</p>
      )}

      <div className="flex flex-col gap-5">
        {questions.map((q) => (
          <div key={q.questionId} className="flex flex-col gap-2">
            <DynamicQuestionField question={q} value={getValue(q)} error={errors[q.questionId]}
              onChange={(value) => {
                setValue(q.questionId, value)
                if (q.questionKey === 'email') { setEmailRequested(false); setEmailVerified(false); setEmailCode(''); setSecondsLeft(0) }
              }} />
            {isGuestMode && q.questionKey === 'email' && (
              <div className="flex flex-col gap-2">
                <Button type="button" variant="outlined" size="default" onClick={requestEmailCode} disabled={emailBusy || emailVerified}>
                  {emailVerified ? '이메일 인증 완료' : emailRequested ? '인증번호 재발송' : '인증번호 요청'}
                </Button>
                {emailRequested && !emailVerified && <div className="flex flex-col gap-1">
                  <div className="flex gap-2 items-center">
                    <div className="relative flex-1 min-w-0">
                      <input value={emailCode} onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        inputMode="numeric" placeholder="6자리 인증번호" className="w-full px-4 py-3 pr-16 rounded-input border border-tag-bg bg-card text-sm" />
                      {secondsLeft > 0 && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-primary tabular-nums">
                          {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, '0')}
                        </span>
                      )}
                    </div>
                    <Button type="button" variant="primary" size="default" onClick={confirmEmailCode} disabled={emailBusy || secondsLeft === 0}>확인</Button>
                  </div>
                  {secondsLeft === 0 && <p className="text-xs text-tag-text">인증번호가 만료됐어요. 재발송해주세요.</p>}
                </div>}
                {emailError && <p className="text-xs text-primary">{emailError}</p>}
              </div>
            )}
          </div>
        ))}
      </div>

      {submitError && <p className="text-sm text-primary text-center">{submitError}</p>}

      <div className="pt-2 pb-4">
        <Button type="submit" variant="primary" size="lg" className="w-full" isLoading={isPending}>
          {t('submit')}
        </Button>
      </div>
    </form>
  )
}
