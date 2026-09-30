'use client'

import DiningStatusCard from '@/components/mypage/DiningStatusCard'
import { useMyDiningApplications } from '@/lib/hooks/useApplications'
import { useAuthStore } from '@/lib/store/authStore'
import { getDiningPhase } from '@/lib/utils/diningStatus'

// 홈 상단: 진행 중(취소·참석 완료 아닌) 우연한 식탁 신청 중 가장 최근 1건을 요약한다. (KAN-354)
export default function DiningStatusSummary() {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn)
  const { data: applications } = useMyDiningApplications(isLoggedIn)
  const active = isLoggedIn
    ? applications?.find((item) =>
        item.status !== 'CANCELLED'
        && item.status !== 'REJECTED'
        && getDiningPhase(item.status, item.matchStatus, item.table?.status) !== 'attended')
    : undefined

  if (!active) return null

  return (
    <div className="px-4 pt-4">
      <DiningStatusCard
        summary
        applicationId={active.id}
        title={active.gathering.title}
        status={active.status}
        matchStatus={active.matchStatus}
        table={active.table}
        assignedSession={active.assignedSession}
        candidateSessions={active.candidateSessions}
      />
    </div>
  )
}
