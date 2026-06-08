'use client'

import { Input } from '@/components/ui'
import type { FormQuestionDetail } from '@/lib/api/types'

const MBTI_ROWS = [
  ['E', 'S', 'F', 'J'],
  ['I', 'N', 'T', 'P'],
] as const

type FieldValue = string | number | string[]

interface DynamicQuestionFieldProps {
  question: FormQuestionDetail
  value: FieldValue | undefined
  error?: string
  onChange: (value: FieldValue) => void
}

export default function DynamicQuestionField({
  question,
  value,
  error,
  onChange,
}: DynamicQuestionFieldProps) {
  const { type, label, placeholder, required, options } = question
  const choices = options?.choices ?? []

  const labelNode = (
    <label className="text-sm font-medium text-foreground">
      {label}
      {required && <span className="text-primary"> *</span>}
    </label>
  )

  // 단답/숫자
  if (type === 'SHORT_TEXT' || type === 'NUMBER') {
    return (
      <Input
        label={`${label}${required ? ' *' : ''}`}
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
              {choice}
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
        {labelNode}
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
              {choice}
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
          <p className="text-center text-sm text-primary font-medium">{value} 유형이군요!</p>
        )}
        {error && <p className="text-xs text-primary pl-1">{error}</p>}
      </div>
    )
  }

  return null
}
