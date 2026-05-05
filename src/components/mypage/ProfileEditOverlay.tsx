'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X, Plus } from 'lucide-react'
import { Button, Input } from '@/components/ui'
import { useUpdateProfile } from '@/lib/hooks/useAuth'
import type { UserProfile, Gender } from '@/lib/api/types'

const MBTI_ROWS = [
  ['E', 'S', 'F', 'J'],
  ['I', 'N', 'T', 'P'],
] as const

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: 'MALE', label: '남성' },
  { value: 'FEMALE', label: '여성' },
]

const schema = z.object({
  nickname: z.string().min(2, '닉네임은 2자 이상이어야 합니다').max(50, '닉네임은 50자 이하여야 합니다'),
  name: z.string().min(1, '이름을 입력해주세요').max(50, '이름은 50자 이하여야 합니다'),
  phone: z.string().regex(/^\d{11}$/, '전화번호는 11자리 숫자여야 합니다').optional().or(z.literal('')),
  age: z.number().int().min(1, '올바른 나이를 입력해주세요').max(100, '올바른 나이를 입력해주세요'),
  instagramId: z.string().optional(),
  job: z.string().optional(),
  bio: z.string().max(100, '소개는 100자 이하여야 합니다').optional(),
})

type FormValues = z.infer<typeof schema>

interface ProfileEditOverlayProps {
  profile: UserProfile
  onClose: () => void
}

export default function ProfileEditOverlay({ profile, onClose }: ProfileEditOverlayProps) {
  const updateMutation = useUpdateProfile()

  const [gender, setGender] = useState<Gender | null>(
    (profile.gender as Gender | null) ?? null
  )
  const [userMbti, setUserMbti] = useState<(string | null)[] | null>(null)
  const [interests, setInterests] = useState<string[]>(profile.interests ?? [])
  const [interestInput, setInterestInput] = useState('')
  const [genderError, setGenderError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const profileMbti: (string | null)[] =
    profile.mbti?.length === 4
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

  const addInterest = () => {
    const trimmed = interestInput.trim()
    if (trimmed && !interests.includes(trimmed) && interests.length < 10) {
      setInterests((prev) => [...prev, trimmed])
      setInterestInput('')
    }
  }

  const removeInterest = (target: string) => {
    setInterests((prev) => prev.filter((i) => i !== target))
  }

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    reset({
      nickname: profile.nickname ?? '',
      name: profile.name ?? '',
      phone: profile.phone ?? '',
      age: profile.age ?? undefined,
      instagramId: profile.instagramId ?? '',
      job: profile.job ?? '',
      bio: profile.bio ?? '',
    })
  }, [profile, reset])

  const onSubmit = async (formData: FormValues) => {
    if (!gender) {
      setGenderError('성별을 선택해주세요.')
      return
    }
    setGenderError(null)
    setSubmitError(null)

    try {
      await updateMutation.mutateAsync({
        nickname: formData.nickname,
        name: formData.name,
        phone: formData.phone || undefined,
        gender,
        age: formData.age,
        instagramId: formData.instagramId || undefined,
        job: formData.job || undefined,
        bio: formData.bio || undefined,
        mbti: mbtiString ?? undefined,
        interests: interests.length > 0 ? interests : undefined,
      })
      onClose()
    } catch {
      setSubmitError('프로필 수정 중 오류가 발생했습니다. 다시 시도해주세요.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
      <header className="sticky top-0 z-10 bg-background border-b border-tag-bg/50">
        <div className="flex items-center px-4 py-3">
          <button
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="닫기"
          >
            <X size={20} className="text-foreground" />
          </button>
          <h1 className="flex-1 text-center text-base font-bold text-foreground pr-11">
            프로필 수정
          </h1>
        </div>
      </header>

      <form onSubmit={handleSubmit(onSubmit)} className="px-4 py-5 flex flex-col gap-5 pb-10">
        {/* 기본 정보 */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-5 bg-primary rounded-full" />
            <h2 className="text-base font-bold text-foreground">기본 정보</h2>
          </div>
          <div className="flex flex-col gap-4">
            <Input
              label="닉네임*"
              placeholder="닉네임을 입력해주세요"
              {...register('nickname')}
              error={errors.nickname?.message}
            />
            <Input
              label="이름*"
              placeholder="실명을 입력해주세요"
              {...register('name')}
              error={errors.name?.message}
            />
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
            <Input
              label="연락처"
              placeholder="01012345678"
              {...register('phone')}
              error={errors.phone?.message}
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
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-foreground">한 줄 소개</label>
              <textarea
                placeholder="나를 한 줄로 표현해보세요"
                {...register('bio')}
                className="w-full px-4 py-3 rounded-input border border-tag-bg bg-card text-foreground text-sm placeholder:text-tag-text focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none min-h-[80px]"
                rows={3}
              />
              {errors.bio && <p className="text-xs text-primary pl-1">{errors.bio.message}</p>}
            </div>
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
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-foreground">관심사</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={interestInput}
                  onChange={(e) => setInterestInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addInterest() } }}
                  placeholder="관심사 입력 후 추가"
                  maxLength={20}
                  className="flex-1 px-4 py-2.5 rounded-input border border-tag-bg bg-card text-foreground text-sm placeholder:text-tag-text focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent min-h-[44px]"
                />
                <button
                  type="button"
                  onClick={addInterest}
                  disabled={!interestInput.trim() || interests.length >= 10}
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-input bg-tag-bg text-tag-text disabled:opacity-40"
                  aria-label="관심사 추가"
                >
                  <Plus size={18} />
                </button>
              </div>
              {interests.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {interests.map((interest) => (
                    <span
                      key={interest}
                      className="flex items-center gap-1 bg-tag-bg text-tag-text text-xs px-3 py-1.5 rounded-full"
                    >
                      {interest}
                      <button
                        type="button"
                        onClick={() => removeInterest(interest)}
                        className="ml-0.5 text-tag-text"
                        aria-label={`${interest} 삭제`}
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <p className="text-xs text-tag-text">최대 10개</p>
            </div>
          </div>
        </div>

        {submitError && (
          <p className="text-sm text-primary text-center">{submitError}</p>
        )}

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          isLoading={updateMutation.isPending}
        >
          저장하기
        </Button>
      </form>
    </div>
  )
}
