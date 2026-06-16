'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import dayjs, { type Dayjs } from 'dayjs'
import { ArrowLeft, CalendarDays, ChevronLeft, ChevronRight, Eye, EyeOff, X } from 'lucide-react'
import { Button, Input } from '@/components/ui'
import { useCheckEmail, useCheckNickname } from '@/lib/hooks/useAuth'
import { useBackNavigation } from '@/lib/hooks/useBackNavigation'
import { getAge } from '@/lib/utils/date'
import type { Gender } from '@/lib/api/types'

export const REGISTER_SESSION_KEY = 'register-step1'
export const REGISTER_EMAIL_ERROR_KEY = 'register-email-error'

const PASSWORD_REGEX = /^(?=.*[a-zA-Z])(?=.*\d).+$/
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']
const REVEAL_DELAY_MS = 300

const schema = z.object({
  name: z.string().min(2, '이름은 2자 이상 입력해주세요'),
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
type PolicyId = 'terms' | 'privacy'

interface TermItem {
  id: string
  label: string
  required: boolean
  policyId?: PolicyId
}

interface PolicySection {
  title: string
  items: string[]
}

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: 'MALE', label: '남' },
  { value: 'FEMALE', label: '여' },
]

const TERMS: TermItem[] = [
  { id: 'age', label: '[필수] 만 14세 이상입니다', required: true },
  { id: 'terms', label: '[필수] 이용약관에 동의합니다', required: true, policyId: 'terms' },
  { id: 'privacy', label: '[필수] 개인정보처리방침에 동의합니다', required: true, policyId: 'privacy' },
  { id: 'marketing', label: '[선택] 마케팅 정보 수신에 동의합니다', required: false },
]

