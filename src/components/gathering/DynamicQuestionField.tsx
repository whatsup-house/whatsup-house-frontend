'use client'

import { useMemo, useState } from 'react'
import dayjs from 'dayjs'
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

type FieldValue = string | number | string[]

interface DynamicQuestionFieldProps {
  question: FormQuestionDetail
  value: FieldValue | undefined
  error?: string
  onChange: (value: FieldValue) => void
}

const MIN_BIRTH_YEAR = dayjs().subtract(120, 'year').year()
const MAX_BIRTH_YEAR = dayjs().subtract(14, 'year').year()

function getMonthDays(year: string, month: string) {
  if (!year || !month) return 31
  return dayjs(`${year}-${month.padStart(2, '0')}-01`).daysInMonth()
}

function BirthDateAgeField({
  label,
  required,
  error,
  onChange,
}: {
  label: string
  required: boolean
  error?: string
  onChange: (value: number) => void
}) {
  const [year, setYear] = useState('')
  const [month, setMonth] = useState('')
  const [day, setDay] = useState('')
  const birthYears = useMemo(
    () => Array.from({ length: MAX_BIRTH_YEAR - MIN_BIRTH_YEAR + 1 }, (_, index) => String(MAX_BIRTH_YEAR - index)),
    [],
  )
  const daysInMonth = getMonthDays(year, month)
  const selectedDate = year && month && day
    ? `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
    : ''
  const selectedAge = selectedDate ? getAge(selectedDate) : NaN

  const update = (nextYear: string, nextMonth: string, nextDay: string) => {
    const maxDay = getMonthDays(nextYear, nextMonth)
    const normalizedDay = nextDay && Number(nextDay) > maxDay ? String(maxDay) : nextDay
    setYear(nextYear)
    setMonth(nextMonth)
    setDay(normalizedDay)

    if (!nextYear || !nextMonth || !normalizedDay) return
    const date = `${nextYear}-${nextMonth.padStart(2, '0')}-${normalizedDay.padStart(2, '0')}`
    const age = getAge(date)
    if (!Number.isNaN(age)) onChange(age)
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-foreground">
        {label}
        {required && <span className="text-primary"> *</span>}
      </label>
      <div className="grid grid-cols-3 gap-2">
        <select
          value={year}
          onChange={(event) => update(event.target.value, month, day)}
          className="h-[46px] rounded-input border border-tag-bg bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          aria-label="출생 연도"
        >
          <option value="">연도</option>
          {birthYears.map((birthYear) => (
            <option key={birthYear} value={birthYear}>{birthYear}년</option>
          ))}
        </select>
        <select
          value={month}
          onChange={(event) => update(year, event.target.value, day)}
          className="h-[46px] rounded-input border border-tag-bg bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          aria-label="출생 월"
        >
          <option value="">월</option>
          {Array.from({ length: 12 }, (_, index) => String(index + 1)).map((birthMonth) => (
            <option key={birthMonth} value={birthMonth}>{birthMonth}월</option>
          ))}
        </select>
        <select
          value={day}
          onChange={(event) => update(year, month, event.target.value)}
          className="h-[46px] rounded-input border border-tag-bg bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          aria-label="출생 일"
        >
          <option value="">일</option>
          {Array.from({ length: daysInMonth }, (_, index) => String(index + 1)).map((birthDay) => (
            <option key={birthDay} value={birthDay}>{birthDay}일</option>
          ))}
        </select>
      </div>
      {!Number.isNaN(selectedAge) && (
        <p className="text-xs text-tag-text pl-1">만 {selectedAge}세</p>
      )}
      {error && <p className="text-xs text-primary pl-1">{error}</p>}
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
    <label className="text-sm font-medium text-foreground">
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
        error={error}
        onChange={onChange}
      />
    )
  }

  if (questionKey === 'job' || questionKey === 'job_category') {
    return (
      <div className="flex flex-col gap-2">
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
      <div className="flex flex-col gap-1">
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
      <div className="flex flex-col gap-2">
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
      <div className="flex flex-col gap-2">
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
      <div className="flex flex-col gap-2">
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
