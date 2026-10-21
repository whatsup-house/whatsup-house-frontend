'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { ApiErrorMessage, Button, Card, LoadingSpinner } from '@/components/ui'
import DynamicQuestionField from './DynamicQuestionField'
import GatheringSessionList from './GatheringSessionList'
import TicketPassSection from './TicketPassSection'
import PaymentPolicyNotice, { POLICY_CONFIRM_ID } from '@/components/payment/PaymentPolicyNotice'
import RefundAccountForm from '@/components/payment/RefundAccountForm'
import { isEmpty, prefillFromProfile, type FieldValue } from './DynamicApplicationForm'
import { useMyProfile } from '@/lib/hooks/useAuth'
import { useDiningPrefill, useDiningRegions, useSubmitDynamicApplication } from '@/lib/hooks/useApplications'
import { useGatheringForm } from '@/lib/hooks/useForm'
import { useGatheringDetail } from '@/lib/hooks/useGatherings'
import { useHorizontalSwipe } from '@/lib/hooks/useHorizontalSwipe'
import { useRequireAuth } from '@/lib/hooks/useRequireAuth'
import { useMyTickets } from '@/lib/hooks/useTickets'
import { useToastStore } from '@/lib/store/toastStore'
import { getApiErrorCode, getApiErrorMessage } from '@/lib/utils/apiError'
import { formatLocalizedShortDate, formatTime } from '@/lib/utils/date'
import { getUpcomingSessions, isSessionApplicable } from '@/lib/utils/gatheringStatus'
import { findActiveMembership } from '@/lib/utils/membership'
import type { AnswerItem, DepositReturnAccount, FormQuestionDetail, GatheringSession } from '@/lib/api/types'

type Step = 1 | 2 | 3
const STEP_KEYS = ['sessions', 'form', 'ticket'] as const

// 회차·지역 검증 실패(마감·다른 종류·모집중 아님·지역 누락)는 1단계로, 답변 검증 실패는 2단계로 돌려보낸다.
const SESSION_ERROR_CODES = new Set([
  'SESSION_GATHERING_MISMATCH', 'GATHERING_NOT_RECRUITING', 'APPLY_DEADLINE_PASSED', 'SESSION_NOT_FOUND', 'REGION_REQUIRED', 'INVALID_REGION',
])
const ANSWER_ERROR_CODES = new Set(['REQUIRED_ANSWER_MISSING', 'INVALID_QUESTION'])

// 단계 이동·이용권 구매 화면 왕복에도 입력을 유지하려고 sessionStorage에 둔다. 제출에 성공하면 지운다.
interface DiningApplyDraft {
  step: Step
  sessionIds: string[]                    // 고른 순서 = 우선순위
  regions: string[]                       // 희망 지역 라벨 (KAN-433)
  answers: Record<string, FieldValue>     // questionId → 직접 입력한 값 (프리필은 렌더 시 fallback)
  refundAccount: DepositReturnAccount     // 보증금 반환 계좌 입력 (보증금 대상만 쓴다)
}

const EMPTY_REFUND_ACCOUNT: DepositReturnAccount = { bank: '', accountNumber: '', holder: '' }

const onlyDigits = (value: string) => value.replace(/\D/g, '')

const draftKey = (gatheringId: string) => `dining-apply:${gatheringId}`

