'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { ApiErrorMessage, Button, Card, LoadingSpinner } from '@/components/ui'
import DynamicQuestionField from './DynamicQuestionField'
import GatheringSessionList from './GatheringSessionList'
import TicketPassSection from './TicketPassSection'
import { isEmpty, prefillFromProfile, type FieldValue } from './DynamicApplicationForm'
import { useMyProfile } from '@/lib/hooks/useAuth'
import { useDiningPrefill, useSubmitDynamicApplication } from '@/lib/hooks/useApplications'
import { useGatheringForm } from '@/lib/hooks/useForm'
import { useGatheringDetail } from '@/lib/hooks/useGatherings'
import { useRequireAuth } from '@/lib/hooks/useRequireAuth'
import { useMyTickets } from '@/lib/hooks/useTickets'
import { useToastStore } from '@/lib/store/toastStore'
import { getApiErrorCode, getApiErrorMessage } from '@/lib/utils/apiError'
import { formatLocalizedShortDate, formatTime } from '@/lib/utils/date'
import { getUpcomingSessions, isSessionApplicable } from '@/lib/utils/gatheringStatus'
import type { AnswerItem, FormQuestionDetail, GatheringSession } from '@/lib/api/types'

type Step = 1 | 2 | 3
const STEP_KEYS = ['sessions', 'form', 'ticket'] as const

// 회차 검증 실패(마감·다른 종류·모집중 아님)는 1단계로, 답변 검증 실패는 2단계로 돌려보낸다.
const SESSION_ERROR_CODES = new Set(['SESSION_GATHERING_MISMATCH', 'GATHERING_NOT_RECRUITING', 'APPLY_DEADLINE_PASSED', 'SESSION_NOT_FOUND'])
const ANSWER_ERROR_CODES = new Set(['REQUIRED_ANSWER_MISSING', 'INVALID_QUESTION'])

// 단계 이동·이용권 구매 화면 왕복에도 입력을 유지하려고 sessionStorage에 둔다. 제출에 성공하면 지운다.
interface DiningApplyDraft {
  step: Step
  sessionIds: string[]                    // 고른 순서 = 우선순위
  answers: Record<string, FieldValue>     // questionId → 직접 입력한 값 (프리필은 렌더 시 fallback)
}

const draftKey = (gatheringId: string) => `dining-apply:${gatheringId}`

function readDraft(gatheringId: string): DiningApplyDraft | null {
  if (typeof window === 'undefined') return null
  try {
    const parsed: unknown = JSON.parse(window.sessionStorage.getItem(draftKey(gatheringId)) ?? 'null')
    if (typeof parsed !== 'object' || parsed === null) return null
    const { step, sessionIds, answers } = parsed as Partial<DiningApplyDraft>
    if (!Array.isArray(sessionIds) || typeof answers !== 'object' || answers === null) return null
    return {
      step: step === 2 || step === 3 ? step : 1,
      sessionIds: sessionIds.filter((id): id is string => typeof id === 'string'),
      answers,
    }
  } catch {
    return null
  }
}

interface DiningApplyFlowProps {
  gatheringId: string
  initialSessionId: string | null   // 종류 페이지에서 고른 회차 → 1지망으로 미리 선택
}

