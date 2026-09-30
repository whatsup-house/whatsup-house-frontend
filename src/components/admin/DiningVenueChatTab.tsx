'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { DiningAdminTable, SessionVenue } from '@/lib/api/types'
import {
  useDiningTables,
  useRetryDiningChatRoom,
  useRetryDiningNotifications,
  useUpdateSessionVenues,
} from '@/lib/hooks/useAdminDining'
import { useAssignDiningTableVenue, useDiningVenues } from '@/lib/hooks/useAdminDiningOps'
import { useToastStore } from '@/lib/store/toastStore'
import { TABLE_STATUS_CLASS, TABLE_STATUS_LABEL, tableLabel } from '@/lib/utils/diningStatus'
import { getAdminApiErrorMessage } from '@/lib/utils/apiError'
import { ApiErrorMessage, LoadingSpinner } from '@/components/ui'
import DiningVenuePoolPicker from '@/components/admin/DiningVenuePoolPicker'

const SMALL_BUTTON = 'px-2.5 h-8 rounded-input border text-xs font-medium disabled:opacity-50 disabled:pointer-events-none'
const SELECT_CLASS = 'h-9 w-full sm:w-56 rounded-input border border-tag-bg bg-card px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary'

// 목록 응답에 chatRoomId가 아직 없으면(undefined) 상태를 단정하지 않는다.
function chatRoomLabel(table: DiningAdminTable) {
  if (table.status !== 'CONFIRMED' && table.status !== 'DONE') return '확정 후 생성'
  if (table.chatRoomId === undefined) return '확인 필요'
  return table.chatRoomId ? '생성됨' : '없음'
}

interface DiningVenueChatTabProps {
  sessionId: string
}

// 식당·단체방 탭: 회차 식당 풀 설정, 테이블별 식당 배정, 채팅방 상태·재시도, 확정 알림 재발송 (KAN-352)
export default function DiningVenueChatTab({ sessionId }: DiningVenueChatTabProps) {
  const tablesQuery = useDiningTables(sessionId)
  const { data: venues = [] } = useDiningVenues()
  const showToast = useToastStore((s) => s.show)
  const saveVenues = useUpdateSessionVenues()
  const assignVenue = useAssignDiningTableVenue()
  const retryChatRoom = useRetryDiningChatRoom(sessionId)
  const retryNotifications = useRetryDiningNotifications()
  const [pool, setPool] = useState<Record<string, number>>({})
  // ponytail: 회차 식당 풀 조회 API가 없어 이번에 저장한 결과만 보여준다. GET이 생기면 초기값으로 채운다.
  const [savedPool, setSavedPool] = useState<SessionVenue[] | null>(null)

  const handleSavePool = () => {
    const body = Object.entries(pool).map(([venueId, capacityTables]) => ({ venueId, capacityTables }))
    saveVenues.mutate(
      { sessionIds: [sessionId], venues: body },
      {
        onSuccess: ([saved]) => {
          setSavedPool(saved)
          showToast('식당 풀을 저장했어요.')
        },
      },
    )
  }

  const handleNotify = (table: DiningAdminTable) => {
    if (confirm(`${tableLabel(table.id)} 멤버 ${table.members.length}명에게 확정 알림을 다시 보낼까요?`)) {
      retryNotifications.mutate(table.id)
    }
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
    if (tables.length === 0) return <p className="py-8 text-center text-sm text-tag-text">아직 테이블이 없어요.</p>
    return (
      <ul className="divide-y divide-tag-bg">
        {tables.map((table) => {
          const isConfirmed = table.status === 'CONFIRMED'
          // 배정된 식당이 비활성·삭제돼도 이름은 보이게 목록에 남긴다.
          const options = venues.filter((v) => v.isActive || v.id === table.venueId)
          return (
            <li key={table.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-foreground">{tableLabel(table.id)}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TABLE_STATUS_CLASS[table.status]}`}>
                  {TABLE_STATUS_LABEL[table.status]}
                </span>
                <span className="text-xs text-tag-text">{table.members.length}명</span>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <select
                  value={table.venueId ?? ''}
                  onChange={(e) => e.target.value && assignVenue.mutate({ tableId: table.id, venueId: e.target.value })}
                  disabled={table.status === 'DONE' || assignVenue.isPending}
                  aria-label={`${tableLabel(table.id)} 배정 식당`}
                  className={SELECT_CLASS}
                >
                  <option value="">식당 미배정</option>
                  {options.map((v) => <option key={v.id} value={v.id}>{v.name} ({v.region})</option>)}
                </select>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-tag-text">채팅방 {chatRoomLabel(table)}</span>
                  {table.chatRoomId && (
                    <Link href={`/admin/chat/${table.chatRoomId}`} className="text-xs text-primary hover:underline">열기</Link>
                  )}
                  <button
                    onClick={() => retryChatRoom.mutate(table.id)}
                    disabled={!isConfirmed || retryChatRoom.isPending}
                    className={`${SMALL_BUTTON} border-tag-bg text-foreground`}
                  >
                    채팅방 재시도
                  </button>
                  <button
                    onClick={() => handleNotify(table)}
                    disabled={!isConfirmed || retryNotifications.isPending}
                    className={`${SMALL_BUTTON} border-tag-bg text-foreground`}
                  >
                    알림 재발송
                  </button>
                </div>
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
        <div>
          <h2 className="font-bold text-base text-foreground">회차 식당 풀</h2>
          <p className="text-xs text-tag-text">
            고른 식당으로 이 회차의 식당 풀을 통째로 바꿔요. 확정된 테이블에 수용 테이블 수만큼 차례로 배정돼요.
          </p>
        </div>
        <DiningVenuePoolPicker pool={pool} onChange={setPool} />
        {savedPool && (
          <ul className="rounded-input bg-tag-bg px-3 py-2 text-xs text-tag-text">
            {savedPool.map((p) => (
              <li key={p.venue.id}>{p.venue.name}: {p.usedTables}/{p.capacityTables} 테이블 사용</li>
            ))}
          </ul>
        )}
        <button
          onClick={handleSavePool}
          disabled={Object.keys(pool).length === 0 || saveVenues.isPending}
          className="self-start px-4 h-10 rounded-input bg-primary text-sm font-medium text-white disabled:opacity-50"
        >
          식당 풀 저장
        </button>
      </section>

      <section className="bg-card rounded-card shadow-sm px-4 pt-4 pb-1">
        <h2 className="font-bold text-base text-foreground">테이블별 식당·단체방</h2>
        <p className="text-xs text-tag-text">식당은 회차 풀에 있는 식당만 배정돼요. 채팅방 재시도·알림 재발송은 확정 테이블만 할 수 있어요.</p>
        {renderTables()}
      </section>
    </div>
  )
}
