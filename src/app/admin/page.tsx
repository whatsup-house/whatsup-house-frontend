'use client'

import dayjs from 'dayjs'
import { useRouter } from 'next/navigation'
import { CalendarDays, TrendingUp, CheckCircle, RefreshCw, AlertCircle } from 'lucide-react'
import { useAdminDashboardGatherings } from '@/lib/hooks/useAdminDashboard'
import { Badge, LoadingSpinner, ApiErrorMessage } from '@/components/ui'
import type { AdminGatheringStatus } from '@/lib/api/admin'

export default function AdminDashboardPage() {
  const router = useRouter()
  const today = dayjs().format('YYYY-MM-DD')
  const weekEnd = dayjs().add(6, 'day').format('YYYY-MM-DD')

  const {
    data: weekGatherings = [],
    isLoading: weekLoading,
    isError: weekError,
    refetch: refetchWeek,
    dataUpdatedAt,
  } = useAdminDashboardGatherings(today, weekEnd)

  const {
    data: allGatherings = [],
    isLoading: allLoading,
    isError: allError,
    refetch: refetchAll,
  } = useAdminDashboardGatherings()

  const isLoading = weekLoading || allLoading
  const isError = weekError || allError
  const refetch = () => { refetchWeek(); refetchAll() }

  // KPI 파생
  const pendingTotal = weekGatherings.reduce((sum, g) => sum + (g.pendingCount ?? 0), 0)
  const revenueTotal = weekGatherings.reduce((sum, g) => sum + g.price * g.applicantCount, 0)
  const confirmedTotal = allGatherings.reduce((sum, g) => sum + (g.confirmedCount ?? 0), 0)

  const updatedTime = dataUpdatedAt ? dayjs(dataUpdatedAt).format('HH:mm:ss') : '-'

  return (
    <div className="max-w-[1280px]">
      {/* 헤더 */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-1">대시보드</h1>
          <p className="text-sm text-tag-text">{dayjs().format('YYYY년 M월 D일 dddd')}</p>
        </div>
        <button
          onClick={refetch}
          className="flex items-center gap-1.5 text-xs text-tag-text hover:text-primary transition-colors"
        >
          <RefreshCw size={12} />
          <span>마지막 갱신: {updatedTime}</span>
        </button>
      </div>

      {isLoading && (
        <div className="flex justify-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      )}

      {isError && !isLoading && (
        <ApiErrorMessage
          message="데이터를 불러올 수 없습니다. 관리자 계정으로 로그인되어 있는지 확인해주세요."
          onRetry={refetch}
        />
      )}

      {!isLoading && !isError && (
        <>
          {/* KPI 카드 */}
          <div className="grid grid-cols-4 gap-5 mb-8">
            <KpiCard
              icon={<CalendarDays size={22} className="text-primary" />}
              label="다가오는 7일 게더링"
              value={`${weekGatherings.length}건`}
              sub="오늘부터 D+6"
            />
            <KpiCard
              icon={<AlertCircle size={22} className="text-orange-400" />}
              label="미확인 PENDING 신청"
              value={`${pendingTotal}건`}
              sub="7일 내 게더링 기준"
            />
            <KpiCard
              icon={<TrendingUp size={22} className="text-green-500" />}
              label="이번 주 예상 매출"
              value={`${revenueTotal.toLocaleString()}원`}
              sub="참가비 × 신청자 수"
            />
            <KpiCard
              icon={<CheckCircle size={22} className="text-blue-500" />}
              label="누적 확정 참가자"
              value={`${confirmedTotal}명`}
              sub="전체 기간 합계"
            />
          </div>

          {/* 향후 7일 게더링 일정 테이블 */}
          <div className="bg-card rounded-card shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-foreground">향후 7일 게더링 일정</h2>
              <span className="text-xs text-tag-text">
                {dayjs().format('M/D')} ~ {dayjs().add(6, 'day').format('M/D')} · {weekGatherings.length}건
              </span>
            </div>

            {weekGatherings.length === 0 ? (
              <p className="text-sm text-tag-text py-6 text-center">향후 7일간 예정된 게더링이 없어요.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-tag-bg">
                      <th className="text-left text-xs text-tag-text font-medium pb-3 pr-4">게더링명</th>
                      <th className="text-left text-xs text-tag-text font-medium pb-3 pr-4">날짜·시간</th>
                      <th className="text-left text-xs text-tag-text font-medium pb-3 pr-4">장소</th>
                      <th className="text-center text-xs text-tag-text font-medium pb-3 pr-4">신청/정원</th>
                      <th className="text-center text-xs text-tag-text font-medium pb-3 pr-4">PENDING</th>
                      <th className="text-center text-xs text-tag-text font-medium pb-3">상태</th>
                    </tr>
                  </thead>
                  <tbody>
                    {weekGatherings.map((g) => (
                      <tr
                        key={g.id}
                        onClick={() => router.push(`/admin/gatherings/${g.id}/applications`)}
                        className={`border-b border-tag-bg/50 last:border-0 cursor-pointer transition-colors ${
                          g.pendingCount > 0
                            ? 'bg-orange-50 hover:bg-orange-100/70'
                            : 'hover:bg-background/50'
                        }`}
                      >
                        <td className="py-3 pr-4">
                          <p className="font-medium text-foreground truncate max-w-[200px]">{g.title}</p>
                        </td>
                        <td className="py-3 pr-4 text-tag-text whitespace-nowrap">
                          {dayjs(g.eventDate).format('M/D')} {g.startTime?.slice(0, 5)}
                        </td>
                        <td className="py-3 pr-4 text-tag-text truncate max-w-[120px]">
                          {g.locationName ?? '-'}
                        </td>
                        <td className="py-3 pr-4 text-center">
                          <span className="text-primary font-semibold">{g.applicantCount}</span>
                          <span className="text-tag-text">/{g.maxAttendees}</span>
                        </td>
                        <td className="py-3 pr-4 text-center">
                          {g.pendingCount > 0 ? (
                            <span className="font-bold text-orange-500">{g.pendingCount}</span>
                          ) : (
                            <span className="text-tag-text">-</span>
                          )}
                        </td>
                        <td className="py-3 text-center">
                          <Badge variant={g.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 전체 게더링 상태별 현황 */}
          <div className="bg-card rounded-card shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-foreground">전체 게더링 현황</h2>
              <span className="text-xs text-tag-text">총 {allGatherings.length}건</span>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {(['OPEN', 'CLOSED', 'COMPLETED', 'CANCELLED'] as AdminGatheringStatus[]).map((status) => {
                const count = allGatherings.filter((g) => g.status === status).length
                const pct = allGatherings.length > 0 ? Math.round((count / allGatherings.length) * 100) : 0
                return (
                  <div key={status} className="bg-background rounded-input p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant={status} />
                      <span className="text-sm font-bold text-foreground">{count}건</span>
                    </div>
                    <div className="h-1.5 bg-tag-bg rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          status === 'OPEN' ? 'bg-green-500' :
                          status === 'CLOSED' ? 'bg-gray-400' :
                          status === 'COMPLETED' ? 'bg-blue-500' : 'bg-red-400'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-xs text-tag-text mt-1">{pct}%</p>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

interface KpiCardProps {
  icon: React.ReactNode
  label: string
  value: string
  sub: string
}

function KpiCard({ icon, label, value, sub }: KpiCardProps) {
  return (
    <div className="bg-card rounded-card shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-tag-text font-medium">{label}</span>
        <div className="w-9 h-9 rounded-full bg-background flex items-center justify-center">
          {icon}
        </div>
      </div>
      <p className="text-2xl font-bold text-foreground mb-1">{value}</p>
      <p className="text-xs text-tag-text">{sub}</p>
    </div>
  )
}
