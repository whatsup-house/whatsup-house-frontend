'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import dayjs from 'dayjs'
import { useMyApplications, useCancelApplication } from '@/lib/hooks/useApplications'
import { useRequireAuth } from '@/lib/hooks/useRequireAuth'
import type { ApplicationStatus } from '@/lib/api/types'

const STATUS_LABEL: Record<ApplicationStatus, string> = {
  PENDING: '검토 중',
  CONFIRMED: '확정',
  CANCELLED: '취소됨',
  ATTENDED: '참석 완료',
}

const STATUS_STYLE: Record<ApplicationStatus, string> = {
  PENDING: 'bg-tag-bg text-tag-text',
  CONFIRMED: 'bg-primary-light text-primary',
  CANCELLED: 'bg-tag-bg text-tag-text opacity-60',
  ATTENDED: 'bg-primary-light text-primary',
}

export default function MyApplicationList() {
  const router = useRouter()
  const { isLoggedIn } = useRequireAuth()
  const { data: applications, isLoading } = useMyApplications(isLoggedIn)
  const cancelMutation = useCancelApplication()
  const [confirmingId, setConfirmingId] = useState<string | null>(null)

  const handleCancelClick = (id: string) => {
    setConfirmingId(id)
  }

  const handleCancelConfirm = (id: string) => {
    cancelMutation.mutate(id, {
      onSuccess: () => setConfirmingId(null),
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-tag-text">불러오는 중...</p>
      </div>
    )
  }

  if (!applications || applications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-2">
        <p className="text-sm text-tag-text">아직 신청한 게더링이 없어요.</p>
        <button
          onClick={() => router.push('/gatherings')}
          className="text-sm text-primary font-medium underline"
        >
          게더링 둘러보기
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {applications.map((item) => (
        <div key={item.id} className="bg-card rounded-card p-4">
          <div className="flex gap-3">
            <div className="w-14 h-14 rounded-[10px] overflow-hidden shrink-0 bg-tag-bg">
              {item.gathering.thumbnailUrl ? (
                <img
                  src={item.gathering.thumbnailUrl}
                  alt={item.gathering.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-tag-bg" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-bold text-foreground leading-snug line-clamp-2">
                  {item.gathering.title}
                </p>
                <span className={`shrink-0 text-xs font-medium px-2 py-1 rounded-full ${STATUS_STYLE[item.status]}`}>
                  {STATUS_LABEL[item.status]}
                </span>
              </div>
              <p className="text-xs text-tag-text mt-1">
                {dayjs(item.gathering.eventDate).format('YYYY. MM. DD (ddd)')}
              </p>
              <p className="text-xs text-tag-text mt-0.5">예약번호: {item.bookingNumber}</p>
            </div>
          </div>

          {item.status === 'PENDING' || item.status === 'CONFIRMED' ? (
            <div className="mt-3 pt-3 border-t border-tag-bg/50">
              {confirmingId === item.id ? (
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-tag-text">정말 취소할까요?</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setConfirmingId(null)}
                      className="text-xs text-tag-text px-3 py-1.5 rounded-full bg-tag-bg"
                    >
                      돌아가기
                    </button>
                    <button
                      onClick={() => handleCancelConfirm(item.id)}
                      disabled={cancelMutation.isPending}
                      className="text-xs text-primary font-medium px-3 py-1.5 rounded-full bg-primary-light disabled:opacity-50"
                    >
                      {cancelMutation.isPending ? '취소 중...' : '취소 확인'}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => handleCancelClick(item.id)}
                  className="text-xs text-tag-text underline"
                >
                  신청 취소
                </button>
              )}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  )
}
