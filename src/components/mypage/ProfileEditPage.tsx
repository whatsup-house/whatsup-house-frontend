'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useMyProfile } from '@/lib/hooks/useAuth'
import { useRequireAuth } from '@/lib/hooks/useRequireAuth'
import { useBackNavigation } from '@/lib/hooks/useBackNavigation'
import ProfileEditForm from '@/components/mypage/ProfileEditForm'

/** 프로필 수정 라우트(/mypage/edit). 공통 TopNav·BottomNav 안에서 폼을 렌더링한다. */
export default function ProfileEditPage() {
  const t = useTranslations('mypage.profile')
  const tCommon = useTranslations('common')
  const router = useRouter()
  const { isLoggedIn, isInitialized } = useRequireAuth()
  const { data: profile, isLoading } = useMyProfile()
  const goBack = useBackNavigation('/mypage')

  useEffect(() => {
    if (isInitialized && !isLoggedIn) {
      router.replace('/login?returnUrl=/mypage/edit')
    }
  }, [isInitialized, isLoggedIn, router])

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

  return <ProfileEditForm profile={profile} onDone={goBack} />
}
