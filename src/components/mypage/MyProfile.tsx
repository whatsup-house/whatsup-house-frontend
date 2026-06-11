'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, LayoutDashboard } from 'lucide-react'
import Link from 'next/link'
import { useMyProfile, useLogout } from '@/lib/hooks/useAuth'
import { useRequireAuth } from '@/lib/hooks/useRequireAuth'
import Button from '@/components/ui/Button'
import ProfileEditOverlay from '@/components/mypage/ProfileEditOverlay'
import WithdrawAccountDialog from '@/components/mypage/WithdrawAccountDialog'
import PasswordChangeDialog from '@/components/mypage/PasswordChangeDialog'

const GENDER_LABELS: Record<string, string> = {
  MALE: '남성',
  FEMALE: '여성',
}

function ProfileRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div className="flex justify-between py-3 border-b border-tag-bg/50 last:border-b-0">
      <span className="text-sm text-tag-text">{label}</span>
      <span className="text-sm text-foreground font-medium">{value}</span>
    </div>
  )
}

export default function MyProfile() {
  const router = useRouter()
  const { isLoggedIn, isInitialized } = useRequireAuth()
  const { data: profile, isLoading } = useMyProfile()
  const logout = useLogout()
  const [showEdit, setShowEdit] = useState(false)
  const [showWithdraw, setShowWithdraw] = useState(false)
  const [showPasswordChange, setShowPasswordChange] = useState(false)

  useEffect(() => {
    if (isInitialized && !isLoggedIn) {
      router.replace('/login?returnUrl=/mypage')
    }
  }, [isInitialized, isLoggedIn, router])

  if (!isInitialized || !isLoggedIn || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-sm text-tag-text">불러오는 중...</p>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-sm text-tag-text">프로필을 불러올 수 없습니다.</p>
      </div>
    )
  }

  return (
    <>
    {showEdit && (
      <ProfileEditOverlay profile={profile} onClose={() => setShowEdit(false)} />
    )}
    {showWithdraw && (
      <WithdrawAccountDialog onClose={() => setShowWithdraw(false)} />
    )}
    {showPasswordChange && (
      <PasswordChangeDialog onClose={() => setShowPasswordChange(false)} />
    )}
    <div className="min-h-screen bg-background">
      <div className="px-6 py-6 flex flex-col gap-4">
        {/* 프로필 요약 */}
        <div className="bg-card rounded-card p-5 flex flex-col items-center gap-3 relative">
          <button
            onClick={() => setShowEdit(true)}
            className="absolute top-4 right-4 min-w-[36px] min-h-[36px] flex items-center justify-center text-tag-text"
            aria-label="프로필 수정"
          >
            <Pencil size={16} />
          </button>
          <div className="w-16 h-16 rounded-full bg-tag-bg flex items-center justify-center text-2xl">
            🐾
          </div>
          <div className="text-center">
            <h2 className="text-lg font-bold text-foreground">{profile.nickname}</h2>
            {profile.bio && (
              <p className="text-sm text-tag-text mt-1">{profile.bio}</p>
            )}
          </div>
          <Link
            href="/mypage/mileage"
            className="bg-tag-bg rounded-full px-4 py-1.5 flex items-center gap-1"
          >
            <span className="text-sm font-semibold text-foreground">
              {(profile.mileage ?? 0).toLocaleString()} 마일리지
            </span>
            <span className="text-xs text-tag-text">›</span>
          </Link>
        </div>

        {/* 상세 정보 */}
        <div className="bg-card rounded-card px-5">
          <ProfileRow label="연락처" value={profile.phone} />
          <ProfileRow
            label="성별"
            value={profile.gender ? (GENDER_LABELS[profile.gender] ?? profile.gender) : null}
          />
          <ProfileRow
            label="나이"
            value={profile.age !== null ? `${profile.age}세` : null}
          />
          <ProfileRow label="직업" value={profile.job} />
          <ProfileRow label="MBTI" value={profile.mbti} />
          <ProfileRow label="동물 유형" value={profile.animalType} />
        </div>

        {/* 관심사 */}
        {profile.interests && profile.interests.length > 0 && (
          <div className="bg-card rounded-card p-5">
            <p className="text-sm text-tag-text mb-3">관심사</p>
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
              관리자 대시보드
            </span>
          </Button>
        )}

        {/* 비밀번호 변경 (KAN-223) */}
        <Button
          variant="outlined"
          size="lg"
          className="w-full"
          onClick={() => setShowPasswordChange(true)}
        >
          비밀번호 변경
        </Button>

        {/* 로그아웃 */}
        <Button
          variant="outlined"
          size="lg"
          className="w-full"
          onClick={() => logout.mutate()}
          isLoading={logout.isPending}
        >
          로그아웃
        </Button>

        <button
          type="button"
          onClick={() => setShowWithdraw(true)}
          className="min-h-[44px] text-sm font-medium text-tag-text underline decoration-tag-text/40 underline-offset-4"
        >
          회원탈퇴
        </button>
      </div>
    </div>
    </>
  )
}
