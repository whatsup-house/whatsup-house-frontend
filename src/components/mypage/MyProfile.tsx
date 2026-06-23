'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, LayoutDashboard, Ticket } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { useMyProfile, useLogout } from '@/lib/hooks/useAuth'
import { useRequireAuth } from '@/lib/hooks/useRequireAuth'
import { useMyTickets } from '@/lib/hooks/useTickets'
import { useJobs } from '@/lib/hooks/useJobs'
import Button from '@/components/ui/Button'
import ProfileEditOverlay from '@/components/mypage/ProfileEditOverlay'
import WithdrawAccountDialog from '@/components/mypage/WithdrawAccountDialog'
import PasswordChangeDialog from '@/components/mypage/PasswordChangeDialog'

// characterUrl 미존재/이미지 로드 실패 시 사용할 로컬 기본 캐릭터 (KAN-285)
const FALLBACK_CHARACTER = '/assets/job/DEFAULT_SUIT.png'

function ProfileRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div className="flex justify-between py-3 border-b border-tag-bg/50 last:border-b-0">
      <span className="text-sm text-tag-text">{label}</span>
      <span className="text-sm text-foreground font-medium">{value}</span>
    </div>
  )
}

// 직업 기반 캐릭터 이미지. 로드 실패 시 기본 캐릭터(DEFAULT_SUIT)로 폴백한다. (KAN-285)
function ProfileCharacter({ url, alt }: { url: string | null; alt: string }) {
  const [src, setSrc] = useState(url || FALLBACK_CHARACTER)
  return (
    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-tag-bg">
      <Image
        src={src}
        alt={alt}
        fill
        sizes="80px"
        className="object-contain"
        onError={() => {
          if (src !== FALLBACK_CHARACTER) setSrc(FALLBACK_CHARACTER)
        }}
      />
    </div>
  )
}