function readDraft(gatheringId: string): DiningApplyDraft | null {
  if (typeof window === 'undefined') return null
  try {
    const parsed: unknown = JSON.parse(window.sessionStorage.getItem(draftKey(gatheringId)) ?? 'null')
    if (typeof parsed !== 'object' || parsed === null) return null
    const { step, sessionIds, regions, answers, refundAccount } = parsed as Partial<DiningApplyDraft>
    if (!Array.isArray(sessionIds) || typeof answers !== 'object' || answers === null) return null
    const savedRegions = Array.isArray(regions) ? regions.filter((r): r is string => typeof r === 'string') : []
    return {
      // 지역 도입 전 초안엔 지역이 없다 → 1단계부터 다시 고르게 한다 (첫 칩 선택에 저장된 단계로 튀지 않게)
      step: savedRegions.length > 0 && (step === 2 || step === 3) ? step : 1,
      sessionIds: sessionIds.filter((id): id is string => typeof id === 'string'),
      regions: savedRegions,
      answers,
      refundAccount: {
        bank: typeof refundAccount?.bank === 'string' ? refundAccount.bank : '',
        accountNumber: typeof refundAccount?.accountNumber === 'string' ? refundAccount.accountNumber : '',
        holder: typeof refundAccount?.holder === 'string' ? refundAccount.holder : '',
      },
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
  const tPolicy = useTranslations('payment.policy')
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const showToast = useToastStore((state) => state.show)
  const { data: profile } = useMyProfile()
  const { data: prefill } = useDiningPrefill(gatheringId, true)
  const { data: tickets } = useMyTickets()
  const regionsQuery = useDiningRegions()
  const submitMutation = useSubmitDynamicApplication()

  // 마운트 때 한 번만 정한다 → 이후 1단계에서 바꾼 선택을 ?session= 이 덮어쓰지 않는다. (KAN-389)
  const [draft, setDraft] = useState<DiningApplyDraft>(() => {
    const saved = readDraft(gatheringId)
    // ?session= 없음 = 이용권 구매 후 복귀(TicketPassSection returnUrl) 등 → 저장된 단계를 이어간다.
    if (!initialSessionId) return saved ?? { step: 1, sessionIds: [], regions: [], answers: {}, refundAccount: EMPTY_REFUND_ACCOUNT }
    // 상세에서 회차를 골라 들어옴 → 1단계부터, 그 회차를 1지망으로(이미 골랐으면 맨 앞으로). 다른 선택·답변은 유지.
    return {
      step: 1,
      sessionIds: [initialSessionId, ...(saved?.sessionIds ?? []).filter((id) => id !== initialSessionId)],
      regions: saved?.regions ?? [],
      answers: saved?.answers ?? {},
      refundAccount: saved?.refundAccount ?? EMPTY_REFUND_ACCOUNT,
    }
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [refundErrors, setRefundErrors] = useState<Partial<Record<keyof DepositReturnAccount, string>>>({})
  // 단계 전환 슬라이드 방향. 첫 화면은 애니메이션 없이.
  const [slide, setSlide] = useState<'next' | 'prev' | null>(null)
  // 신청 주의사항 확인. 매번 새로 체크한다(초안에 저장하지 않음). 안 체크하고 제출하면 0.5초 강조. (KAN-419)
  const [policyConfirmed, setPolicyConfirmed] = useState(false)
  const [policyHighlighted, setPolicyHighlighted] = useState(false)
  const highlightTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(highlightTimer.current), [])

  useEffect(() => {
    try {
      // 계좌번호는 저장하지 않는다 (이용권 화면에 다녀오면 다시 입력)
      window.sessionStorage.setItem(draftKey(gatheringId), JSON.stringify({ ...draft, refundAccount: { ...draft.refundAccount, accountNumber: '' } }))
    } catch {
      // 저장소를 못 쓰는 환경(사생활 보호 모드 등)에선 화면 안에서만 유지한다.
    }
  }, [gatheringId, draft])

  // 반영한 ?session= 은 URL 에서 지운다 → 새로고침해도 진행 중인 단계를 이어간다. (KAN-389)
  // router.replace 라 서버 props(initialSessionId)도 null 로 맞춰지고, 쿼리만 바뀌어 이 컴포넌트 상태는 유지된다.
  useEffect(() => {
    if (initialSessionId) router.replace(pathname, { scroll: false })
  }, [initialSessionId, pathname, router])

  // 모바일 키보드가 올라와(resizes-content) 포커스된 입력칸으로 스크롤할 때 하단 고정 바 뒤로 숨지 않게 비켜 간다. (KAN-389)
  useEffect(() => {
    const root = document.documentElement
    root.style.scrollPaddingBottom = 'calc(5.5rem + env(safe-area-inset-bottom))'
    return () => { root.style.scrollPaddingBottom = '' }
  }, [])

  const upcomingSessions = getUpcomingSessions(sessions)
  // 그새 마감된 회차는 선택에서 뺀다 (저장된 초안, 서버 400 후 재조회 모두 여기서 걸러진다).
  const selectedSessions = draft.sessionIds
    .map((id) => upcomingSessions.find((session) => session.id === id))
    .filter((session): session is GatheringSession => !!session && isSessionApplicable(session))
  const selectedIds = selectedSessions.map((session) => session.id)
  // 지역 목록이 오면 모르는 라벨은 빼고 목록 순서로 맞춘다. 오기 전엔 초안 그대로 둬 저장된 단계가 1단계로 튀지 않게 한다.
  const regionOptions = regionsQuery.data
  const selectedRegions = regionOptions ? regionOptions.filter((region) => draft.regions.includes(region)) : draft.regions
  // 희망 회차·지역을 하나 이상 골라야 다음으로 간다
  const canProceed = selectedIds.length > 0 && selectedRegions.length > 0
  const step: Step = canProceed ? draft.step : 1

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

  const goToStep = (next: Step) => {
    // 같은 단계면 방향을 바꾸지 않는다 (클래스가 바뀌면 애니메이션이 다시 돈다)
    if (next !== step) setSlide(next > step ? 'next' : 'prev')
    setDraft((prev) => ({ ...prev, step: next }))
  }

  // 맨 위로: 모바일은 문서, lg 프레임은 내부 스크롤(main)이 스크롤 컨테이너라 루트를 scrollIntoView 해 둘 다 맞춘다.
  // 루트의 scroll-mt-16 이 sticky 상단바(h-14 + 테두리) 자리를 비워 둔다. smooth 없이 즉시 (기존 동작 유지). (KAN-389)
  const rootRef = useRef<HTMLDivElement>(null)
  const scrollToTop = () => rootRef.current?.scrollIntoView({ block: 'start' })

  const moveTo = (next: Step) => {
    goToStep(next)
    scrollToTop()
  }

  const toggleSession = (sessionId: string) => {
    setDraft((prev) => ({
      ...prev,
      sessionIds: prev.sessionIds.includes(sessionId)
        ? prev.sessionIds.filter((id) => id !== sessionId)
        : [...prev.sessionIds, sessionId],
    }))
  }

  const toggleRegion = (region: string) => {
    setDraft((prev) => ({
      ...prev,
      regions: prev.regions.includes(region) ? prev.regions.filter((r) => r !== region) : [...prev.regions, region],
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
    goToStep(2)
    showToast(t('requiredMissing'), 'error')
    requestAnimationFrame(() => {
      document.getElementById(`dining-question-${firstMissing}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
    return false
  }

  const handleNext = () => {
    if (!canProceed) return   // 다음 버튼 disabled 와 같은 조건 (스와이프도 여기로 온다)
    if (step === 1) moveTo(2)
    else if (validateAnswers()) moveTo(3)
  }

  // 오른쪽으로 밀면 이전, 왼쪽으로 밀면 다음(버튼과 같은 검증). 마지막 단계에서 왼쪽 스와이프는 제출하지 않는다.
  const swipeHandlers = useHorizontalSwipe({
    onSwipeLeft: () => { if (step < 3) handleNext() },
    onSwipeRight: () => { if (step > 1) moveTo(step === 3 ? 2 : 1) },
  })

  // 보증금 대상은 반환 계좌가 필수다. 비었으면 항목을 강조하고 계좌 입력 칸으로 스크롤한다. 다 채웠으면 true.
  const depositRequired = profile?.depositRequired === true
  const validateRefundAccount = (): boolean => {
    if (!depositRequired) return true
    const missing: Partial<Record<keyof DepositReturnAccount, string>> = {}
    for (const key of ['bank', 'accountNumber', 'holder'] as const) {
      if (!(key === 'accountNumber' ? onlyDigits(draft.refundAccount[key]) : draft.refundAccount[key].trim())) missing[key] = tForm('requiredError')
    }
    if (Object.keys(missing).length === 0) return true
    setRefundErrors(missing)
    showToast(t('refundMissing'), 'error')
    requestAnimationFrame(() => {
      document.getElementById('dining-refund-account')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
    return false
  }

  // 주의사항 미확인이면 토스트 + 체크박스로 스크롤 + 0.5초 강조. 확인했으면 true.
  const validatePolicyConfirmed = (): boolean => {
    if (policyConfirmed) return true
    showToast(tPolicy('confirmRequired'), 'error')
    // lg 프레임은 main 이 내부 스크롤이라 window 기준으로 가려짐을 판단할 수 없다 → 항상 가운데로 끌어온다
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    document.getElementById(POLICY_CONFIRM_ID)?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' })
    clearTimeout(highlightTimer.current)
    setPolicyHighlighted(true)
    highlightTimer.current = setTimeout(() => setPolicyHighlighted(false), 500)
    return false
  }

  const handleSubmit = () => {
    if (!validatePolicyConfirmed() || !validateAnswers() || !validateRefundAccount()) return
    // 답변 payload (비어 있는 선택 항목은 제외) — 기존 신청 폼과 같은 규칙
    const answers: AnswerItem[] = []
    for (const question of visibleQuestions) {
      const value = getValue(question)
      if (value === undefined || isEmpty(question, value)) continue
      answers.push({ questionId: question.questionId, value: question.type === 'NUMBER' ? Number(value) : value })
    }
    const { bank, accountNumber, holder } = draft.refundAccount
    const depositReturnAccount = depositRequired
      ? { bank: bank.trim(), accountNumber: onlyDigits(accountNumber), holder: holder.trim() }
      : undefined
    submitMutation.mutate({ gatheringId, candidateSessionIds: selectedIds, candidateRegions: selectedRegions, answers, depositReturnAccount }, {
      onSuccess: (result) => {
        window.sessionStorage.removeItem(draftKey(gatheringId))
        if (result.status === 'PAYMENT_PENDING') {
          // 이용권 구매가 필요한지, 보증금만 남았는지는 결제 화면이 서버 데이터로 정한다.
          router.replace(`/payments/random-table?applicationId=${encodeURIComponent(result.id)}`)
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
          regionsQuery.refetch()
        } else if (code && ANSWER_ERROR_CODES.has(code)) {
          moveTo(2)
        } else if (code === 'DEPOSIT_ACCOUNT_REQUIRED') {
          moveTo(3)
        }
      },
    })
  }

  return (
    // 바텀 네비를 숨긴 화면이라 하단은 단계 이동 고정 바가 차지한다. 바는 흐름 안의 sticky 라 본문 끝을 가리지 않는다.
    <div ref={rootRef} className="flex min-h-screen scroll-mt-16 flex-col bg-background" {...swipeHandlers}>
      {/* overflow-x-clip: 슬라이드 중 본문이 옆으로 삐져나와 가로 스크롤이 생기지 않게 (clip 은 sticky 를 깨지 않는다) */}
      <div className="flex-1 overflow-x-clip px-4 pt-4 pb-6">
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

        <div key={step} className={slide === 'next' ? 'animate-step-next' : slide === 'prev' ? 'animate-step-prev' : undefined}>
          {step === 1 && (
            <>
              {/* 희망 지역 복수 선택 — 모든 회차가 서울 4개 지역에서 열린다 (KAN-433) */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-1 h-5 bg-primary rounded-full" />
                  <h2 className="text-base font-bold text-foreground">{t('regionsTitle')}</h2>
                  <span className="text-xs text-tag-text">{t('regionsMulti')}</span>
                </div>
                <p className="mb-3 text-sm text-tag-text">{t('regionsGuide')}</p>
                {regionOptions ? (
                  <div role="group" aria-label={t('regionsTitle')} className="grid grid-cols-2 gap-2">
                    {regionOptions.map((region) => {
                      const isSelected = selectedRegions.includes(region)
                      return (
                        <button
                          key={region}
                          type="button"
                          aria-pressed={isSelected}
                          onClick={() => toggleRegion(region)}
                          className={`px-4 py-2.5 rounded-input text-sm text-center font-medium transition-colors min-h-[44px] ${
                            isSelected ? 'bg-primary text-white' : 'bg-tag-bg text-tag-text'
                          }`}
                        >
                          {region}
                        </button>
                      )
                    })}
                  </div>
                ) : regionsQuery.isError ? (
                  <ApiErrorMessage message={t('regionsLoadFailed')} onRetry={() => { regionsQuery.refetch() }} />
                ) : (
                  <div className="flex justify-center py-4"><LoadingSpinner /></div>
                )}
              </div>
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
                <p className="text-xs text-tag-text mt-4 mb-1">{t('selectedRegionsTitle')}</p>
                <p className="text-sm text-foreground">{selectedRegions.join(', ')}</p>
              </Card>
              {needsTicket && (
                <>
                  <TicketPassSection returnUrl={`/gatherings/${gatheringId}/apply/dining`} />
                  {tickets?.totalRemaining === 0 && !findActiveMembership(tickets.passes) && (
                    <p className="mb-4 rounded-input bg-tag-bg px-4 py-3 text-sm text-tag-text">{t('noTicketNotice')}</p>
                  )}
                </>
              )}
              {depositRequired && (
                <div id="dining-refund-account">
                  <RefundAccountForm
                    value={draft.refundAccount}
                    errors={refundErrors}
                    onChange={(refundAccount) => {
                      setDraft((prev) => ({ ...prev, refundAccount }))
                      setRefundErrors({})
                    }}
                  />
                </div>
              )}
              <PaymentPolicyNotice
                confirmed={policyConfirmed}
                onConfirmedChange={setPolicyConfirmed}
                highlighted={policyHighlighted}
              />
            </>
          )}
        </div>
      </div>

      {/* 단계 이동 — 하단 고정 바 (게더링 상세 신청 바와 같은 모양). lg 프레임에선 내부 스크롤(main) 하단에 붙는다.
          두 버튼은 같은 크기, 이전은 outlined·다음은 primary 로만 구분(투명 테두리로 outlined 테두리 1px 까지 맞춤). 1단계는 다음만 전체 폭. */}
      <div className="sticky bottom-0 z-40 flex gap-2 border-t border-tag-bg/50 bg-card px-4 pt-3 pb-[max(env(safe-area-inset-bottom),12px)]">
        {step > 1 && (
          <Button variant="outlined" className="flex-1" onClick={() => moveTo(step === 3 ? 2 : 1)}>
            {t('prev')}
          </Button>
        )}
        {step < 3 ? (
          <Button variant="primary" className="flex-1 border border-transparent" disabled={!canProceed} onClick={handleNext}>
            {t('next')}
          </Button>
        ) : (
          // 미확인이어도 눌러서 안내를 받을 수 있게 disabled 대신 aria-disabled + 흐리게만 한다
          <Button
            variant="primary"
            className={`flex-1 border border-transparent ${policyConfirmed ? '' : 'opacity-50 hover:opacity-50'}`}
            aria-disabled={!policyConfirmed}
            isLoading={submitMutation.isPending}
            onClick={handleSubmit}
          >
            {t('submit')}
          </Button>
        )}
      </div>
    </div>
  )
}
