'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui'
import { useRegisterAndLogin } from '@/lib/hooks/useAuth'
import type { Gender } from '@/lib/api/types'
import { REGISTER_SESSION_KEY } from '../register/page'

const MBTI_ROWS = [
  ['E', 'S', 'T', 'J'],
  ['I', 'N', 'F', 'P'],
] as const

const JOB_OPTIONS = [
  { value: 'STUDENT', label: '대학생' },
  { value: 'WORKER', label: '직장인' },
  { value: 'FREELANCER', label: '프리랜서' },
  { value: 'OTHER', label: '기타' },
]

const INTEREST_OPTIONS = ['감성', '독서', '음악', '자연', '요리', '운동', '여행', '영화', '미술', '사진']

interface Step1Data {
  email: string
  password: string
  name: string
  nickname: string
  gender: Gender
  age: number
  phone?: string
}

export default function OnboardingPage() {
  const router = useRouter()
  const [step1Data] = useState<Step1Data | null>(() => {
    if (typeof window === 'undefined') return null
    const raw = sessionStorage.getItem(REGISTER_SESSION_KEY)
    if (!raw) return null
    try {
      return JSON.parse(raw) as Step1Data
    } catch {
      return null
    }
  })
  const [bio, setBio] = useState('')
  const [job, setJob] = useState('')
  const [mbti, setMbti] = useState<(string | null)[]>([null, null, null, null])
  const [selectedInterests, setSelectedInterests] = useState<string[]>([])
  const [formError, setFormError] = useState<string | null>(null)

  const registerAndLogin = useRegisterAndLogin()

  useEffect(() => {
    if (!step1Data) {
      router.replace('/register')
    }
  }, [step1Data, router])

  const mbtiString = mbti.every((v) => v !== null) ? mbti.join('') : undefined

  const handleMbtiSelect = (colIndex: number, value: string) => {
    setMbti((prev) => {
      const next = [...prev]
      next[colIndex] = prev[colIndex] === value ? null : value
      return next
    })
  }

  const toggleInterest = (interest: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]
    )
  }

  const handleSubmit = () => {
    if (!step1Data) return
    setFormError(null)

    registerAndLogin.mutate(
      {
        ...step1Data,
        bio: bio || undefined,
        job: job || undefined,
        mbti: mbtiString,
        interests: selectedInterests.length > 0 ? selectedInterests : undefined,
      },
      {
        onSuccess: () => {
          sessionStorage.removeItem(REGISTER_SESSION_KEY)
        },
        onError: () => {
          setFormError('회원가입 중 오류가 발생했습니다. 다시 시도해주세요.')
        },
      }
    )
  }

  if (!step1Data) return null

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-background border-b border-tag-bg/50">
        <div className="flex items-center px-4 py-3">
          <button
            onClick={() => router.push('/register')}
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
        <div className="w-2.5 h-2.5 rounded-full bg-primary opacity-30" />
        <div className="w-2.5 h-2.5 rounded-full bg-primary" />
      </div>

      <div className="px-6 pt-4 pb-10 flex flex-col gap-6">
        <p className="text-center text-sm text-tag-text">어떤 분인지 알려주세요 (선택)</p>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-foreground">
            한 줄 소개 <span className="text-tag-text font-normal">(선택)</span>
          </label>
          <input
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="나를 한 줄로 소개해주세요"
            maxLength={100}
            className="w-full px-4 py-3 rounded-input border border-tag-bg bg-card text-foreground placeholder:text-tag-text focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-foreground block mb-2">직업</label>
          <div className="grid grid-cols-2 gap-2">
            {JOB_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setJob(job === option.value ? '' : option.value)}
                className={`py-2.5 rounded-input text-sm font-medium transition-colors min-h-[44px] ${job === option.value ? 'bg-primary text-white' : 'bg-tag-bg text-tag-text'}`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-foreground block mb-2">MBTI</label>
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
              {mbtiString} 유형이군요!
            </p>
          )}
        </div>

        <div>
          <label className="text-sm font-medium text-foreground block mb-3">관심 분야</label>
          <div className="flex flex-wrap gap-2">
            {INTEREST_OPTIONS.map((interest) => (
              <button
                key={interest}
                type="button"
                onClick={() => toggleInterest(interest)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors min-h-[44px] ${selectedInterests.includes(interest) ? 'bg-primary text-white' : 'bg-tag-bg text-tag-text'}`}
              >
                {interest}
              </button>
            ))}
          </div>
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
            onClick={() => router.push('/register')}
          >
            이전
          </Button>
          <Button
            variant="primary"
            size="lg"
            className="flex-1"
            onClick={handleSubmit}
            isLoading={registerAndLogin.isPending}
          >
            시작하기
          </Button>
        </div>
      </div>
    </div>
  )
}
