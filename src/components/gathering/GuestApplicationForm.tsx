'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AlertTriangle } from 'lucide-react'
import { Button, Input, Card } from '@/components/ui'
import { useSubmitGuestApplication } from '@/lib/hooks/useGatherings'
import type { GatheringDetail, Gender } from '@/lib/api/types'

const MBTI_ROWS = [
  ['E', 'S', 'F', 'J'],
  ['I', 'N', 'T', 'P'],
] as const

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: 'MALE', label: '남성' },
  { value: 'FEMALE', label: '여성' },
]

const schema = z.object({
  name: z.string().min(1, '이름을 입력해주세요'),
  phone: z.string().regex(/^01[0-9]{8,9}$/, '올바른 연락처 형식으로 입력해주세요 (예: 01012345678)'),
  age: z.number().int().min(1, '올바른 나이를 입력해주세요').max(100, '올바른 나이를 입력해주세요'),
  instagramId: z.string().optional(),
  job: z.string().optional(),
  intro: z.string().optional(),
  referrerName: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface GuestApplicationFormProps {
  gathering: GatheringDetail
}

export default function GuestApplicationForm({ gathering }: GuestApplicationFormProps) {
  const router = useRouter()
  const submitMutation = useSubmitGuestApplication()

  const [gender, setGender] = useState<Gender | null>(null)
  const [genderError, setGenderError] = useState<string | null>(null)
  const [mbti, setMbti] = useState<(string | null)[]>([null, null, null, null])
  const [submitError, setSubmitError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  const handleMbtiSelect = (colIndex: number, value: string) => {
    setMbti((prev) => {
      const next = [...prev]
      next[colIndex] = prev[colIndex] === value ? null : value
      return next
    })
  }

  const mbtiString = mbti.every((v) => v !== null) ? mbti.join('') : null

  const onSubmit = async (formData: FormValues) => {
    if (!gender) {
      setGenderError('성별을 선택해주세요.')
      return
    }
    setGenderError(null)
    setSubmitError(null)

    try {
      const result = await submitMutation.mutateAsync({
        id: gathering.id,
        data: {
          name: formData.name,
          phone: formData.phone,
          gender,
          age: formData.age,
          ...(formData.instagramId && { instagramId: formData.instagramId }),
          ...(formData.job && { job: formData.job }),
          ...(mbtiString && { mbti: mbtiString }),
          ...(formData.intro && { intro: formData.intro }),
          ...(formData.referrerName && { referrerName: formData.referrerName }),
        },
      })
      router.push(`/gatherings/${gathering.id}/apply/complete?bookingNumber=${result.bookingNumber}`)
    } catch {
      setSubmitError('신청 중 오류가 발생했습니다. 다시 시도해주세요.')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
      {/* 비로그인 경고 */}
      <Card className="p-4 bg-tag-bg border border-tag-bg">
        <div className="flex items-start gap-2.5">
          <AlertTriangle size={18} className="text-primary mt-0.5 shrink-0" />
          <p className="text-sm text-tag-text">
            비로그인 신청은 마일리지가 적립되지 않아요.{' '}
            <button
              type="button"
              onClick={() => router.push('/login')}
              className="text-primary font-semibold underline"
            >
              로그인 후 신청
            </button>
            하시면 혜택을 받을 수 있습니다.
          </p>
        </div>
      </Card>

      {/* 필수 정보 */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-5 bg-primary rounded-full" />
          <h2 className="text-base font-bold text-foreground">신청자 정보</h2>
        </div>

        <div className="flex flex-col gap-4">
          <Input
            label="이름*"
            placeholder="실명을 입력해주세요"
            {...register('name')}
            error={errors.name?.message}
          />

          <Input
            label="연락처*"
            placeholder="01012345678"
            {...register('phone')}
            error={errors.phone?.message}
          />

          {/* 성별 */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-foreground">성별*</label>
            <div className="flex gap-2">
              {GENDER_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => { setGender(option.value); setGenderError(null) }}
                  className={`flex-1 py-2.5 rounded-input text-sm font-medium transition-colors min-h-[44px] ${
                    gender === option.value
                      ? 'bg-primary text-white'
                      : 'bg-tag-bg text-tag-text'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {genderError && <p className="text-xs text-primary pl-1">{genderError}</p>}
          </div>

          <Input
            label="나이*"
            type="number"
            placeholder="나이를 입력해주세요"
            {...register('age', { valueAsNumber: true })}
            error={errors.age?.message}
          />
        </div>
      </div>

      {/* 추가 정보 */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-5 bg-tag-bg rounded-full" />
          <h2 className="text-base font-bold text-foreground">추가 정보 <span className="text-sm font-normal text-tag-text">(선택)</span></h2>
        </div>

        <div className="flex flex-col gap-4">
          <Input
            label="인스타그램 ID"
            placeholder="@username"
            {...register('instagramId')}
          />

          <Input
            label="직업"
            placeholder="예: 디자이너"
            {...register('job')}
          />

          {/* MBTI */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-foreground">MBTI</label>
            <div className="grid grid-cols-4 gap-2">
              {MBTI_ROWS[0].map((letter, colIndex) => (
                <button
                  key={`row0-${letter}`}
                  type="button"
                  onClick={() => handleMbtiSelect(colIndex, letter)}
                  className={`py-3 rounded-input text-sm font-bold transition-colors min-h-[44px] ${
                    mbti[colIndex] === letter
                      ? 'bg-primary text-white'
                      : 'bg-tag-bg text-tag-text'
                  }`}
                >
                  {letter}
                </button>
              ))}
              {MBTI_ROWS[1].map((letter, colIndex) => (
                <button
                  key={`row1-${letter}`}
                  type="button"
                  onClick={() => handleMbtiSelect(colIndex, letter)}
                  className={`py-3 rounded-input text-sm font-bold transition-colors min-h-[44px] ${
                    mbti[colIndex] === letter
                      ? 'bg-primary text-white'
                      : 'bg-tag-bg text-tag-text'
                  }`}
                >
                  {letter}
                </button>
              ))}
            </div>
            {mbtiString && (
              <p className="text-center text-sm text-primary font-medium">
                {mbtiString} 유형이군요!
              </p>
            )}
          </div>

          {/* 자기소개 */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-foreground">한 줄 자기소개</label>
            <textarea
              placeholder="당신은 어떤 분인가요? 가볍게 알려주세요."
              {...register('intro')}
              className="w-full px-4 py-3 rounded-input border border-tag-bg bg-card text-foreground text-sm placeholder:text-tag-text focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none min-h-[80px]"
              rows={3}
            />
          </div>

          <Input
            label="추천인 성함"
            placeholder="소개해주신 분의 성함을 입력해주세요"
            {...register('referrerName')}
          />
        </div>
      </div>

      {submitError && (
        <p className="text-sm text-primary text-center">{submitError}</p>
      )}

      <div className="pt-2 pb-4">
        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          isLoading={submitMutation.isPending}
        >
          신청 완료하기
        </Button>
      </div>
    </form>
  )
}
