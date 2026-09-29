'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import dayjs from 'dayjs'
import { Star } from 'lucide-react'
import { useAdminGatheringTypes, useDeleteGathering, useSetCuration } from '@/lib/hooks/useAdminGathering'
import { useCuratedGatherings } from '@/lib/hooks/useHome'
import { GatheringFormPanel } from '@/components/admin/GatheringFormPanel'
import { LoadingSpinner, Pagination } from '@/components/ui'

const PAGE_SIZE = 10

// 관리자 모임 목록 = 종류 목록. 회차는 종류 상세(/admin/gatherings/[id])에서 관리한다. (KAN-340)
export default function AdminGatheringsPage() {
  const router = useRouter()
  const [page, setPage] = useState(0)
  // null: 패널 닫힘, 'new': 새 종류, 그 외: 수정할 종류 ID
  const [panelTarget, setPanelTarget] = useState<string | null>(null)

  const { data: rows = [], isLoading } = useAdminGatheringTypes()

  // 큐레이션 현재 상태는 공개 큐레이션 목록(id = 대표 회차 ID)에서 파생한다. (KAN-190, 목록 응답에 isCurated가 없음)
  const { data: curated = [] } = useCuratedGatherings()
  const curatedIds = new Set(curated.map((c) => c.id))
  const { mutate: setCuration } = useSetCuration()
  const { mutate: deleteGathering } = useDeleteGathering()

  const totalPages = Math.ceil(rows.length / PAGE_SIZE)
  const pageRows = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const handleDelete = (id: string, title: string) => {
    if (confirm(`"${title}" 모임과 모든 회차를 삭제할까요?`)) deleteGathering(id)
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-5">
        <h1 className="font-bold text-[22px] text-foreground">게더링 관리</h1>
        <button
          id="btn-gathering-add"
          onClick={() => setPanelTarget('new')}
          className="self-start sm:self-auto px-5 h-11 bg-primary text-white rounded-input font-medium text-sm hover:opacity-90 transition-opacity"
        >
          + 게더링 추가
        </button>
      </div>

      <div className="bg-card rounded-card shadow-sm overflow-x-auto">
        <table className="w-full min-w-[720px]">
          <thead>
            <tr className="bg-tag-bg text-xs text-tag-text">
              {['게더링명', '회차', '다음 일정', '큐레이션', '액션'].map((col) => (
                <th key={col} className="px-4 py-3 text-left font-medium">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={5} className="py-12 text-center"><LoadingSpinner /></td>
              </tr>
            )}
            {!isLoading && pageRows.length === 0 && (
              <tr>
                <td colSpan={5} className="py-12 text-center text-sm text-tag-text">게더링이 없습니다.</td>
              </tr>
            )}
            {pageRows.map((row) => {
              const isCurated = row.sessionIds.some((id) => curatedIds.has(id))
              return (
                <tr key={row.id} className="border-t border-tag-bg hover:bg-background transition-colors">
                  <td className="px-4 py-3 max-w-[280px]">
                    <Link
                      href={`/admin/gatherings/${row.id}`}
                      className="font-medium text-sm text-foreground hover:text-primary truncate block"
                    >
                      {row.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-tag-text whitespace-nowrap">
                    예정 {row.upcomingCount} / 전체 {row.sessionCount}
                  </td>
                  <td className="px-4 py-3 text-sm text-tag-text whitespace-nowrap">
                    {row.nextEventDate ? dayjs(row.nextEventDate).format('YYYY.M.D') : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setCuration({ id: row.id, isCurated: !isCurated })}
                      title={isCurated ? '홈 큐레이션 노출 해제' : '홈 큐레이션 노출'}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border transition-colors ${
                        isCurated
                          ? 'border-primary text-primary bg-primary-light'
                          : 'border-tag-bg text-tag-text hover:border-primary'
                      }`}
                    >
                      <Star size={12} className={isCurated ? 'fill-primary' : ''} />
                      {isCurated ? '노출중' : '노출'}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3 text-sm">
                      <Link href={`/admin/gatherings/${row.id}`} className="text-primary hover:underline">회차 관리</Link>
                      <button onClick={() => setPanelTarget(row.id)} className="text-tag-text hover:text-foreground hover:underline">
                        수정
                      </button>
                      <button onClick={() => handleDelete(row.id, row.title)} className="text-tag-text hover:text-primary hover:underline">
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

      <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />

      {panelTarget && (
        <GatheringFormPanel
          // 대상이 바뀌면 새로 마운트해 업로드 중이던 썸네일 상태가 남지 않게 한다.
          key={panelTarget}
          gatheringId={panelTarget === 'new' ? null : panelTarget}
          onClose={() => setPanelTarget(null)}
          onSuccess={(id) => {
            // 새 종류는 회차가 없어 목록에 안 보이므로 바로 상세로 보내 회차를 추가하게 한다.
            if (panelTarget === 'new') router.push(`/admin/gatherings/${id}`)
            setPanelTarget(null)
          }}
        />
      )}
    </div>
  )
}
