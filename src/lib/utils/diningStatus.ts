import dayjs from 'dayjs'
import type { ApplicationStatus, DiningSessionInfo, DiningTableStatus, MatchStatus } from '@/lib/api/types'

// 알림(DINING_RESOLUTION)이 이 앵커로 들어오면 상태 카드의 해결 영역으로 스크롤한다.
export const DINING_RESOLUTION_ANCHOR = 'dining-resolution'

// 참가자 상태 카드의 단계 (KAN-354). 진행 막대는 앞 6개 순서대로 채운다.
export const DINING_STEPS = ['payment', 'waiting', 'matching', 'reallocating', 'confirmed', 'attended'] as const
export type DiningPhase = typeof DINING_STEPS[number] | 'alternative' | 'noMatch' | 'exception'

export function getDiningPhase(
  status: ApplicationStatus,
  matchStatus: MatchStatus | null,
  tableStatus: DiningTableStatus | null | undefined,
): DiningPhase {
  if (status === 'ATTENDED' || tableStatus === 'DONE') return 'attended'
  if (status === 'PAYMENT_PENDING') return 'payment'
  switch (matchStatus) {
    case 'MATCHING':
    case 'CONFIRM_PENDING':
      return 'matching'
    case 'REALLOCATING':
      return 'reallocating'
    case 'CONFIRMED':
      return 'confirmed'
    case 'ALTERNATIVE_OFFERED':
      return 'alternative'
    case 'NO_MATCH':
      return 'noMatch'
    case 'EXCEPTION':
      return 'exception'
    default:
      // WAITING, TRANSFERRED(다른 회차로 옮겨 다시 대기), 아직 값이 없는 신청
      return 'waiting'
  }
}

// 매칭 실패·예외는 매칭 단계에서 멈춘 것으로 보여준다.
export function getDiningStepIndex(phase: DiningPhase): number {
  const index = DINING_STEPS.indexOf(phase as typeof DINING_STEPS[number])
  return index >= 0 ? index : DINING_STEPS.indexOf('matching')
}

const sessionStartAt = (session: DiningSessionInfo) => dayjs(`${session.eventDate}T${session.startTime ?? '00:00:00'}`)

// BE 사전 취소 기준과 같다: 배정 회차, 배정 전이면 아직 시작 안 한 희망 회차 중 가장 이른 회차의 시작 2일 전까지.
// ponytail: 브라우저 시각 기준이라 시계가 틀어지면 버튼만 어긋난다. 최종 판단은 BE(CANCEL_WINDOW_CLOSED).
export function isDiningCancelOpen(
  assignedSession: DiningSessionInfo | null,
  candidateSessions: DiningSessionInfo[],
  now = dayjs(),
): boolean {
  const base = assignedSession
    ? sessionStartAt(assignedSession)
    : candidateSessions.map(sessionStartAt).filter((startAt) => startAt.isAfter(now)).sort((a, b) => a.valueOf() - b.valueOf())[0]
  return !!base && !now.isAfter(base.subtract(2, 'day'))
}

// 희망 회차 중 가장 먼저 돌아올 매칭 실행 시각. 응답에 없으면 null → 표시 생략
export function getNextMatchRunAt(sessions: DiningSessionInfo[], now = dayjs()): string | null {
  return sessions
    .map((session) => session.matchRunAt)
    .filter((runAt): runAt is string => !!runAt && dayjs(runAt).isAfter(now))
    .sort((a, b) => dayjs(a).valueOf() - dayjs(b).valueOf())[0] ?? null
}

// ===== 어드민 회차 콘솔 표시 (KAN-352) =====

// 테이블 카드 라벨: id 앞 4자리
export const tableLabel = (tableId: string) => `#${tableId.slice(0, 4)}`

export const TABLE_STATUS_LABEL: Record<DiningTableStatus, string> = {
  PROPOSED: '제안',
  CONFIRMED: '확정',
  DONE: '종료',
  DISSOLVED: '해체',
}

export const TABLE_STATUS_CLASS: Record<DiningTableStatus, string> = {
  PROPOSED: 'bg-yellow-100 text-yellow-700',
  CONFIRMED: 'bg-green-100 text-green-700',
  DONE: 'bg-blue-100 text-blue-700',
  DISSOLVED: 'bg-gray-100 text-gray-500',
}

// 성별은 표준 질문 답 원문(MALE/FEMALE)
export const genderShort = (gender: string | null) => (gender === 'MALE' ? '남' : gender === 'FEMALE' ? '여' : gender ?? '-')
