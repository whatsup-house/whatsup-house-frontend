'use client'

import { use } from 'react'
import { useRouter } from 'next/navigation'
import { useGatheringDetail } from '@/lib/hooks/useGatherings'
import { LoadingSpinner, ApiErrorMessage } from '@/components/ui'
import GuestApplicationForm from '@/components/gathering/GuestApplicationForm'
import dayjs from 'dayjs'

export default function ApplyPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()

  const { data: gathering, isLoading, isError, refetch } = useGatheringDetail(id)

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-background">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (isError || !gathering) {
    return (
      <div className="min-h-screen bg-background px-4 pt-20">
        <ApiErrorMessage
          message="게더링 정보를 불러올 수 없습니다."
          onRetry={() => { refetch() }}
        />
      </div>
    )
  }

  const formattedDate = dayjs(gathering.eventDate).format('YYYY. MM. DD (ddd)')
  const formattedTime = gathering.startTime?.slice(0, 5) ?? ''

  return (
    <div className="min-h-screen bg-background">
      <div className="px-4 pt-4 pb-6">
        <div className="flex items-center gap-3 bg-card rounded-card p-3 mb-5 shadow-sm">
          <div className="w-16 h-16 rounded-[12px] overflow-hidden shrink-0 bg-tag-bg">
            {gathering.thumbnailUrl ? (
              <img
                src={gathering.thumbnailUrl}
                alt={gathering.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-tag-bg" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground truncate">{gathering.title}</p>
            <p className="text-xs text-tag-text mt-0.5">
              📅 {formattedDate} {formattedTime}
            </p>
          </div>
        </div>

        <GuestApplicationForm gathering={gathering} />
      </div>
    </div>
  )
}
