import type { GatheringListItem, GatheringStatus } from '@/lib/api/types'
import { getEffectiveStatus } from './gatheringStatus'

export interface GatheringTypeGroup {
  title: string
  thumbnailUrl: string | null
  totalCount: number
  openCount: number
  // 카드 선택 시 이동할 대표 일정 id
  representativeId: string
  // 가장 가까운 모집중(보정 OPEN) 일정 날짜. 없으면 null
  nearestOpenDate: string | null
  // 모집중 일정이 없을 때 상태 표시에 쓰는 대표 일정 날짜/상태
  representativeDate: string
  representativeStatus: GatheringStatus
}

// 게더링 목록을 같은 이름(종류)으로 묶어 종류별 대표 카드 데이터를 만든다. (KAN-295)
// 대표 일정 선택 우선순위: 가장 가까운 모집중 일정 > 가장 가까운 예정 일정 > 가장 최근 지난 일정
// 그룹 정렬: 모집중 종류 먼저(가까운 모집일 순), 그 외는 대표 일정 가까운 순
export function groupGatheringsByType(items: GatheringListItem[], today: string): GatheringTypeGroup[] {
  const byTitle = new Map<string, GatheringListItem[]>()
  for (const item of items) {
    const list = byTitle.get(item.title)
    if (list) {
      list.push(item)
    } else {
      byTitle.set(item.title, [item])
    }
  }

  const groups: GatheringTypeGroup[] = []
  for (const [title, list] of byTitle) {
    const openSchedules = list
      .filter((g) => getEffectiveStatus(g.status, g.eventDate) === 'OPEN')
      .sort((a, b) => a.eventDate.localeCompare(b.eventDate))

    const upcoming = list
      .filter((g) => g.eventDate >= today)
      .sort((a, b) => a.eventDate.localeCompare(b.eventDate))

    const past = list
      .filter((g) => g.eventDate < today)
      .sort((a, b) => b.eventDate.localeCompare(a.eventDate))

    const representative = openSchedules[0] ?? upcoming[0] ?? past[0] ?? list[0]
    const thumbnailUrl = list.find((g) => g.thumbnailUrl)?.thumbnailUrl ?? null

    groups.push({
      title,
      thumbnailUrl,
      totalCount: list.length,
      openCount: openSchedules.length,
      representativeId: representative.id,
      nearestOpenDate: openSchedules[0]?.eventDate ?? null,
      representativeDate: representative.eventDate,
      representativeStatus: getEffectiveStatus(representative.status, representative.eventDate),
    })
  }

  return groups.sort((a, b) => {
    if (a.nearestOpenDate && b.nearestOpenDate) return a.nearestOpenDate.localeCompare(b.nearestOpenDate)
    if (a.nearestOpenDate) return -1
    if (b.nearestOpenDate) return 1
    return a.representativeDate.localeCompare(b.representativeDate)
  })
}
