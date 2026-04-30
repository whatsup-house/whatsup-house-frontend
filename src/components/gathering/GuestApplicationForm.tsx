'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AlertTriangle, CheckCircle } from 'lucide-react'
import { Button, Input, Card } from '@/components/ui'
import { useSubmitGuestApplication, useSubmitUserApplication } from '@/lib/hooks/useGatherings'
import { useMyProfile } from '@/lib/hooks/useAuth'
import { useAuthStore } from '@/lib/store/authStore'
import type { GatheringDetail, Gender, ReferralSource } from '@/lib/api/types'

const MBTI_ROWS = [
  ['E', 'S', 'F', 'J'],
  ['I', 'N', 'T', 'P'],
] as const

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: 'MALE', label: '남성' },
  { value: 'FEMALE', label: '여성' },
]

const REFERRAL_OPTIONS: { value: ReferralSource; label: string }[] = [
  { value: 'INSTAGRAM', label: '인스타그램' },
  { value: 'FRIEND', label: '지인 추천' },
  { value: 'BLOG', label: '블로그/커뮤니티' },
  { value: 'OTHER', label: '기타' },
]

const schema = z.object({
  name: z.string().optional(),
  phone: z.string().optional(),
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
  const { isLoggedIn } = useAuthStore()
  const { data: profile } = useMyProfile()
  const guestMutation = useSubmitGuestApplication()
  const userMutation = useSubmitUserApplication()

  const [gender, setGender] = useState<Gender | null>(null)
  const [genderError, setGenderError] = useState<string | null>(null)
  const [userMbti, setUserMbti] = useState<(string | null)[] | null>(null)
  const [referralSource, setReferralSource] = useState<ReferralSource | null>(null)
  const [nameError, setNameError] = useState<string | null>(null)
  const [phoneError, setPhoneError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    if (!isLoggedIn || !profile) return
    reset({
      instagramId: profile.instagramId ?? undefined,
      job: profile.job ?? undefined,
      intro: profile.intro ?? undefined,
    })
  }, [isLoggedIn, profile, reset])

  // 프로필 MBTI를 초기값으로, 사용자가 직접 선택하면 그 값으로 override
  const profileMbti: (string | null)[] =
    isLoggedIn && profile?.mbti?.length === 4
      ? (profile.mbti.split('') as string[])
      : [null, null, null, null]

  const mbti = userMbti ?? profileMbti

  const handleMbtiSelect = (colIndex: number, value: string) => {
    setUserMbti(() => {
      const next = [...mbti]
      next[colIndex] = next[colIndex] === value ? null : value
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
      if (isLoggedIn) {
        await userMutation.mutateAsync({
          id: gathering.id,
          data: {
            gender,
            age: formData.age,
            ...(formData.job && { job: formData.job }),
            ...(mbtiString && { mbti: mbtiString }),
            intro: formData.intro || '',
            referralSource: referralSource ?? 'OTHER',
          },
        })
        router.push(`/gatherings/${gathering.id}/apply/complete`)
      } else {
        let hasError = false
        if (!formData.name?.trim()) {
          setNameError('이름을 입력해주세요')
          hasError = true
        } else {
          setNameError(null)
        }
        if (!formData.phone || !/^01[0-9]{8,9}$/.test(formData.phone)) {
          setPhoneError('올바른 연락처 형식으로 입력해주세요 (예: 01012345678)')
          hasError = true
        } else {
          setPhoneError(null)
        }
        if (hasError) return

        const result = await guestMutation.mutateAsync({
          id: gathering.id,
          data: {
            name: formData.name!,
            phone: formData.phone!,
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
      }
    } catch {
      setSubmitError('신청 중 오류가 발생했습니다. 다시 시도해주세요.')
    }
  }

  const isPending = isLoggedIn ? userMutation.isPending : guestMutation.isPending

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
      {!isLoggedIn ? (
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
      ) : (
        <div className="flex items-center gap-2 px-4 py-3 bg-primary-light rounded-input">
          <CheckCircle size={18} className="text-primary shrink-0" />
          <p className="text-sm text-primary font-medium">
            참여 완료 후 {gathering.mileageReward || 500} 마일리지가 적립돼요
          </p>
        </div>
      )}

      {/* 신청자 정보 */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-5 bg-primary rounded-full" />
          <h2 className="text-base font-bold text-foreground">신청자 정보</h2>
        </div>

        <div className="flex flex-col gap-4">
          {!isLoggedIn && (
            <>
              <Input
                label="이름*"
                placeholder="실명을 입력해주세요"
                {...register('name')}
                error={nameError ?? undefined}
              />
              <Input
                label="연락처*"
                placeholder="01012345678"
                {...register('phone')}
                error={phoneError ?? undefined}
              />
            </>
          )}

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
          <h2 className="text-base font-bold text-foreground">
            추가 정보 <span className="text-sm font-normal text-tag-text">(선택)</span>
          </h2>
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

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-foreground">한 줄 자기소개</label>
            <textarea
              placeholder="당신은 어떤 분인가요? 가볍게 알려주세요."
              {...register('intro')}
              className="w-full px-4 py-3 rounded-input border border-tag-bg bg-card text-foreground text-sm placeholder:text-tag-text focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none min-h-[80px]"
              rows={3}
            />
          </div>

          {isLoggedIn ? (
            <div>
              <label className="text-sm font-medium text-foreground block mb-3">
                유입 경로 <span className="font-normal text-tag-text">(선택)</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {REFERRAL_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setReferralSource(option.value)}
                    className={`flex items-center gap-2 px-4 py-3 rounded-input text-sm font-medium transition-colors min-h-[44px] border ${
                      referralSource === option.value
                        ? 'border-primary bg-primary-light text-primary'
                        : 'border-tag-bg bg-card text-tag-text'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      referralSource === option.value ? 'border-primary' : 'border-tag-bg'
                    }`}>
                      {referralSource === option.value && (
                        <div className="w-2 h-2 rounded-full bg-primary" />
                      )}
                    </div>
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <Input
              label="추천인 성함"
              placeholder="소개해주신 분의 성함을 입력해주세요"
              {...register('referrerName')}
            />
          )}
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
          isLoading={isPending}
        >
          신청 완료하기
        </Button>
      </div>
    </form>
  )
}
