'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import dayjs from 'dayjs'
import AppImage from '@/components/ui/AppImage'
import HScrollButtons from '@/components/ui/HScrollButtons'
import { useMyApplicationsMe, useCancelApplication } from '@/lib/hooks/useApplications'
import { useRequireAuth } from '@/lib/hooks/useRequireAuth'
import PaymentStatusBadge from '@/components/mypage/PaymentStatusBadge'
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

type FilterStatus = ApplicationStatus | null

const FILTER_TABS: { label: string; value: FilterStatus }[] = [
  { label: '전체', value: null },
  { label: '대기중', value: 'PENDING' },
  { label: '확정', value: 'CONFIRMED' },
  { label: '참석', value: 'ATTENDED' },
  { label: '취소', value: 'CANCELLED' },
]

export default function MyApplicationList() {
  const router = useRouter()
  const { isLoggedIn } = useRequireAuth()
  const [filterStatus, setFilterStatus] = useState<FilterStatus>(null)
  const { data: applications, isLoading } = useMyApplicationsMe(filterStatus, isLoggedIn)
  const cancelMutation = useCancelApplication()
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const tabScrollRef = useRef<HTMLDivElement>(null)

  const handleCancelClick = (id: string) => {
    setConfirmingId(id)
  }

  const handleCancelConfirm = (id: string) => {
    cancelMutation.mutate(id, {
      onSuccess: () => setConfirmingId(null),
    })
  }

  return (
    <div>
      {/* 필터 탭 */}
      <div className="relative mb-4">
        <div ref={tabScrollRef} className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.label}
              onClick={() => {
                setFilterStatus(tab.value)
                setConfirmingId(null)
              }}
              className={`shrink-0 text-sm font-medium px-4 py-1.5 rounded-full transition-colors ${
                filterStatus === tab.value
                  ? 'bg-primary text-white'
                  : 'bg-tag-bg text-tag-text'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <HScrollButtons scrollRef={tabScrollRef} />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-tag-text">불러오는 중...</p>
        </div>
      ) : !applications || applications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-2">
          <p className="text-sm text-tag-text">
            {filterStatus ? '해당 상태의 신청 내역이 없어요.' : '아직 신청한 게더링이 없어요.'}
          </p>
          {!filterStatus && (
            <button
              onClick={() => router.push('/gatherings')}
              className="text-sm text-primary font-medium underline"
            >
              게더링 둘러보기
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {applications.map((item) => {
            const isConfirmed = item.status === 'CONFIRMED'
            return (
            <div
              key={item.id}
              className={`bg-card rounded-card p-4 ${
                isConfirmed ? 'cursor-pointer transition-colors hover:bg-card/80' : ''
              }`}
              onClick={
                isConfirmed
                  ? () => router.push(`/gatherings/${item.gathering.id}/apply/confirmed`)
                  : undefined
              }
              role={isConfirmed ? 'button' : undefined}
              tabIndex={isConfirmed ? 0 : undefined}
              onKeyDown={
                isConfirmed
                  ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        router.push(`/gatherings/${item.gathering.id}/apply/confirmed`)
                      }
                    }
                  : undefined
              }
            >
              <div className="flex gap-3">
                <div className="relative w-14 h-14 rounded-[10px] overflow-hidden shrink-0 bg-tag-bg">
                  {item.gathering.thumbnailUrl ? (
                    <AppImage
                      src={item.gathering.thumbnailUrl}
                      alt={item.gathering.title}
                      className="object-cover"
                      sizes="56px"
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
                    <div className="shrink-0 flex flex-col items-end gap-1">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_STYLE[item.status]}`}>
                        {STATUS_LABEL[item.status]}
                      </span>
                      <PaymentStatusBadge status={item.paymentStatus} />
                    </div>
                  </div>
                  <p className="text-xs text-tag-text mt-1">
                    {dayjs(item.gathering.eventDate).format('YYYY. MM. DD (ddd)')}
                  </p>
                  <p className="text-xs text-tag-text mt-0.5">예약번호: {item.bookingNumber}</p>
                </div>
              </div>

              {(item.status === 'PENDING' || item.status === 'CONFIRMED') && (
                <div
                  className="mt-3 pt-3 border-t border-tag-bg/50"
                  onClick={(e) => e.stopPropagation()}
                >
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
              )}
            </div>
          )
          })}
        </div>
      )}
    </div>
  )
}