const POLICY_CONTENT: Record<PolicyId, { title: string; summary: string; sections: PolicySection[] }> = {
  terms: {
    title: '와썹하우스 이용약관',
    summary: '본 약관은 와썹하우스가 제공하는 게더링 탐색, 신청, 커뮤니티성 서비스의 이용 조건과 회원의 권리 및 의무를 정합니다.',
    sections: [
      {
        title: '제1조 목적',
        items: [
          '본 약관은 와썹하우스 서비스의 이용과 관련하여 회사와 회원 사이의 권리, 의무, 책임사항 및 서비스 이용 절차를 정하는 것을 목적으로 합니다.',
          '회원은 본 약관에 동의함으로써 서비스 내 게더링 조회, 신청, 프로필 작성, 알림 수신 등 회원 대상 기능을 이용할 수 있습니다.',
        ],
      },
      {
        title: '제2조 회원가입 및 계정 관리',
        items: [
          '회원은 정확하고 최신의 정보를 제공해야 하며, 허위 정보 또는 타인의 정보를 이용하여 가입할 수 없습니다.',
          '회원은 계정과 비밀번호를 직접 관리해야 하며, 관리 소홀로 발생한 손해는 회원에게 책임이 있습니다.',
          '만 14세 미만은 회원가입이 제한되며, 회사는 연령 확인이 필요한 경우 추가 확인을 요청할 수 있습니다.',
        ],
      },
      {
        title: '제3조 게더링 신청 및 참여',
        items: [
          '회원은 서비스에서 제공되는 게더링 정보를 확인한 뒤 직접 신청할 수 있으며, 신청 상태와 안내사항은 서비스 화면 또는 별도 알림으로 고지됩니다.',
          '게더링의 일정, 장소, 모집 인원, 참가 조건은 운영 상황에 따라 변경될 수 있으며, 중요한 변경 사항은 가능한 범위에서 사전에 안내합니다.',
          '회원은 게더링 참여 시 다른 참가자의 안전과 경험을 해치지 않도록 기본적인 예절과 운영 안내를 준수해야 합니다.',
        ],
      },
      {
        title: '제4조 결제, 취소 및 환불',
        items: [
          '유료 게더링이 제공되는 경우 결제 금액, 취소 가능 기한, 환불 기준은 각 게더링 상세 화면 또는 별도 고지에 따릅니다.',
          '회원의 단순 변심, 무단 불참, 운영 정책 위반으로 인한 제한에 대해서는 고지된 기준에 따라 환불이 제한될 수 있습니다.',
          '회사의 사정으로 게더링이 취소되는 경우 이미 결제한 금액은 관련 법령과 고지된 정책에 따라 환불됩니다.',
        ],
      },
      {
        title: '제5조 금지행위',
        items: [
          '회원은 타인의 개인정보 도용, 허위 신청, 서비스 운영 방해, 불법 홍보, 혐오 또는 차별 표현, 다른 회원에게 불쾌감을 주는 행위를 해서는 안 됩니다.',
          '회원이 금지행위를 한 경우 회사는 게시물 삭제, 서비스 이용 제한, 신청 취소, 계정 이용 정지 등 필요한 조치를 할 수 있습니다.',
        ],
      },
      {
        title: '제6조 서비스 변경 및 중단',
        items: [
          '회사는 안정적인 서비스 운영을 위해 기능, 화면, 정책을 변경할 수 있으며, 회원에게 중대한 영향을 미치는 변경은 서비스 내 공지 등으로 안내합니다.',
          '천재지변, 시스템 장애, 점검, 제휴사 또는 외부 플랫폼 장애 등 불가피한 사유가 있는 경우 서비스 제공이 일시적으로 중단될 수 있습니다.',
        ],
      },
      {
        title: '제7조 책임 제한 및 분쟁 처리',
        items: [
          '회사는 회사의 고의 또는 중대한 과실이 없는 한 회원 간의 오프라인 만남, 대화, 개인적 거래에서 발생한 문제에 대해 책임을 부담하지 않습니다.',
          '서비스 이용과 관련하여 분쟁이 발생한 경우 회사와 회원은 성실히 협의하여 해결하며, 관련 법령에 따른 관할 법원을 따릅니다.',
        ],
      },
      {
        title: '제8조 약관의 변경',
        items: [
          '회사는 필요한 경우 관련 법령을 위반하지 않는 범위에서 본 약관을 변경할 수 있습니다.',
          '변경된 약관은 적용일과 주요 변경 내용을 서비스 내 공지하며, 회원이 적용일 이후 서비스를 계속 이용하면 변경 약관에 동의한 것으로 봅니다.',
        ],
      },
    ],
  },
  privacy: {
    title: '와썹하우스 개인정보처리방침',
    summary: '와썹하우스는 회원가입, 게더링 신청 및 안전한 서비스 운영을 위해 필요한 범위에서 개인정보를 처리합니다.',
    sections: [
      {
        title: '제1조 개인정보의 처리 목적',
        items: [
          '회원 식별, 가입 의사 확인, 로그인 및 계정 관리, 부정 이용 방지, 만 14세 이상 여부 확인을 위해 개인정보를 처리합니다.',
          '게더링 신청, 참가자 관리, 운영 안내, 문의 응대, 공지 전달, 서비스 품질 개선 및 통계 분석을 위해 개인정보를 처리합니다.',
        ],
      },
      {
        title: '제2조 수집하는 개인정보 항목',
        items: [
          '필수 항목: 이름, 닉네임, 이메일, 비밀번호, 성별, 생년월일, 연락처',
          '선택 항목: 한 줄 소개, 직업, MBTI, 관심사, 인스타그램 ID, 프로필 이미지 등 회원이 직접 입력하거나 업로드한 정보',
          '자동 수집 항목: 서비스 이용 기록, 접속 로그, 쿠키, IP 주소, 기기 및 브라우저 정보, 오류 기록',
        ],
      },
      {
        title: '제3조 개인정보의 보유 및 이용기간',
        items: [
          '개인정보는 회원 탈퇴 또는 처리 목적 달성 시 지체 없이 파기합니다.',
          '관계 법령에 따라 보관이 필요한 경우에는 해당 법령에서 정한 기간 동안 분리하여 보관합니다.',
          '부정 이용 방지, 분쟁 대응, 고객 문의 이력 관리를 위해 필요한 최소 정보는 내부 정책에 따라 일정 기간 보관할 수 있습니다.',
        ],
      },
      {
        title: '제4조 개인정보의 제3자 제공',
        items: [
          '회사는 회원의 동의가 있거나 법령에 특별한 규정이 있는 경우를 제외하고 개인정보를 외부에 제공하지 않습니다.',
          '게더링 운영에 꼭 필요한 정보가 호스트 또는 제휴 운영자에게 제공되는 경우 제공 항목, 목적, 보유 기간을 사전에 안내합니다.',
        ],
      },
      {
        title: '제5조 개인정보 처리위탁',
        items: [
          '회사는 안정적인 서비스 제공을 위해 서버 운영, 메시지 발송, 결제, 고객 지원, 데이터 분석 등 일부 업무를 외부 업체에 위탁할 수 있습니다.',
          '위탁이 발생하는 경우 위탁받는 자, 업무 내용, 보유 및 이용기간을 서비스 내 공지 또는 별도 화면을 통해 안내합니다.',
        ],
      },
      {
        title: '제6조 개인정보의 파기',
        items: [
          '처리 목적이 달성된 개인정보는 복구 또는 재생되지 않도록 안전한 방법으로 파기합니다.',
          '전자 파일은 복구가 어려운 방식으로 삭제하고, 종이 문서는 분쇄 또는 소각합니다.',
        ],
      },
      {
        title: '제7조 이용자의 권리',
        items: [
          '회원은 언제든지 자신의 개인정보 열람, 정정, 삭제, 처리정지, 동의 철회를 요청할 수 있습니다.',
          '회원은 서비스 내 프로필 및 계정 설정을 통해 일부 정보를 직접 수정할 수 있으며, 추가 요청은 고객 문의 채널을 통해 접수할 수 있습니다.',
        ],
      },
      {
        title: '제8조 개인정보의 안전성 확보조치',
        items: [
          '회사는 개인정보 접근 권한 관리, 비밀번호 암호화, 접속 기록 보관, 보안 프로그램 적용 등 안전성 확보에 필요한 조치를 시행합니다.',
          '개인정보를 처리하는 구성원을 최소화하고, 개인정보 보호를 위한 내부 관리 기준을 마련합니다.',
        ],
      },
      {
        title: '제9조 쿠키 및 자동수집 장치',
        items: [
          '회사는 로그인 유지, 이용자 환경 개선, 서비스 분석을 위해 쿠키 등 자동수집 장치를 사용할 수 있습니다.',
          '회원은 브라우저 설정을 통해 쿠키 저장을 거부하거나 삭제할 수 있으나, 일부 기능 이용이 제한될 수 있습니다.',
        ],
      },
      {
        title: '제10조 개인정보 보호 문의',
        items: [
          '개인정보와 관련한 문의, 열람 또는 삭제 요청, 불만 처리는 서비스 내 고객 문의 채널 또는 운영팀 공지 채널을 통해 접수할 수 있습니다.',
          '회사는 접수된 문의에 대해 관련 법령과 내부 절차에 따라 신속하고 성실하게 답변합니다.',
        ],
      },
      {
        title: '제11조 처리방침의 변경',
        items: [
          '본 개인정보처리방침은 법령, 서비스, 내부 정책 변경에 따라 개정될 수 있습니다.',
          '중요한 변경 사항은 적용일 전 서비스 내 공지 등을 통해 안내합니다.',
        ],
      },
    ],
  },
}

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
          aria-label="이전 달"
        >
          <ChevronLeft size={20} className="text-tag-text" />
        </button>

        <div className="flex items-center gap-2">
          <select
            value={year}
            onChange={(e) => changeYear(Number(e.target.value))}
            className="h-9 rounded-input border border-tag-bg bg-background px-2 text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="연도 선택"
          >
            {birthYears.map((birthYear) => (
              <option key={birthYear} value={birthYear}>{birthYear}년</option>
            ))}
          </select>
          <select
            value={month}
            onChange={(e) => changeMonth(Number(e.target.value))}
            className="h-9 rounded-input border border-tag-bg bg-background px-2 text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="월 선택"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((birthMonth) => {
              const monthKey = `${year}-${String(birthMonth).padStart(2, '0')}`
              return (
                <option key={birthMonth} value={birthMonth} disabled={monthKey < minMonth || monthKey > maxMonth}>
                  {birthMonth}월
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
          aria-label="다음 달"
        >
          <ChevronRight size={20} className="text-tag-text" />
        </button>
      </div>

      <div className="grid grid-cols-7 mb-1">
        {DAY_LABELS.map((day, i) => (
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
}

function PolicyModal({ policyId, onClose }: PolicyModalProps) {
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

  const policy = POLICY_CONTENT[policyId]

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/30 px-4 pb-4 sm:items-center sm:pb-0"
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
            {policy.title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-[36px] min-w-[36px] items-center justify-center text-tag-text"
            aria-label="닫기"
          >
            <X size={18} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <p className="text-sm leading-relaxed text-tag-text">{policy.summary}</p>

          <div className="mt-5 flex flex-col gap-5">
            {policy.sections.map((section) => (
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
          <Button type="button" variant="primary" className="w-full" onClick={onClose}>
            확인
          </Button>
        </div>
      </section>
    </div>
  )
}

export default function RegisterPage() {
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
      setError('birthDate', { type: 'manual', message: '올바른 생년월일을 입력해주세요' })
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
            <div ref={(node) => { fieldRefs.current[1] = node }} className="animate-field-reveal flex flex-col gap-2">
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
            <div ref={(node) => { fieldRefs.current[2] = node }} className="animate-field-reveal flex flex-col gap-1">
              <label className="text-sm font-medium text-foreground">
                생년월일<span className="text-primary"> *</span>
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
                  aria-label={isBirthCalendarOpen ? '생년월일 달력 닫기' : '생년월일 달력 열기'}
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
                <p className="text-xs text-tag-text pl-1">만 {agePreview}세</p>
              )}
            </div>
          )}

          {/* 3. 닉네임 */}
          {visible(3) && (
            <div ref={(node) => { fieldRefs.current[3] = node }} className="animate-field-reveal flex flex-col gap-1">
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
            <div ref={(node) => { fieldRefs.current[4] = node }} className="animate-field-reveal flex flex-col gap-1">
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
            <div ref={(node) => { fieldRefs.current[5] = node }} className="animate-field-reveal flex flex-col gap-5">
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
            <div ref={(node) => { fieldRefs.current[6] = node }} className="animate-field-reveal">
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
            <div ref={(node) => { fieldRefs.current[7] = node }} className="animate-field-reveal bg-card rounded-card p-4 flex flex-col gap-3 border border-tag-bg/50">
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
                    <span className="text-sm text-tag-text">{term.label}</span>
                  </button>
                  {term.policyId && (
                    <button
                      type="button"
                      onClick={() => setPolicyModal(term.policyId ?? null)}
                      className="min-h-[44px] shrink-0 text-xs font-semibold text-primary"
                      aria-label={`${term.policyId === 'terms' ? '이용약관' : '개인정보처리방침'} 전문 보기`}
                    >
                      전문 보기
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
              다음
            </Button>
          )}
        </form>
      </div>
      <PolicyModal policyId={policyModal} onClose={() => setPolicyModal(null)} />
    </div>
  )
}
