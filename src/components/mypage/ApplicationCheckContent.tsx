'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSearchParams } from 'next/navigation'
import GuestApplicationCheck from './GuestApplicationCheck'
import TokenApplicationCheck from './TokenApplicationCheck'
import { Button, Card, LoadingSpinner } from '@/components/ui'
import { useMyApplicationsMe } from '@/lib/hooks/useApplications'
import { useRequireAuth } from '@/lib/hooks/useRequireAuth'

function MemberBookingRedirect({ bookingNumber }: { bookingNumber: string }) {
  const router = useRouter()
  const { data: applications, isLoading, isError } = useMyApplicationsMe(null, true)
  const matchedApplication = applications?.find((application) => application.bookingNumber === bookingNumber)

  useEffect(() => {
    if (!matchedApplication) return
    router.replace(`/mypage/applications/${encodeURIComponent(matchedApplication.id)}`)
  }, [matchedApplication, router])

  if (isLoading || matchedApplication) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-background px-5 py-8">
      <Card className="p-5">
        <p className="text-sm leading-relaxed text-tag-text">
          {isError
            ? '신청 내역을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.'
            : '로그인한 계정에서 해당 예약번호의 신청 내역을 찾지 못했어요.'}
        </p>
        <Button className="mt-5 w-full" onClick={() => router.push('/mypage?tab=applications')}>
          내 신청 내역으로 가기
        </Button>
      </Card>
    </main>
  )
}

export default function ApplicationCheckContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const bookingNumber = searchParams.get('bookingNumber')
  const { isLoggedIn, isInitialized } = useRequireAuth()

  if (token) {
    return <TokenApplicationCheck token={token} />
  }
  if (bookingNumber && isInitialized && isLoggedIn) {
    return <MemberBookingRedirect bookingNumber={bookingNumber} />
  }
  return <GuestApplicationCheck />
}
