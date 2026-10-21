'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { DiningAdminTable } from '@/lib/api/types'
import {
  useDiningTables,
  useRetryDiningChatRoom,
  useRetryDiningNotifications,
  useSessionVenues,
  useUpdateSessionVenues,
} from '@/lib/hooks/useAdminDining'
import { useAssignDiningTableVenue } from '@/lib/hooks/useAdminDiningOps'
import { useToastStore } from '@/lib/store/toastStore'
import { TABLE_STATUS_CLASS, TABLE_STATUS_LABEL, tableLabel } from '@/lib/utils/diningStatus'
import { getAdminApiErrorMessage } from '@/lib/utils/apiError'
import { ApiErrorMessage, LoadingSpinner } from '@/components/ui'
import DiningVenuePoolPicker from '@/components/admin/DiningVenuePoolPicker'
import { showConfirm } from '@/lib/store/dialogStore'

const SMALL_BUTTON = 'inline-flex items-center px-3 h-9 rounded-input border text-sm font-medium disabled:opacity-50 disabled:pointer-events-none'
const SELECT_CLASS = 'h-9 w-full sm:w-56 rounded-input border border-tag-bg bg-card px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary'

interface DiningVenueChatTabProps {
  sessionId: string
}

// 식당과 단체방 탭: 이번 회차 식당 고르기(장소 관리의 식당 중에서), 테이블별 식당 배정, 단체방 열기·다시 만들기, 확정 알림 재발송 (KAN-352, KAN-429)
export default function DiningVenueChatTab({ sessionId }: DiningVenueChatTabProps) {
  const tablesQuery = useDiningTables(sessionId)
  const sessionVenuesQuery = useSessionVenues(sessionId)
  const showToast = useToastStore((s) => s.show)
  const saveVenues = useUpdateSessionVenues()
  const assignVenue = useAssignDiningTableVenue()
  const retryChatRoom = useRetryDiningChatRoom(sessionId)
  const retryNotifications = useRetryDiningNotifications()
  // 고치기 전에는 서버 값을 그대로 보여준다.
  const [draft, setDraft] = useState<Record<string, number> | null>(null)

  const sessionVenues = sessionVenuesQuery.data ?? []
  const pool = draft ?? Object.fromEntries(sessionVenues.map((p) => [p.venue.id, p.capacityTables]))

  const handleSavePool = () => {
    const body = Object.entries(pool).map(([venueId, capacityTables]) => ({ venueId, capacityTables }))
    saveVenues.mutate(
      { sessionIds: [sessionId], venues: body },
      {
        onSuccess: () => {
          setDraft(null)
          showToast('이번 회차 식당을 저장했어요.')
        },
      },
    )
  }

  const handleNotify = async (table: DiningAdminTable) => {
    if (await showConfirm(`${tableLabel(table.id)} 멤버 ${table.members.length}명에게 확정 알림을 다시 보낼까요?`)) {
      retryNotifications.mutate(table.id)
    }
  }

  const renderChatRoom = (table: DiningAdminTable) => {
    if (table.status !== 'CONFIRMED' && table.status !== 'DONE') {
      return <span className="text-sm text-tag-text">확정되면 단체방이 생겨요</span>
    }
    return (
      <>
        {table.chatRoomId ? (
          <Link href={`/admin/chat/${table.chatRoomId}`} className={`${SMALL_BUTTON} border-primary text-primary`}>
            단체방 열기
          </Link>
        ) : (
          table.status === 'CONFIRMED' && (
            <button
              onClick={() => retryChatRoom.mutate(table.id)}
              disabled={retryChatRoom.isPending}
              className={`${SMALL_BUTTON} border-primary bg-primary text-white`}
            >
              단체방 만들기
            </button>
          )
        )}
        {table.status === 'CONFIRMED' && (
          <button
            onClick={() => handleNotify(table)}
            disabled={retryNotifications.isPending}
            className={`${SMALL_BUTTON} border-tag-bg text-foreground`}
          >
            알림 다시 보내기
          </button>
        )}
      </>
    )
  }

  const renderTables = () => {
    if (tablesQuery.isLoading) return <div className="flex justify-center py-10"><LoadingSpinner /></div>
    if (tablesQuery.isError || !tablesQuery.data) {
      return (
        <ApiErrorMessage
          message={getAdminApiErrorMessage(tablesQuery.error, '테이블을 불러오지 못했어요.')}
          onRetry={() => tablesQuery.refetch()}
        />
      )
    }
    const tables = tablesQuery.data.tables
    if (tables.length === 0) return <p className="py-8 text-center text-sm text-tag-text">아직 테이블이 없어요</p>
    // 이번 회차 식당 중에서만 고른다(BE도 회차 식당만 받는다). 사용 안 함 식당은 이미 배정된 테이블에서만 보인다(BE가 새 배정을 막는다).
    const options = sessionVenues.map((p) => p.venue)
    return (
      <ul className="divide-y divide-tag-bg">
        {tables.map((table) => {
          return (
            <li key={table.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-foreground">{tableLabel(table.id)}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TABLE_STATUS_CLASS[table.status]}`}>
                  {TABLE_STATUS_LABEL[table.status]}
                </span>
                <span className="text-sm text-tag-text">{table.members.length}명</span>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <select
                  value={table.venueId ?? ''}
                  onChange={(e) => e.target.value && assignVenue.mutate({ tableId: table.id, venueId: e.target.value })}
                  disabled={table.status === 'DONE' || assignVenue.isPending}
                  aria-label={`${tableLabel(table.id)} 배정 식당`}
                  className={SELECT_CLASS}
                >
                  <option value="">식당 선택</option>
                  {options.filter((v) => v.isActive || v.id === table.venueId).map((v) => <option key={v.id} value={v.id}>{v.name} ({v.region})</option>)}
                </select>
                <div className="flex flex-wrap items-center gap-2">{renderChatRoom(table)}</div>
              </div>
            </li>
          )
        })}
      </ul>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="bg-card rounded-card shadow-sm p-4 flex flex-col gap-3">
        <h2 className="font-bold text-base text-foreground">이번 회차 식당</h2>
        {sessionVenuesQuery.isLoading ? (
          <div className="flex justify-center py-6"><LoadingSpinner /></div>
        ) : (
          <>
            <DiningVenuePoolPicker pool={pool} onChange={setDraft} />
            <button
              onClick={handleSavePool}
              disabled={draft === null || saveVenues.isPending}
              className="self-start px-4 h-10 rounded-input bg-primary text-sm font-medium text-white disabled:opacity-50"
            >
              {saveVenues.isPending ? '저장 중…' : '식당 저장'}
            </button>
          </>
        )}
      </section>

      <section className="bg-card rounded-card shadow-sm px-4 pt-4 pb-1">
        <h2 className="font-bold text-base text-foreground">테이블별 식당과 단체방</h2>
        {renderTables()}
      </section>
    </div>
  )
}
