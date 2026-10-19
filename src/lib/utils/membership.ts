import dayjs from 'dayjs'
import type { TicketPass, TicketProductItem } from '@/lib/api/types'

// 아직 쓸 수 있는 멤버십 (활성 + 만료일 미경과). 없으면 null. (KAN-408)
export function findActiveMembership(passes: TicketPass[] | undefined): TicketPass | null {
  const today = dayjs().format('YYYY-MM-DD')
  return passes?.find((pass) => pass.status === 'ACTIVE' && !!pass.validUntil && pass.validUntil >= today) ?? null
}

// 만료일까지 남은 일수 (오늘이면 0)
export function daysUntil(date: string): number {
  return dayjs(date).startOf('day').diff(dayjs().startOf('day'), 'day')
}

export const isMembershipProduct = (product: Pick<TicketProductItem, 'kind'>) => product.kind === 'PERIOD'
