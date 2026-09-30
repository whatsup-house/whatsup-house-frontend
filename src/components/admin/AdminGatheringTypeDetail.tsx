'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import dayjs from 'dayjs'
import { ChevronLeft } from 'lucide-react'
import type { AdminGatheringStatus } from '@/lib/api/admin'
import type { AdminSessionRequest, GatheringSession, GatheringSessionStatus, GatheringType } from '@/lib/api/types'
import {
  useAdminGatheringDetail,
  useDeleteGathering,
  useDeleteSession,
  useUpdateGatheringStatus,
} from '@/lib/hooks/useAdminGathering'
import { toBadgeStatus } from '@/lib/utils/gatheringStatus'
import { formatTimeRange } from '@/lib/utils/date'
import { ApiErrorMessage, Badge, LoadingSpinner } from '@/components/ui'
import { GatheringFormPanel } from '@/components/admin/GatheringFormPanel'
import GatheringSessionModal from '@/components/admin/GatheringSessionModal'
import FormQuestionBuilder from '@/components/admin/FormQuestionBuilder'

const TYPE_LABEL: Record<GatheringType, string> = {
  REGULAR: '일반',
  RANDOM_TABLE: '우연한 식탁',
}

// 회차 상태별로 바꿀 수 있는 상태. PATCH /{회차 ID}/status는 GatheringStatus 값을 받는다. (KAN-338)
const NEXT_STATUSES: Record<GatheringSessionStatus, { value: AdminGatheringStatus; label: string }[]> = {
  OPEN: [
    { value: 'CLOSED', label: '모집 마감' },
    { value: 'CANCELLED', label: '취소' },
  ],
  CLOSED: [
    { value: 'COMPLETED', label: '진행 완료' },
    { value: 'CANCELLED', label: '취소' },
  ],
  DONE: [],
  CANCELLED: [],
}

interface AdminGatheringTypeDetailProps {
  gatheringId: string
}

type SessionModalState = { sessionId: string; values: AdminSessionRequest } | 'new' | null

