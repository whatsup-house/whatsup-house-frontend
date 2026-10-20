import type { MyTickets, TicketPass, TicketProductItem } from '@/lib/api/types'

// 서비스 기준일(Asia/Seoul)의 YYYY-MM-DD. 기기 시간대와 무관하게 서버의 날짜 판정과 맞춘다.
const todayInSeoul = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date())

// 아직 쓸 수 있는 멤버십 (활성 + 만료일 미경과). 여러 개면 만료일이 가장 늦은 것. 없으면 null. (KAN-408)
export function findActiveMembership(passes: TicketPass[] | undefined): TicketPass | null {
  const today = todayInSeoul()
  const active = passes?.filter((pass) => pass.status === 'ACTIVE' && !!pass.validUntil && pass.validUntil >= today) ?? []
  return active.reduce<TicketPass | null>((best, pass) => (!best || pass.validUntil! > best.validUntil! ? pass : best), null)
}

// 만료일까지 남은 일수 (오늘이면 0)
export function daysUntil(date: string): number {
  return Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${todayInSeoul()}T00:00:00Z`)) / 86_400_000)
}

export const isMembershipProduct = (product: Pick<TicketProductItem, 'kind'>) => product.kind === 'PERIOD'

// 이용권을 살 수 없는 회원 상태. 참여 자격 심사는 자동 승인이라 제한된 경우만 막는다. (KAN-408)
export function getTicketRestriction(tickets: Pick<MyTickets, 'accountStatus' | 'randomTableEligibility'> | undefined): 'BLOCKED' | 'REJECTED' | 'SUSPENDED' | null {
  if (tickets?.accountStatus === 'BLOCKED') return 'BLOCKED'
  if (tickets?.randomTableEligibility === 'REJECTED' || tickets?.randomTableEligibility === 'SUSPENDED') return tickets.randomTableEligibility
  return null
}