// 우연한 식탁 단계형 신청: 희망 회차 복수 선택 → 표준 폼(프리필) → 이용권 확인 → 제출 (KAN-344)
export default function DiningApplyFlow({ gatheringId, initialSessionId }: DiningApplyFlowProps) {
  const tForm = useTranslations('gathering.apply.form')
  const router = useRouter()
  const { isLoggedIn, isInitialized } = useRequireAuth()
  const gatheringQuery = useGatheringDetail(gatheringId)
  const gathering = gatheringQuery.data
  const isRandomTable = gathering?.gatheringType === 'RANDOM_TABLE'
  const formQuery = useGatheringForm(isRandomTable ? gathering.id : '')

  // 우연한 식탁은 회원 전용이다. 비로그인은 로그인 후 이 화면으로 돌아오게 한다.
  useEffect(() => {
    if (isInitialized && !isLoggedIn) {
      const target = `/gatherings/${gatheringId}/apply/dining${initialSessionId ? `?session=${encodeURIComponent(initialSessionId)}` : ''}`
      router.replace(`/login?returnUrl=${encodeURIComponent(target)}`)
    }
  }, [gatheringId, initialSessionId, isInitialized, isLoggedIn, router])

  // 일반 모임은 기존 신청 흐름(종류 페이지)으로 돌려보낸다.
  useEffect(() => {
    if (gathering && !isRandomTable) router.replace(`/gatherings/${gathering.id}`)
  }, [gathering, isRandomTable, router])

  const spinner = (
    <div className="flex justify-center items-center min-h-screen bg-background">
      <LoadingSpinner size="lg" />
    </div>
  )

  if (!isInitialized || !isLoggedIn || gatheringQuery.isPending) return spinner

  if (gatheringQuery.isError || !gathering) {
    return (
      <div className="min-h-screen bg-background px-4 pt-20">
        <ApiErrorMessage message={tForm('gatheringLoadFailed')} onRetry={() => { gatheringQuery.refetch() }} />
      </div>
    )
  }

  if (!isRandomTable || formQuery.isPending) return spinner

  if (formQuery.isError) {
    return (
      <div className="min-h-screen bg-background px-4 pt-20">
        <ApiErrorMessage message={tForm('loadFailed')} onRetry={() => { formQuery.refetch() }} />
      </div>
    )
  }

  return (
    <DiningApplySteps
      key={gathering.id}
      gatheringId={gathering.id}
      title={gathering.title}
      sessions={gathering.sessions}
      needsTicket={gathering.basePrice !== 0}
      guideText={formQuery.data.guideText}
      questions={formQuery.data.questions}
      initialSessionId={initialSessionId}
      onSessionsStale={() => { gatheringQuery.refetch() }}
    />
  )
}

interface DiningApplyStepsProps {
  gatheringId: string
  title: string
  sessions: GatheringSession[]
  // 매칭 전 신청은 종류 기본 가격으로 이용권 필요 여부가 정해진다 (BE requiresRandomTableTicket)
  needsTicket: boolean
  guideText: string | null
  questions: FormQuestionDetail[]
  initialSessionId: string | null
  onSessionsStale: () => void
}

