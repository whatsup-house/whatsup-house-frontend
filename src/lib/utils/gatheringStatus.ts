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

// 화면에 보이는 회차 상태의 단일 기준. 모집중이어도 신청 마감이 지났으면 마감(CLOSED).
// 카드 배지·모아보기·달력 점이 모두 이 값을 쓴다 — 상세의 신청 막힘(isSessionApplicable)과 어긋나지 않게.
export function sessionDisplayStatus(session: Pick<GatheringSession, 'status' | 'applyDeadlineAt'>): GatheringSessionStatus {
  if (session.status === 'OPEN' && session.applyDeadlineAt && !dayjs().isBefore(session.applyDeadlineAt)) {
    return 'CLOSED'
  }
  return session.status
}

// 목록·카드 배지용 (DONE은 기존 배지의 COMPLETED)
export function sessionBadgeStatus(session: GatheringSession): GatheringStatus {
  return toBadgeStatus(sessionDisplayStatus(session))
}

// 신청 마감 표시 시각. 자정(00:00) 마감은 전날 23:59 로 보여 준다 — "28일(수) 00:00" 보다 "27일(화) 23:59" 가 읽기 쉽다.
export function displayDeadline(applyDeadlineAt: string): dayjs.Dayjs {
  const at = dayjs(applyDeadlineAt)
  return at.hour() === 0 && at.minute() === 0 ? at.subtract(1, 'minute') : at
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
