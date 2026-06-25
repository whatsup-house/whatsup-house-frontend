import type { GatheringListItem, GatheringStatus } from '@/lib/api/types'
import { getEffectiveStatus } from './gatheringStatus'

export type GatheringTypeFilter = 'all' | 'open' | 'completed'
export type GatheringTypeSort = 'popular' | 'latest' | 'oldest'

export interface GatheringTypeCard {
  title: string
  thumbnailUrl: string | null
  totalCount: number
  // 카드 선택 시 이동할 대표 일정 id
  representativeId: string
  representativeStatus: GatheringStatus
  // 카드에 표시할 날짜. 진행완료 등 미표시 상황은 null. (KAN-295)
  displayDate: string | null
  // 대표 게더링의 태그 — 미제공 시 칩 미표시 (KAN-305)
  tags: string[] | null
}

interface BuildOptions {
  today: string
  filter: GatheringTypeFilter
  sort: GatheringTypeSort
  // 인기순 정렬용 — 홈 큐레이션 순서(앞일수록 상위). (KAN-295)
  curatedTitles: string[]
}

// 게더링 목록을 같은 이름(종류)으로 묶어, 필터/정렬을 적용한 종류별 대표 카드를 만든다. (KAN-295)
// 대표 일정: 전체=가까운 모집중>가까운 예정>최근 지난, 모집중=가까운 모집중, 진행완료=최근 진행완료
// 진행완료 대표는 날짜를 표시하지 않는다(displayDate=null).
export function buildGatheringTypeCards(
  items: GatheringListItem[],
  { today, filter, sort, curatedTitles }: BuildOptions,
): GatheringTypeCard[] {
  const byTitle = new Map<string, GatheringListItem[]>()
  for (const item of items) {
    const list = byTitle.get(item.title)
    if (list) {
      list.push(item)
    } else {
      byTitle.set(item.title, [item])
    }
  }

  const createdMeta = new Map<string, { latest: string; earliest: string }>()
  const cards: GatheringTypeCard[] = []

  for (const [title, list] of byTitle) {
    const open = list
      .filter((g) => getEffectiveStatus(g.status, g.eventDate) === 'OPEN')
      .sort((a, b) => a.eventDate.localeCompare(b.eventDate))
    const completed = list
      .filter((g) => getEffectiveStatus(g.status, g.eventDate) === 'COMPLETED')
      .sort((a, b) => b.eventDate.localeCompare(a.eventDate))
    const upcoming = list
      .filter((g) => g.eventDate >= today)
      .sort((a, b) => a.eventDate.localeCompare(b.eventDate))
    const past = list
      .filter((g) => g.eventDate < today)
      .sort((a, b) => b.eventDate.localeCompare(a.eventDate))

    if (filter === 'open' && open.length === 0) continue
    if (filter === 'completed' && completed.length === 0) continue

    let representative: GatheringListItem
    let displayDate: string | null
    if (filter === 'completed') {
      representative = completed[0]
      displayDate = null // 진행완료는 날짜 미표시
    } else if (filter === 'open') {
      representative = open[0]
      displayDate = representative.eventDate
    } else {
      representative = open[0] ?? upcoming[0] ?? past[0] ?? list[0]
      const repStatus = getEffectiveStatus(representative.status, representative.eventDate)
      displayDate = repStatus === 'COMPLETED' ? null : representative.eventDate
    }

    const createdAts = list.map((g) => g.createdAt).filter((v): v is string => !!v)
    createdMeta.set(title, {
      latest: createdAts.length ? createdAts.reduce((a, b) => (a > b ? a : b)) : '',
      earliest: createdAts.length ? createdAts.reduce((a, b) => (a < b ? a : b)) : '',
    })

    cards.push({
      title,
      thumbnailUrl: list.find((g) => g.thumbnailUrl)?.thumbnailUrl ?? null,
      totalCount: list.length,
      representativeId: representative.id,
      representativeStatus: getEffectiveStatus(representative.status, representative.eventDate),
      displayDate,
      tags: representative.tags ?? null,
    })
  }

  const curatedRank = (title: string) => {
    const index = curatedTitles.indexOf(title)
    return index === -1 ? Number.MAX_SAFE_INTEGER : index
  }

  return cards.sort((a, b) => {
    if (sort === 'latest') {
      return (createdMeta.get(b.title)?.latest ?? '').localeCompare(createdMeta.get(a.title)?.latest ?? '')
    }
    if (sort === 'oldest') {
      return (createdMeta.get(a.title)?.earliest ?? '').localeCompare(createdMeta.get(b.title)?.earliest ?? '')
    }
    // popular — 큐레이션 순서 우선, 동순위는 최신 등록순
    const rank = curatedRank(a.title) - curatedRank(b.title)
    if (rank !== 0) return rank
    return (createdMeta.get(b.title)?.latest ?? '').localeCompare(createdMeta.get(a.title)?.latest ?? '')
  })
}
