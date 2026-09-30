import dayjs from 'dayjs'
import type { GatheringSession, GatheringSessionStatus, GatheringStatus } from '@/lib/api/types'

// 백엔드 effective status(KAN-163)와 동일한 규칙의 프론트 fallback 보정. (KAN-164)
// eventDate가 오늘보다 과거인 모집중(OPEN) 게더링은 진행 완료(COMPLETED)로 간주한다.
// CANCELLED / CLOSED / COMPLETED 등 명시적 상태는 그대로 유지한다.
// 회차 응답(GatheringSession.status)은 BE가 이미 보정하므로 여기 쓰지 않는다.
export function getEffectiveStatus(status: GatheringStatus, eventDate: string): GatheringStatus {
  if (status === 'OPEN' && eventDate < dayjs().format('YYYY-MM-DD')) {
    return 'COMPLETED'
  }
  return status
}

// 회차 상태 → 배지 상태 (DONE은 기존 배지의 COMPLETED)
export function toBadgeStatus(status: GatheringSessionStatus): GatheringStatus {
  return status === 'DONE' ? 'COMPLETED' : status
}

// 오늘 이후 회차 (종류 상세의 "예정된 일정")
export function getUpcomingSessions(sessions: GatheringSession[]): GatheringSession[] {
  const today = dayjs().format('YYYY-MM-DD')
  return sessions.filter((session) => session.eventDate >= today)
}

// 신청 가능한 회차: 모집중 + 신청 마감 전 + 정원 남음. BE 신청 검증(KAN-338)과 같은 기준.
export function isSessionApplicable(session: GatheringSession): boolean {
  return session.status === 'OPEN'
    && (!session.applyDeadlineAt || dayjs().isBefore(session.applyDeadlineAt))
    && session.confirmedCount < session.maxAttendees
}
