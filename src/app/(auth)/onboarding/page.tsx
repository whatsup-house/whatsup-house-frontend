'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui'
import JobSelect from '@/components/auth/JobSelect'
import { useRegisterAndLogin } from '@/lib/hooks/useAuth'
import { useBackNavigation } from '@/lib/hooks/useBackNavigation'
import { useToastStore } from '@/lib/store/toastStore'
import { getApiErrorCode, resolveApiErrorMessage } from '@/lib/utils/apiError'
import type { Gender } from '@/lib/api/types'
import { REGISTER_EMAIL_ERROR_KEY, REGISTER_SESSION_KEY } from '../register/page'

const MBTI_ROWS = [
  ['E', 'S', 'T', 'J'],
  ['I', 'N', 'F', 'P'],
] as const

interface Step1Data {
  email: string
  password: string
  name: string
  nickname: string
  gender: Gender
  age: number
  birthDate: string
  phone?: string
}

export default function OnboardingPage() {
  const t = useTranslations('auth.onboarding')
  const tCommon = useTranslations('common')
  const router = useRouter()
  const handleBack = useBackNavigation('/register')
  const showToast = useToastStore((s) => s.show)
  // SSR/CSR 렌더 결과 불일치(Hydration Error)를 막는다: 마운트 전에는 항상 null을 렌더하고,
  // 마운트 후에만 sessionStorage를 읽어 파생한다. (KAN-219)
  const [mounted, setMounted] = useState(false)
  const [bio, setBio] = useState('')
  const [job, setJob] = useState('')
  const [mbti, setMbti] = useState<(string | null)[]>([null, null, null, null])
  const [formError, setFormError] = useState<string | null>(null)

  const registerAndLogin = useRegisterAndLogin()

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 클라이언트 마운트 신호용 1회성 플래그
    setMounted(true)
  }, [])

  const step1Data = useMemo<Step1Data | null>(() => {
    if (!mounted) return null
    const raw = sessionStorage.getItem(REGISTER_SESSION_KEY)
    if (!raw) return null
    try {
      return JSON.parse(raw) as Step1Data
    } catch {
      return null
    }
  }, [mounted])

  useEffect(() => {
    if (mounted && !step1Data) {
      router.replace('/register')
    }
  }, [mounted, step1Data, router])

  const mbtiString = mbti.every((v) => v !== null) ? mbti.join('') : undefined

  const handleMbtiSelect = (colIndex: number, value: string) => {
    setMbti((prev) => {
      const next = [...prev]
      next[colIndex] = prev[colIndex] === value ? null : value
      return next
    })
  }

  const handleSubmit = () => {
    if (!step1Data) return
    setFormError(null)

    registerAndLogin.mutate(
      {
        ...step1Data,
        intro: bio || undefined,
        job: job || undefined,
        mbti: mbtiString,
      },
      {
        onSuccess: () => {
          sessionStorage.removeItem(REGISTER_SESSION_KEY)
          // 가입 완료 후 홈으로 이동하더라도 전역 안내를 유지한다. (KAN-227)
          showToast(t('welcomeToast'), 'welcome')
        },
        onError: (error) => {
          const code = getApiErrorCode(error)
          if (code === 'EMAIL_ALREADY_EXISTS') {
            sessionStorage.setItem(REGISTER_EMAIL_ERROR_KEY, tCommon('errors.EMAIL_ALREADY_EXISTS'))
            router.push('/register')
            return
          }
          setFormError(resolveApiErrorMessage(error, tCommon))
        },
      }
    )
  }

  // 마운트 전(또는 세션 데이터 없음)에는 렌더하지 않아 Hydration 불일치를 피한다. (KAN-219)
  if (!mounted || !step1Data) return null

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-background border-b border-tag-bg/50">
        <div className="flex items-center px-4 py-3">
          <button
            onClick={handleBack}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label={tCommon('back')}
          >
            <ArrowLeft size={20} className="text-foreground" />
          </button>
          <h1 className="flex-1 text-center text-base font-bold text-foreground pr-11">
            {tCommon('register')}
          </h1>
        </div>
      </header>

      <div className="flex justify-center gap-2 pt-6 pb-2">
        <div className="w-2.5 h-2.5 rounded-full bg-primary opacity-30" />
        <div className="w-2.5 h-2.5 rounded-full bg-primary" />
      </div>

      <div className="px-6 pt-4 pb-10 flex flex-col gap-6">
        <p className="text-center text-sm text-tag-text">{t('intro')}</p>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-foreground">
            {t('bioLabel')} <span className="text-tag-text font-normal">{t('optional')}</span>
          </label>
          <input
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder={t('bioPlaceholder')}
            maxLength={100}
            className="w-full px-4 py-3 rounded-input border border-tag-bg bg-card text-foreground placeholder:text-tag-text focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-foreground block mb-2">{t('jobLabel')}</label>
          <JobSelect value={job} onChange={setJob} />
        </div>

        <div>
          <label className="text-sm font-medium text-foreground block mb-2">{t('mbtiLabel')}</label>
          <div className="grid grid-cols-4 gap-2">
            {MBTI_ROWS[0].map((letter, colIndex) => (
              <button
                key={`row0-${letter}`}
                type="button"
                onClick={() => handleMbtiSelect(colIndex, letter)}
                className={`py-3 rounded-input text-sm font-bold transition-colors min-h-[44px] ${mbti[colIndex] === letter ? 'bg-primary text-white' : 'bg-tag-bg text-tag-text'}`}
              >
                {letter}
              </button>
            ))}
            {MBTI_ROWS[1].map((letter, colIndex) => (
              <button
                key={`row1-${letter}`}
                type="button"
                onClick={() => handleMbtiSelect(colIndex, letter)}
                className={`py-3 rounded-input text-sm font-bold transition-colors min-h-[44px] ${mbti[colIndex] === letter ? 'bg-primary text-white' : 'bg-tag-bg text-tag-text'}`}
              >
                {letter}
              </button>
            ))}
          </div>
          {mbtiString && (
            <p className="text-center text-sm text-primary font-medium mt-2">
              {t('mbtiResult', { mbti: mbtiString })}
            </p>
          )}
        </div>

        {formError && (
          <p className="text-sm text-primary text-center">{formError}</p>
        )}

        <div className="flex gap-3 mt-2">
          <Button
            type="button"
            variant="outlined"
            size="lg"
            className="flex-1"
            onClick={handleBack}
          >
            {tCommon('previous')}
          </Button>
          <Button
            variant="primary"
            size="lg"
            className="flex-1"
            onClick={handleSubmit}
            isLoading={registerAndLogin.isPending}
          >
            {tCommon('start')}
          </Button>
        </div>
      </div>
    </div>
  )
}
