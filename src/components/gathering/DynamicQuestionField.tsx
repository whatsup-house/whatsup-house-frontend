'use client'

import { useState } from 'react'
import dayjs, { type Dayjs } from 'dayjs'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { Input } from '@/components/ui'
import JobSelect from '@/components/auth/JobSelect'
import { useTranslations } from 'next-intl'
import type { FormQuestionDetail } from '@/lib/api/types'
import { getAge } from '@/lib/utils/date'

const MBTI_ROWS = [
  ['E', 'S', 'F', 'J'],
  ['I', 'N', 'T', 'P'],
] as const

// 성별 선택지는 값(MALE/FEMALE)은 유지하되 화면에는 한국어로 노출한다. (KAN-258)
const GENDER_CHOICE_LABEL_KEYS: Record<string, string> = { MALE: 'male', FEMALE: 'female' }
const QUESTION_LABEL_CLASS = 'text-[15px] leading-relaxed font-semibold text-foreground whitespace-pre-line'

type FieldValue = string | number | string[]

interface DynamicQuestionFieldProps {
  question: FormQuestionDetail
  value: FieldValue | undefined
  error?: string
  onChange: (value: FieldValue) => void
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

function BirthDateAgeField({
  label,
  required,
  value,
  error,
  onChange,
}: {
  label: string
  required: boolean
  value: FieldValue | undefined
  error?: string
  onChange: (value: number) => void
}) {
  const t = useTranslations('auth.register')
  const defaultBirthDate = getDefaultBirthDate()
  const [birthDate, setBirthDate] = useState('')
  const [birthDateDraft, setBirthDateDraft] = useState<string | null>(null)
  const [isBirthCalendarOpen, setIsBirthCalendarOpen] = useState(false)
  const [birthCalendarMonthValue, setBirthCalendarMonthValue] = useState<string | null>(null)

  const agePreview = birthDate ? getAge(birthDate) : typeof value === 'number' ? value : NaN
  const birthValid = !Number.isNaN(agePreview) && agePreview >= 14 && agePreview <= 120
  const calendarSelectedDate = birthDate || defaultBirthDate
  const birthCalendarMonth = dayjs(birthCalendarMonthValue ?? calendarSelectedDate).startOf('month')
  const birthDateInputValue = birthDateDraft ?? formatBirthDateDisplay(birthDate)

  const commitBirthDate = (date: string) => {
    const age = getAge(date)
    setBirthDate(date)
    if (!Number.isNaN(age)) onChange(age)
  }

  const handleBirthDateInputChange = (next: string) => {
    const nextValue = formatBirthDateInput(next)
    const parsedDate = parseBirthDateInput(nextValue)

    setBirthDateDraft(nextValue)

    if (parsedDate) {
      setBirthCalendarMonthValue(dayjs(parsedDate).startOf('month').format('YYYY-MM-DD'))
      commitBirthDate(parsedDate)
      return
    }

    setBirthDate('')
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
    commitBirthDate(date)
    setIsBirthCalendarOpen(false)
  }

  return (
    <div className="flex flex-col gap-2">
      <label className={QUESTION_LABEL_CLASS}>
        {label}
        {required && <span className="text-primary"> *</span>}
      </label>
      <div className="relative">
        <input
          value={birthDateInputValue}
          onChange={(e) => handleBirthDateInputChange(e.target.value)}
          inputMode="numeric"
          maxLength={10}
          placeholder="YYYY.MM.DD"
          className={`w-full px-4 py-3 pr-12 rounded-input border bg-card text-foreground placeholder:text-tag-text focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent ${error ? 'border-primary' : 'border-tag-bg'}`}
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
        <div className="animate-field-reveal pt-2">
          <BirthDateCalendar
            selectedDate={birthDate}
            calendarMonth={birthCalendarMonth}
            error={error}
            onSelectDate={handleBirthDateSelect}
            onChangeMonth={(month) => setBirthCalendarMonthValue(month.format('YYYY-MM-DD'))}
          />
        </div>
      )}
      {error && <p className="text-xs text-primary pl-1">{error}</p>}
      {birthValid && (
        <p className="text-xs text-tag-text pl-1">{t('agePreview', { age: agePreview })}</p>
      )}
    </div>
  )
}