// 관리자 모임 종류 상세: 종류 정보·수정·삭제, 회차 목록·추가·수정·상태 변경·삭제, 신청폼. (KAN-340)
export default function AdminGatheringTypeDetail({ gatheringId }: AdminGatheringTypeDetailProps) {
  const router = useRouter()
  const { data: detail, isLoading, refetch } = useAdminGatheringDetail(gatheringId)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [sessionModal, setSessionModal] = useState<SessionModalState>(null)
  const { mutate: changeStatus } = useUpdateGatheringStatus()
  const { mutate: deleteSession } = useDeleteSession()
  const { mutate: deleteGathering } = useDeleteGathering(() => router.push('/admin/gatherings'))

  if (isLoading) {
    return <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
  }
  if (!detail) {
    return <ApiErrorMessage message="모임을 불러오지 못했어요." onRetry={() => refetch()} />
  }

  // 응답에는 유효 가격만 있다. 기본 가격과 다르면 회차 가격(오버라이드)으로 본다.
  const toEditing = (s: GatheringSession) => ({
    sessionId: s.id,
    values: {
      eventDate: s.eventDate,
      startTime: s.startTime?.slice(0, 5) ?? null,
      endTime: s.endTime?.slice(0, 5) ?? null,
      locationId: s.location?.id ?? '',
      maxAttendees: s.maxAttendees,
      priceOverride: s.price !== null && s.price !== detail.basePrice ? s.price : null,
      applyDeadlineAt: s.applyDeadlineAt?.slice(0, 16) ?? null,
      // 우연한 식탁 전용 필드 — 모달이 RANDOM_TABLE일 때만 쓴다 (KAN-351)
      matchRunAt: s.matchRunAt?.slice(0, 16),
      autoConfirmGraceMinutes: s.autoConfirmGraceMinutes,
      tableSizeMin: s.tableSizeMin ?? undefined,
      tableSizeMax: s.tableSizeMax ?? undefined,
      minGroupScore: s.minGroupScore,
      maxAgeGap: s.maxAgeGap,
    },
  })

  const handleStatusChange = (s: GatheringSession, next: AdminGatheringStatus) => {
    const label = NEXT_STATUSES[s.status].find((o) => o.value === next)?.label ?? next
    if (confirm(`${dayjs(s.eventDate).format('M/D')} 회차를 '${label}'(으)로 변경할까요?`)) {
      changeStatus({ id: s.id, status: next })
    }
  }

  const handleDeleteSession = (s: GatheringSession) => {
    if (confirm(`${dayjs(s.eventDate).format('M/D')} 회차를 삭제할까요?`)) deleteSession(s.id)
  }

  const handleDeleteGathering = () => {
    if (confirm(`"${detail.title}" 모임과 모든 회차를 삭제할까요?`)) deleteGathering(detail.id)
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/gatherings" className="inline-flex items-center gap-1 text-sm text-tag-text hover:text-foreground mb-3">
          <ChevronLeft size={16} /> 게더링 목록
        </Link>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-bold text-[22px] text-foreground break-all">{detail.title}</h1>
              <span className="px-2 py-0.5 rounded-full bg-tag-bg text-tag-text text-xs font-medium">
                {TYPE_LABEL[detail.gatheringType ?? 'REGULAR']}
              </span>
            </div>
            <p className="mt-1 text-sm text-tag-text">
              기본 참가비 {(detail.basePrice ?? 0).toLocaleString()}원
              {detail.tags && detail.tags.length > 0 && ` · ${detail.tags.map((t) => `#${t}`).join(' ')}`}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              onClick={() => setIsPanelOpen(true)}
              className="px-4 h-10 rounded-input border border-primary text-primary text-sm font-medium hover:bg-primary-light"
            >
              모임 수정
            </button>
            <button
              onClick={handleDeleteGathering}
              className="px-4 h-10 rounded-input border border-tag-bg text-tag-text text-sm font-medium hover:border-primary hover:text-primary"
            >
              삭제
            </button>
          </div>
        </div>
      </div>

      {/* 회차 */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-base text-foreground">회차 {detail.sessions.length}개</h2>
          <button
            onClick={() => setSessionModal('new')}
            className="px-4 h-10 bg-primary text-white rounded-input text-sm font-medium hover:opacity-90"
          >
            + 회차 추가
          </button>
        </div>

        <div className="bg-card rounded-card shadow-sm overflow-x-auto">
          <table className="w-full min-w-[820px]">
            <thead>
              <tr className="bg-tag-bg text-xs text-tag-text">
                {['날짜/시간', '장소', '가격', '확정/정원', '신청 마감', '상태', '액션'].map((col) => (
                  <th key={col} className="px-4 py-3 text-left font-medium">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {detail.sessions.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-sm text-tag-text">
                    아직 회차가 없어요. 회차를 추가해야 사용자에게 노출돼요.
                  </td>
                </tr>
              )}
              {detail.sessions.map((s) => {
                const isReadOnly = s.status === 'DONE' || s.status === 'CANCELLED'
                const nextStatuses = NEXT_STATUSES[s.status]
                return (
                  <tr key={s.id} className="border-t border-tag-bg">
                    <td className="px-4 py-3 text-sm text-foreground whitespace-nowrap">
                      {dayjs(s.eventDate).format('YYYY.M.D (dd)')} {formatTimeRange(s.startTime, s.endTime)}
                    </td>
                    <td className="px-4 py-3 text-sm text-tag-text max-w-[160px] truncate">{s.location?.name ?? '-'}</td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap">
                      {(s.price ?? 0).toLocaleString()}원
                      {s.price !== detail.basePrice && <span className="ml-1 text-xs text-tag-text">(회차 가격)</span>}
                    </td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap">{s.confirmedCount}/{s.maxAttendees}명</td>
                    <td className="px-4 py-3 text-sm text-tag-text whitespace-nowrap">
                      {s.applyDeadlineAt ? dayjs(s.applyDeadlineAt).format('M/D HH:mm') : '-'}
                    </td>
                    <td className="px-4 py-3"><Badge variant={toBadgeStatus(s.status)} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3 text-sm">
                        <button
                          onClick={() => setSessionModal(toEditing(s))}
                          disabled={isReadOnly}
                          className="text-primary hover:underline disabled:opacity-40 disabled:cursor-not-allowed disabled:no-underline"
                        >
                          수정
                        </button>
                        {nextStatuses.length > 0 && (
                          <select
                            defaultValue=""
                            onChange={(e) => {
                              if (e.target.value) {
                                handleStatusChange(s, e.target.value as AdminGatheringStatus)
                                e.target.value = ''
                              }
                            }}
                            className="text-tag-text text-xs border border-tag-bg rounded-input px-2 py-1 bg-card cursor-pointer hover:border-primary focus:outline-none"
                          >
                            <option value="" disabled>상태 변경</option>
                            {nextStatuses.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        )}
                        <button onClick={() => handleDeleteSession(s)} className="text-tag-text hover:text-primary hover:underline">
                          삭제
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* 신청폼 — 폼은 종류 단위로 붙는다 */}
      <section>
        <FormQuestionBuilder gatheringId={detail.id} gatheringTitle={detail.title} />
      </section>

      {isPanelOpen && (
        <GatheringFormPanel
          key={detail.id}
          gatheringId={detail.id}
          onClose={() => setIsPanelOpen(false)}
          onSuccess={() => setIsPanelOpen(false)}
        />
      )}

      {sessionModal && (
        <GatheringSessionModal
          // 대상이 바뀌면 새로 마운트해 이전 입력이 남지 않게 한다.
          key={sessionModal === 'new' ? 'new' : sessionModal.sessionId}
          gatheringId={detail.id}
          gatheringType={detail.gatheringType}
          editing={sessionModal === 'new' ? null : sessionModal}
          onClose={() => setSessionModal(null)}
        />
      )}
    </div>
  )
}
