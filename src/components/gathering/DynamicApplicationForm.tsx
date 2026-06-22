'use client'

import { useState, useMemo } from 'react'
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
        router.push(`/gatherings/${gathering.id}/apply/complete?bookingNumber=${result.bookingNumber}`)
      } else {
        await memberMutation.mutateAsync({ gatheringId: gathering.id, data: { answers: payload } })
        router.push(`/gatherings/${gathering.id}/apply/complete`)
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
          <DynamicQuestionField
            key={q.questionId}
            question={q}
            value={getValue(q)}
            error={errors[q.questionId]}
            onChange={(value) => setValue(q.questionId, value)}
          />
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