export default function MyProfile() {
  const t = useTranslations('mypage.profile')
  const tCommon = useTranslations('common')
  const router = useRouter()
  const { isLoggedIn, isInitialized } = useRequireAuth()
  const { data: profile, isLoading } = useMyProfile()
  const { data: tickets } = useMyTickets()
  const { data: jobGroups } = useJobs()
  const logout = useLogout()
  const [showEdit, setShowEdit] = useState(false)
  const [showWithdraw, setShowWithdraw] = useState(false)
  const [showPasswordChange, setShowPasswordChange] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    if (isInitialized && !isLoggedIn) {
      router.replace('/login?returnUrl=/mypage')
    }
  }, [isInitialized, isLoggedIn, router])

  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(null), 2500)
    return () => clearTimeout(timer)
  }, [notice])

  if (!isInitialized || !isLoggedIn || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-sm text-tag-text">{tCommon('loading')}</p>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-sm text-tag-text">{t('loadFailed')}</p>
      </div>
    )
  }

  // 직업은 코드로 저장되므로 카탈로그에서 라벨로 변환해 표시한다. (KAN-270)
  const jobLabel = (() => {
    if (!profile.job) return null
    for (const group of jobGroups ?? []) {
      const found = group.jobs.find((job) => job.code === profile.job)
      if (found) return found.label
    }
    return profile.job
  })()

  return (
    <>
    {showEdit && (
      <ProfileEditOverlay profile={profile} onClose={() => setShowEdit(false)} />
    )}
    {showWithdraw && (
      <WithdrawAccountDialog onClose={() => setShowWithdraw(false)} />
    )}
    {showPasswordChange && (
      <PasswordChangeDialog
        onClose={() => setShowPasswordChange(false)}
        onSuccess={() => setNotice(t('passwordChanged'))}
      />
    )}
    <div className="min-h-screen bg-background">
      <div className="px-6 py-6 flex flex-col gap-4">
        {/* 프로필 요약 — 좌측 직업 캐릭터 / 우측 닉네임·한줄소개·마일리지 (KAN-285) */}
        <div className="bg-card rounded-card p-5 flex items-center gap-4 relative">
          <button
            onClick={() => setShowEdit(true)}
            className="absolute top-4 right-4 min-w-[36px] min-h-[36px] flex items-center justify-center text-tag-text"
            aria-label={t('editProfile')}
          >
            <Pencil size={16} />
          </button>
          <ProfileCharacter
            key={profile.characterUrl ?? 'default'}
            url={profile.characterUrl}
            alt={profile.nickname}
          />
          <div className="flex-1 min-w-0 flex flex-col items-start gap-1.5">
            <h2 className="text-lg font-bold text-foreground truncate max-w-full pr-7">
              {profile.nickname}
            </h2>
            {(profile.intro ?? profile.bio) && (
              <p className="text-sm text-tag-text line-clamp-2">{profile.intro ?? profile.bio}</p>
            )}
            <Link
              href="/mypage/mileage"
              className="bg-tag-bg rounded-full px-4 py-1.5 flex items-center gap-1 mt-1"
            >
              <span className="text-sm font-semibold text-foreground">
                {t('mileage', { mileage: (profile.mileage ?? 0).toLocaleString() })}
              </span>
              <span className="text-xs text-tag-text">›</span>
            </Link>
          </div>
        </div>

        {/* 우연한 식탁 이용권 잔여 (KAN-260) */}
        {tickets && (
          <div className="bg-card rounded-card px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Ticket size={18} className="text-primary shrink-0" />
              <span className="text-sm font-medium text-foreground">{t('ticketPass')}</span>
            </div>
            <span className="text-sm font-bold text-primary">{t('ticketRemaining', { count: tickets.totalRemaining })}</span>
          </div>
        )}

        {/* 상세 정보 */}
        <div className="bg-card rounded-card px-5">
          <ProfileRow label={t('phone')} value={profile.phone} />
          <ProfileRow
            label={t('gender')}
            value={profile.gender ? t(`genderLabels.${profile.gender}`) : null}
          />
          <ProfileRow
            label={t('age')}
            value={profile.age !== null ? t('ageValue', { age: profile.age }) : null}
          />
          <ProfileRow label={t('job')} value={jobLabel} />
          <ProfileRow label={t('mbti')} value={profile.mbti} />
          <ProfileRow label={t('animalType')} value={profile.animalType} />
        </div>

        {/* 관심사 */}
        {profile.interests && profile.interests.length > 0 && (
          <div className="bg-card rounded-card p-5">
            <p className="text-sm text-tag-text mb-3">{t('interests')}</p>
            <div className="flex flex-wrap gap-2">
              {profile.interests.map((interest) => (
                <span
                  key={interest}
                  className="bg-tag-bg text-tag-text text-xs px-3 py-1.5 rounded-full"
                >
                  {interest}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 관리자 전용 대시보드 이동 (KAN-228) */}
        {profile.admin && (
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            onClick={() => router.push('/admin')}
          >
            <span className="inline-flex items-center gap-2">
              <LayoutDashboard size={18} />
              {t('adminDashboard')}
            </span>
          </Button>
        )}

        {/* 로그아웃 */}
        <Button
          variant="outlined"
          size="lg"
          className="w-full"
          onClick={() => logout.mutate()}
          isLoading={logout.isPending}
        >
          {t('logout')}
        </Button>

        <div className="flex min-h-[44px] items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => setShowPasswordChange(true)}
            className="text-sm font-medium text-tag-text underline decoration-tag-text/40 underline-offset-4"
          >
            {t('changePassword')}
          </button>
          <span className="h-3 w-px bg-tag-bg" aria-hidden="true" />
          <button
            type="button"
            onClick={() => setShowWithdraw(true)}
            className="text-sm font-medium text-tag-text underline decoration-tag-text/40 underline-offset-4"
          >
            {t('withdraw')}
          </button>
        </div>
      </div>
    </div>
    {notice && (
      <div className="fixed inset-x-0 bottom-8 z-[100] flex justify-center px-6 pointer-events-none">
        <div className="max-w-[430px] w-full rounded-input bg-foreground/90 text-white text-sm font-medium px-4 py-3 text-center shadow-lg">
          {notice}
        </div>
      </div>
    )}
    </>
  )
}
