'use client'

import { useState, useEffect, useMemo } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X, Plus } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button, Input } from '@/components/ui'
import JobSelect from '@/components/auth/JobSelect'
import { useUpdateProfile } from '@/lib/hooks/useAuth'
import { resolveApiErrorMessage } from '@/lib/utils/apiError'
import type { UserProfile, Gender } from '@/lib/api/types'

const MBTI_ROWS = [
  ['E', 'S', 'F', 'J'],
  ['I', 'N', 'T', 'P'],
] as const

const GENDER_OPTIONS: { value: Gender; labelKey: string }[] = [
  { value: 'MALE', labelKey: 'genderLabels.MALE' },
  { value: 'FEMALE', labelKey: 'genderLabels.FEMALE' },
]

type FormValues = {
  nickname: string
  name: string
  phone?: string
  age: number
  instagramId?: string
  job?: string
  bio?: string
}

interface ProfileEditOverlayProps {
  profile: UserProfile
  onClose: () => void
}

export default function ProfileEditOverlay({ profile, onClose }: ProfileEditOverlayProps) {
  const t = useTranslations('mypage.profileEdit')
  const tCommon = useTranslations('common')
  const updateMutation = useUpdateProfile()
  const schema = useMemo(
    () =>
      z.object({
        nickname: z.string().min(2, t('validation.nicknameMin')).max(50, t('validation.nicknameMax')),
        name: z.string().min(1, t('validation.nameRequired')).max(50, t('validation.nameMax')),
        phone: z.string().regex(/^\d{11}$/, t('validation.phone')).optional().or(z.literal('')),
        age: z.number().int().min(1, t('validation.age')).max(100, t('validation.age')),
        instagramId: z.string().optional(),
        job: z.string().optional(),
        bio: z.string().max(100, t('validation.bioMax')).optional(),
      }),
    [t],
  )

  // 성별은 mbti와 동일하게 'profile 값 + 사용자 override' 파생으로 둔다.
  // 그래야 profile이 나중에 채워져도 기존 성별이 유지된다(초기화 방지). (KAN-222)
  const [userGender, setUserGender] = useState<Gender | null>(null)
  const gender = userGender ?? ((profile.gender as Gender | null) ?? null)
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

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<FormValues>({
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
      bio: profile.intro ?? profile.bio ?? '',
    })
  }, [profile, reset])

  const onSubmit = async (formData: FormValues) => {
    if (!gender) {
      setGenderError(t('validation.gender'))
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
        intro: formData.bio || undefined,
        mbti: mbtiString ?? undefined,
        interests: interests.length > 0 ? interests : undefined,
      })
      onClose()
    } catch (error) {
      setSubmitError(resolveApiErrorMessage(error, tCommon))
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-background lg:flex lg:items-center lg:justify-center lg:overflow-hidden lg:bg-foreground/30 lg:p-4">
      <div className="mx-auto max-w-[390px] lg:max-h-[90vh] lg:w-full lg:max-w-[400px] lg:overflow-y-auto lg:rounded-card lg:bg-background lg:shadow-2xl">
      <header className="sticky top-0 z-10 bg-background border-b border-tag-bg/50">
        <div className="flex items-center px-4 py-3">
          <button
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label={tCommon('close')}
          >
            <X size={20} className="text-foreground" />
          </button>
          <h1 className="flex-1 text-center text-base font-bold text-foreground pr-11">
            {t('title')}
          </h1>
        </div>
      </header>

      <form onSubmit={handleSubmit(onSubmit)} className="px-4 py-5 flex flex-col gap-5 pb-10">
        {/* 기본 정보 */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-5 bg-primary rounded-full" />
            <h2 className="text-base font-bold text-foreground">{t('basicInfo')}</h2>
          </div>
          <div className="flex flex-col gap-4">
            <Input
              label={t('nickname')}
              placeholder={t('nicknamePlaceholder')}
              {...register('nickname')}
              error={errors.nickname?.message}
            />
            <Input
              label={t('name')}
              placeholder={t('namePlaceholder')}
              {...register('name')}
              error={errors.name?.message}
            />
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-foreground">{t('gender')}</label>
              <div className="flex gap-2">
                {GENDER_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => { setUserGender(option.value); setGenderError(null) }}
                    className={`flex-1 py-2.5 rounded-input text-sm font-medium transition-colors min-h-[44px] ${
                      gender === option.value
                        ? 'bg-primary text-white'
                        : 'bg-tag-bg text-tag-text'
                    }`}
                  >
                    {t(option.labelKey)}
                  </button>
                ))}
              </div>
              {genderError && <p className="text-xs text-primary pl-1">{genderError}</p>}
            </div>
            <Input
              label={t('age')}
              type="number"
              placeholder={t('agePlaceholder')}
              {...register('age', { valueAsNumber: true })}
              error={errors.age?.message}
            />
            <Input
              label={t('phone')}
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
              {t('additionalInfo')} <span className="text-sm font-normal text-tag-text">{t('optional')}</span>
            </h2>
          </div>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-foreground">{t('bio')}</label>
              <textarea
                placeholder={t('bioPlaceholder')}
                {...register('bio')}
                className="w-full px-4 py-3 rounded-input border border-tag-bg bg-card text-foreground text-sm placeholder:text-tag-text focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none min-h-[80px]"
                rows={3}
              />
              {errors.bio && <p className="text-xs text-primary pl-1">{errors.bio.message}</p>}
            </div>
            <Input
              label={t('instagram')}
              placeholder="@username"
              {...register('instagramId')}
            />
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-foreground">{t('job')}</label>
              <Controller
                name="job"
                control={control}
                render={({ field }) => (
                  <JobSelect value={field.value ?? ''} onChange={field.onChange} />
                )}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-foreground">{t('mbti')}</label>
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
                  {t('mbtiResult', { mbti: mbtiString })}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-foreground">{t('interests')}</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={interestInput}
                  onChange={(e) => setInterestInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addInterest() } }}
                  placeholder={t('interestPlaceholder')}
                  maxLength={20}
                  className="flex-1 px-4 py-2.5 rounded-input border border-tag-bg bg-card text-foreground text-sm placeholder:text-tag-text focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent min-h-[44px]"
                />
                <button
                  type="button"
                  onClick={addInterest}
                  disabled={!interestInput.trim() || interests.length >= 10}
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-input bg-tag-bg text-tag-text disabled:opacity-40"
                  aria-label={t('addInterest')}
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
                        aria-label={t('removeInterest', { interest })}
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <p className="text-xs text-tag-text">{t('maxInterests')}</p>
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
          {t('submit')}
        </Button>
      </form>
      </div>
    </div>
  )
}