export default function DynamicQuestionField({
  question,
  value,
  error,
  onChange,
}: DynamicQuestionFieldProps) {
  const t = useTranslations('gathering.apply.question')
  const { type, label, placeholder, required, options, questionKey } = question
  const choices = options?.choices ?? []

  // 성별 질문은 선택지 값을 한국어 라벨로 바꿔 노출한다. (제출/매칭 값은 원본 유지)
  const choiceLabel = (choice: string) =>
    questionKey === 'gender' && GENDER_CHOICE_LABEL_KEYS[choice] ? t(GENDER_CHOICE_LABEL_KEYS[choice]) : choice

  const labelNode = (
    <label className={QUESTION_LABEL_CLASS}>
      {label}
      {required && <span className="text-primary"> *</span>}
    </label>
  )

  // 단답/숫자
  if (questionKey === 'age') {
    return (
      <BirthDateAgeField
        label={label}
        required={required}
        value={value}
        error={error}
        onChange={onChange}
      />
    )
  }

  if (questionKey === 'job' || questionKey === 'job_category') {
    return (
      <div className="flex flex-col gap-3">
        {labelNode}
        <JobSelect value={typeof value === 'string' ? value : ''} onChange={onChange} placeholder={placeholder ?? undefined} />
        {error && <p className="text-xs text-primary pl-1">{error}</p>}
      </div>
    )
  }

  // 단답/숫자
  if (type === 'SHORT_TEXT' || type === 'NUMBER') {
    return (
      <Input
        label={label}
        requiredMark={required}
        labelClassName={QUESTION_LABEL_CLASS}
        type={type === 'NUMBER' ? 'number' : 'text'}
        placeholder={placeholder ?? ''}
        value={value === undefined ? '' : String(value)}
        onChange={(e) =>
          onChange(type === 'NUMBER' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value)
        }
        error={error}
      />
    )
  }

  // 장문
  if (type === 'LONG_TEXT') {
    return (
      <div className="flex flex-col gap-3">
        {labelNode}
        <textarea
          placeholder={placeholder ?? ''}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="w-full px-4 py-3 rounded-input border bg-card text-foreground text-sm placeholder:text-tag-text focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none min-h-[80px] border-tag-bg"
        />
        {error && <p className="text-xs text-primary">{error}</p>}
      </div>
    )
  }

  // 단일 선택
  if (type === 'SINGLE_CHOICE') {
    return (
      <div className="flex flex-col gap-3">
        {labelNode}
        <div className="flex flex-wrap gap-2">
          {choices.map((choice) => (
            <button
              key={choice}
              type="button"
              onClick={() => onChange(choice)}
              className={`px-4 py-2.5 rounded-input text-sm font-medium transition-colors min-h-[44px] ${
                value === choice ? 'bg-primary text-white' : 'bg-tag-bg text-tag-text'
              }`}
            >
              {choiceLabel(choice)}
            </button>
          ))}
        </div>
        {error && <p className="text-xs text-primary pl-1">{error}</p>}
      </div>
    )
  }

  // 다중 선택
  if (type === 'MULTI_CHOICE') {
    const selected = Array.isArray(value) ? value : []
    const toggle = (choice: string) => {
      onChange(
        selected.includes(choice)
          ? selected.filter((c) => c !== choice)
          : [...selected, choice],
      )
    }
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          {labelNode}
          <span className="text-xs text-tag-text">{t('multiChoice')}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {choices.map((choice) => (
            <button
              key={choice}
              type="button"
              onClick={() => toggle(choice)}
              className={`px-4 py-2.5 rounded-input text-sm font-medium transition-colors min-h-[44px] ${
                selected.includes(choice) ? 'bg-primary text-white' : 'bg-tag-bg text-tag-text'
              }`}
            >
              {choiceLabel(choice)}
            </button>
          ))}
        </div>
        {error && <p className="text-xs text-primary pl-1">{error}</p>}
      </div>
    )
  }

  // MBTI 4토글. 미완성 슬롯은 '·'로 채워 부분 선택 상태를 보존한다.
  if (type === 'MBTI_INPUT') {
    const slots = typeof value === 'string' && value.length === 4 ? value.split('') : ['·', '·', '·', '·']
    const isComplete = slots.every((c) => c !== '·')
    const select = (colIndex: number, letter: string) => {
      const next = [...slots]
      next[colIndex] = next[colIndex] === letter ? '·' : letter
      onChange(next.join(''))
    }
    return (
      <div className="flex flex-col gap-3">
        {labelNode}
        <div className="grid grid-cols-4 gap-2">
          {[...MBTI_ROWS[0], ...MBTI_ROWS[1]].map((letter, idx) => {
            const colIndex = idx % 4
            const active = slots[colIndex] === letter
            return (
              <button
                key={`${letter}-${idx}`}
                type="button"
                onClick={() => select(colIndex, letter)}
                className={`py-3 rounded-input text-sm font-bold transition-colors min-h-[44px] ${
                  active ? 'bg-primary text-white' : 'bg-tag-bg text-tag-text'
                }`}
              >
                {letter}
              </button>
            )
          })}
        </div>
        {isComplete && (
          <p className="text-center text-sm text-primary font-medium">{t('mbtiResult', { mbti: slots.join('') })}</p>
        )}
        {error && <p className="text-xs text-primary pl-1">{error}</p>}
      </div>
    )
  }

  return null
}