// 부모가 데이터 로딩 전엔 스피너만 그리므로 클라이언트에서만 마운트된다 → sessionStorage를 초기값으로 읽어도 hydration 불일치가 없다.
function DiningApplySteps({
  gatheringId, title, sessions, needsTicket, guideText, questions, initialSessionId, onSessionsStale,
}: DiningApplyStepsProps) {
  const t = useTranslations('gathering.diningApply')
  const tForm = useTranslations('gathering.apply.form')
  const locale = useLocale()
  const router = useRouter()
  const showToast = useToastStore((state) => state.show)
  const { data: profile } = useMyProfile()
  const { data: prefill } = useDiningPrefill(gatheringId, true)
  const { data: tickets } = useMyTickets()
  const submitMutation = useSubmitDynamicApplication()

  const [draft, setDraft] = useState<DiningApplyDraft>(() => readDraft(gatheringId) ?? {
    step: 1,
    sessionIds: initialSessionId ? [initialSessionId] : [],
    answers: {},
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [paymentPendingId, setPaymentPendingId] = useState<string | null>(null)

  useEffect(() => {
    try {
      window.sessionStorage.setItem(draftKey(gatheringId), JSON.stringify(draft))
    } catch {
      // 저장소를 못 쓰는 환경(사생활 보호 모드 등)에선 화면 안에서만 유지한다.
    }
  }, [gatheringId, draft])

  const upcomingSessions = getUpcomingSessions(sessions)
  // 그새 마감된 회차는 선택에서 뺀다 (저장된 초안, 서버 400 후 재조회 모두 여기서 걸러진다).
  const selectedSessions = draft.sessionIds
    .map((id) => upcomingSessions.find((session) => session.id === id))
    .filter((session): session is GatheringSession => !!session && isSessionApplicable(session))
  const selectedIds = selectedSessions.map((session) => session.id)
  const step: Step = selectedIds.length === 0 ? 1 : draft.step

  // 회원은 이름/연락처를 계정값으로 처리하므로 시스템 예약 질문은 숨긴다 (기존 회원 신청과 동일).
  const visibleQuestions = questions
    .filter((question) => !question.systemReserved)
    .sort((a, b) => a.displayOrder - b.displayOrder)
  const prefillByKey = new Map(prefill?.answers.map((answer) => [answer.questionKey, answer.value]) ?? [])

  // 값 우선순위: 이번에 직접 입력 > 표준 질문 최근 답변(프리필) > 회원 프로필
  const getValue = (question: FormQuestionDetail): FieldValue | undefined => {
    const typed = draft.answers[question.questionId]
    if (typed !== undefined) return typed
    const prefilled = prefillByKey.get(question.questionKey)
    // 질문 형식이 바뀌어 예전 답의 모양(배열/단일값)이 안 맞으면 쓰지 않는다.
    if (prefilled !== undefined && Array.isArray(prefilled) === (question.type === 'MULTI_CHOICE')) return prefilled
    return profile ? prefillFromProfile(question, profile) : undefined
  }

  const moveTo = (next: Step) => {
    setDraft((prev) => ({ ...prev, step: next }))
    window.scrollTo({ top: 0 })
  }

  const toggleSession = (sessionId: string) => {
    setDraft((prev) => ({
      ...prev,
      sessionIds: prev.sessionIds.includes(sessionId)
        ? prev.sessionIds.filter((id) => id !== sessionId)
        : [...prev.sessionIds, sessionId],
    }))
  }

  const setAnswer = (questionId: string, value: FieldValue) => {
    setDraft((prev) => ({ ...prev, answers: { ...prev.answers, [questionId]: value } }))
    setErrors((prev) => {
      if (!prev[questionId]) return prev
      const next = { ...prev }
      delete next[questionId]
      return next
    })
  }

  // 필수 답변이 비었으면 2단계로 보내 항목을 강조하고 첫 누락 항목으로 스크롤한다. 다 채웠으면 true.
  const validateAnswers = (): boolean => {
    const missing: Record<string, string> = {}
    for (const question of visibleQuestions) {
      if (question.required && isEmpty(question, getValue(question))) missing[question.questionId] = tForm('requiredError')
    }
    const firstMissing = Object.keys(missing)[0]
    if (!firstMissing) return true
    setErrors(missing)
    setDraft((prev) => ({ ...prev, step: 2 }))
    showToast(t('requiredMissing'), 'error')
    requestAnimationFrame(() => {
      document.getElementById(`dining-question-${firstMissing}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
    return false
  }

  const handleNext = () => {
    if (step === 1) moveTo(2)
    else if (validateAnswers()) moveTo(3)
  }

  const handleSubmit = () => {
    if (!validateAnswers()) return
    // 답변 payload (비어 있는 선택 항목은 제외) — 기존 신청 폼과 같은 규칙
    const answers: AnswerItem[] = []
    for (const question of visibleQuestions) {
      const value = getValue(question)
      if (value === undefined || isEmpty(question, value)) continue
      answers.push({ questionId: question.questionId, value: question.type === 'NUMBER' ? Number(value) : value })
    }
    submitMutation.mutate({ gatheringId, candidateSessionIds: selectedIds, answers }, {
      onSuccess: (result) => {
        window.sessionStorage.removeItem(draftKey(gatheringId))
        if (result.status === 'PAYMENT_PENDING') {
          setPaymentPendingId(result.id)
          window.scrollTo({ top: 0 })
          return
        }
        showToast(t('submitted'), 'welcome')
        router.push('/mypage?tab=applications')
      },
      onError: (error) => {
        showToast(getApiErrorMessage(error, t('submitFailed')), 'error')
        const code = getApiErrorCode(error)
        if (code && SESSION_ERROR_CODES.has(code)) {
          moveTo(1)
          onSessionsStale()
        } else if (code && ANSWER_ERROR_CODES.has(code)) {
          moveTo(2)
        }
      },
    })
  }

  // 이용권 부족 → 결제 대기로 접수됨
  if (paymentPendingId) {
    return (
      <div className="min-h-screen bg-background px-4 py-6">
        <Card className="p-5 mb-5 bg-primary-light">
          <p className="text-xs font-bold text-primary mb-2">{t('paymentPendingTitle')}</p>
          <p className="font-bold text-foreground">{title}</p>
          <p className="text-sm text-tag-text mt-2">{t('paymentPendingDescription')}</p>
        </Card>
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          onClick={() => router.push(`/payments/random-table?applicationId=${encodeURIComponent(paymentPendingId)}`)}
        >
          {t('buyTicket')}
        </Button>
        <Button variant="outlined" size="lg" className="w-full mt-3" onClick={() => router.push('/mypage?tab=applications')}>
          {t('viewMyApplications')}
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="px-4 pt-4 pb-6">
        {/* 단계 표시 */}
        <p className="text-base font-bold text-foreground truncate">{title}</p>
        <div className="mt-3 mb-5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-primary">{t('stepProgress', { step })}</span>
            <span className="text-tag-text">{t(`steps.${STEP_KEYS[step - 1]}`)}</span>
          </div>
          <div className="mt-2 flex gap-1" aria-hidden>
            {[1, 2, 3].map((n) => (
              <div key={n} className={`h-1 flex-1 rounded-full ${n <= step ? 'bg-primary' : 'bg-tag-bg'}`} />
            ))}
          </div>
        </div>

        {step === 1 && (
          <>
            <p className="mb-4 text-sm text-tag-text">{t('sessionsGuide')}</p>
            <GatheringSessionList
              sessions={upcomingSessions}
              selectedSessionId={null}
              onSelect={toggleSession}
              priorityIds={selectedIds}
            />
          </>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-6">
            {guideText && <p className="text-sm text-tag-text whitespace-pre-line">{guideText}</p>}
            <div className="flex flex-col gap-7">
              {visibleQuestions.map((question) => (
                <div key={question.questionId} id={`dining-question-${question.questionId}`}>
                  <DynamicQuestionField
                    question={question}
                    value={getValue(question)}
                    error={errors[question.questionId]}
                    onChange={(value) => setAnswer(question.questionId, value)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <>
            <Card className="p-4 mb-4">
              <p className="text-xs text-tag-text mb-2">{t('selectedSessionsTitle')}</p>
              <ol className="flex flex-col gap-2">
                {selectedSessions.map((session, index) => (
                  <li key={session.id} className="flex items-center gap-2 text-sm text-foreground">
                    <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                      {index + 1}
                    </span>
                    {[
                      `${formatLocalizedShortDate(session.eventDate, locale)} ${formatTime(session.startTime)}`.trim(),
                      session.location?.name,
                    ].filter(Boolean).join(' · ')}
                  </li>
                ))}
              </ol>
            </Card>
            {needsTicket && (
              <>
                <TicketPassSection returnUrl={`/gatherings/${gatheringId}/apply/dining`} />
                {tickets?.totalRemaining === 0 && (
                  <p className="mb-4 rounded-input bg-tag-bg px-4 py-3 text-sm text-tag-text">{t('noTicketNotice')}</p>
                )}
              </>
            )}
          </>
        )}

        {/* 단계 이동 — 기존 신청 폼처럼 본문 끝에 둔다 (하단 내비와 겹치지 않게) */}
        <div className="flex gap-2 pt-6 pb-4">
          {step > 1 && (
            <Button variant="outlined" size="lg" className="flex-1" onClick={() => moveTo(step === 3 ? 2 : 1)}>
              {t('prev')}
            </Button>
          )}
          {step < 3 ? (
            <Button variant="primary" size="lg" className="flex-[2]" disabled={selectedIds.length === 0} onClick={handleNext}>
              {t('next')}
            </Button>
          ) : (
            <Button variant="primary" size="lg" className="flex-[2]" isLoading={submitMutation.isPending} onClick={handleSubmit}>
              {t('submit')}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
