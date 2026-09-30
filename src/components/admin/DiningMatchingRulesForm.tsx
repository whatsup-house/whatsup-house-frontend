'use client'

import type { ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { DiningMatchingRules, DiningMatchingWeights } from '@/lib/api/types'
import { useDiningMatchingRules, useUpdateDiningMatchingRules } from '@/lib/hooks/useAdminDiningOps'
import { getAdminApiErrorMessage } from '@/lib/utils/apiError'
import { ApiErrorMessage, Button, Input, LoadingSpinner } from '@/components/ui'

// 범위는 BE MatchingRuleRequest 검증과 같다.
const integer = (min: number, max: number) =>
  z
    .number({ error: '숫자를 입력해주세요' })
    .int('정수로 입력해주세요')
    .min(min, `${min} 이상이어야 합니다`)
    .max(max, `${max} 이하여야 합니다`)
const weight = z.number({ error: '숫자를 입력해주세요' }).min(0, '0 이상이어야 합니다').max(10, '10 이하여야 합니다')

const schema = z
  .object({
    maxAgeGap: integer(0, 100),
    tableSizeMin: integer(2, 8),
    tableSizeMax: integer(2, 8),
    minGroupScore: z.number({ error: '숫자를 입력해주세요' }).min(0, '0 이상이어야 합니다').max(1, '1 이하여야 합니다'),
    autoConfirmGraceMinutes: integer(0, 10080),
    weights: z.object({ gender: weight, mbti: weight, interests: weight, wantedStyle: weight, custom: weight }),
  })
  .refine((v) => v.tableSizeMin <= v.tableSizeMax, {
    path: ['tableSizeMax'],
    message: '최대 인원은 최소 인원 이상이어야 합니다',
  })

type FormValues = z.infer<typeof schema>

const WEIGHT_FIELDS: { key: keyof DiningMatchingWeights; label: string }[] = [
  { key: 'gender', label: '성별 다양성' },
  { key: 'mbti', label: 'MBTI 궁합' },
  { key: 'interests', label: '관심사 겹침' },
  { key: 'wantedStyle', label: '원하는 스타일 일치' },
  { key: 'custom', label: '커스텀 매칭 질문' },
]

interface MatchingRulesFieldsProps {
  defaultValues: DiningMatchingRules
}

function MatchingRulesFields({ defaultValues }: MatchingRulesFieldsProps) {
  const { mutate, isPending } = useUpdateDiningMatchingRules()
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  })

  // BE는 소수 4자리까지 받는다(Digits fraction=4).
  const onSubmit = (v: FormValues) => mutate({ ...v, minGroupScore: Math.round(v.minGroupScore * 10000) / 10000 })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input
          label="최대 나이 차 (출생연도)"
          type="number"
          min={0}
          max={100}
          error={errors.maxAgeGap?.message}
          {...register('maxAgeGap', { valueAsNumber: true })}
        />
        <Input
          label="최소 그룹 점수 (0~1)"
          type="number"
          min={0}
          max={1}
          step={0.01}
          error={errors.minGroupScore?.message}
          {...register('minGroupScore', { valueAsNumber: true })}
        />
        <Input
          label="테이블 최소 인원"
          type="number"
          min={2}
          max={8}
          error={errors.tableSizeMin?.message}
          {...register('tableSizeMin', { valueAsNumber: true })}
        />
        <Input
          label="테이블 최대 인원"
          type="number"
          min={2}
          max={8}
          error={errors.tableSizeMax?.message}
          {...register('tableSizeMax', { valueAsNumber: true })}
        />
        <div>
          <Input
            label="자동 확정 유예 (분)"
            type="number"
            min={0}
            max={10080}
            error={errors.autoConfirmGraceMinutes?.message}
            {...register('autoConfirmGraceMinutes', { valueAsNumber: true })}
          />
          <p className="mt-1 text-xs text-tag-text">0이면 제안 즉시 확정해요.</p>
        </div>
      </div>

      <fieldset className="rounded-input border border-tag-bg p-3">
        <legend className="px-1 text-sm font-medium text-foreground">항목별 가중치 (0~10)</legend>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {WEIGHT_FIELDS.map(({ key, label }) => (
            <Input
              key={key}
              label={label}
              labelClassName="text-xs text-tag-text"
              type="number"
              min={0}
              max={10}
              step={0.1}
              error={errors.weights?.[key]?.message}
              {...register(`weights.${key}`, { valueAsNumber: true })}
            />
          ))}
        </div>
      </fieldset>

      <Button type="submit" variant="primary" size="sm" isLoading={isPending} className="self-end">
        매칭 규칙 저장
      </Button>
    </form>
  )
}

// 매칭 규칙 기본값 — 회차에 값이 없을 때 쓴다 (KAN-353)
export default function DiningMatchingRulesForm() {
  const rulesQuery = useDiningMatchingRules()

  let content: ReactNode
  if (rulesQuery.isLoading) {
    content = (
      <div className="flex h-32 items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  } else if (!rulesQuery.data) {
    content = (
      <ApiErrorMessage
        message={getAdminApiErrorMessage(rulesQuery.error, '매칭 규칙을 불러오지 못했어요.')}
        onRetry={() => rulesQuery.refetch()}
      />
    )
  } else {
    content = <MatchingRulesFields defaultValues={rulesQuery.data} />
  }

  return (
    <section className="rounded-card bg-card p-4 shadow-sm sm:p-5">
      <h2 className="text-base font-bold text-foreground">매칭 규칙 기본값</h2>
      <p className="mb-4 mt-1 text-xs text-tag-text">회차에 따로 정한 값이 없을 때 이 값으로 매칭해요.</p>
      {content}
    </section>
  )
}
