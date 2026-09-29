import apiClient from './client'
import type {
  ApiResponse,
  CalendarDot,
  GatheringListItem,
  GatheringDetail,
  GatheringSession,
  GatheringSessionEntry,
  GatheringSessionStatus,
  GatheringTypeCard,
  GatheringTypeFilter,
  GatheringTypeSort,
} from './types'
import { toBadgeStatus } from '@/lib/utils/gatheringStatus'

const fetchGatheringList = async (params?: { status: GatheringSessionStatus }): Promise<GatheringListItem[]> => {
  const response = await apiClient.get<ApiResponse<GatheringListItem[]>>('/api/gatherings', { params })
  return response.data.data
}

// 전체 모임 목록 — ['gatherings', 'all'] 단일 쿼리로 캐시하고 날짜별 목록·달력·모아보기는 여기서 파생한다. (KAN-327)
// BE 기본 목록은 오늘 이후 회차만 주므로 지난 회차(DONE)를 따로 받아 종류 ID 기준으로 합친다. (KAN-339)
// ponytail: 지난 CLOSED/CANCELLED 회차는 BE에 "전체" 조회가 없어 빠진다. 필요하면 BE에 all 모드를 추가.
export const fetchGatheringsAll = async (): Promise<GatheringListItem[]> => {
  const [upcoming, done] = await Promise.all([fetchGatheringList(), fetchGatheringList({ status: 'DONE' })])
  const byId = new Map<string, GatheringListItem>()
  for (const item of [...upcoming, ...done]) {
    const prev = byId.get(item.id)
    if (!prev) {
      byId.set(item.id, item)
      continue
    }
    const seen = new Set(prev.sessions.map((s) => s.id))
    const sessions = [...prev.sessions, ...item.sessions.filter((s) => !seen.has(s.id))]
    byId.set(item.id, { ...prev, sessions: sessions.sort(compareSession) })
  }
  return [...byId.values()]
}

// 모임 종류 상세 + 전체 회차. 옛 회차 ID로 요청해도 그 회차의 종류로 응답한다.
export const fetchGatheringDetail = async (id: string): Promise<GatheringDetail> => {
  const response = await apiClient.get<ApiResponse<GatheringDetail>>(`/api/gatherings/${id}`)
  return response.data.data
}

// 회차 상세: 종류 정보 + 그 회차 1건(sessions)
export const fetchGatheringSession = async (sessionId: string): Promise<GatheringDetail> => {
  const response = await apiClient.get<ApiResponse<GatheringDetail>>(`/api/gatherings/sessions/${sessionId}`)
  return response.data.data
}

const compareStr = (a: string | null, b: string | null) => {
  const x = a ?? ''
  const y = b ?? ''
  return x < y ? -1 : x > y ? 1 : 0
}
const compareSession = (a: GatheringSession, b: GatheringSession) =>
  compareStr(a.eventDate, b.eventDate) || compareStr(a.startTime, b.startTime)

// 날짜별 목록 — BE GET /api/gatherings?date= 와 같은 의미로 파생한다. (KAN-327)
// BE: eventDate 일치, 상태 필터 없음, startTime ASC → createdAt ASC 정렬
export const filterGatheringsByDate = (gatherings: GatheringListItem[], date: string): GatheringSessionEntry[] =>
  gatherings
    .flatMap((gathering) => gathering.sessions
      .filter((session) => session.eventDate === date)
      .map((session) => ({ gathering, session })))
    .sort((a, b) => compareStr(a.session.startTime, b.session.startTime) || compareStr(a.gathering.createdAt, b.gathering.createdAt))

// 달력 dot 표시용 날짜+상태 (백엔드 전용 엔드포인트 없음 - 전체 목록에서 파생)
// 같은 날짜에 여러 회차가 있으면 우선순위(모집중 > 그 외 비취소 > 취소)로 대표 상태를 정한다. (KAN-164)
export const deriveCalendarDots = (gatherings: GatheringListItem[], year: number, month: number): CalendarDot[] => {
  const prefix = `${year}-${String(month).padStart(2, '0')}`

  const statusByDate = new Map<string, GatheringSessionStatus>()
  for (const s of gatherings.flatMap((g) => g.sessions)) {
    if (!s.eventDate.startsWith(prefix)) continue
    const prev = statusByDate.get(s.eventDate)
    if (prev === undefined) {
      statusByDate.set(s.eventDate, s.status)
    } else if (s.status === 'OPEN') {
      statusByDate.set(s.eventDate, 'OPEN')                  // 모집중 최우선
    } else if (prev === 'CANCELLED' && s.status !== 'CANCELLED') {
      statusByDate.set(s.eventDate, s.status)                // 비취소가 취소보다 우선
    }
  }

  return [...statusByDate.entries()].map(([date, status]) => ({ date, status }))
}

interface TypeCardOptions {
  today: string
  filter: GatheringTypeFilter
  sort: GatheringTypeSort
  // 인기순 정렬용 — 홈 큐레이션 항목 ID(대표 회차 ID) 순서, 앞일수록 상위. (KAN-295)
  curatedIds: string[]
}

// 모아보기 카드: 종류마다 대표 회차를 골라 카드 1장을 만든다. (KAN-295, KAN-339)
// 대표 회차: 전체=가까운 모집중>가까운 예정>최근 지난, 모집중=가까운 모집중, 진행완료=최근 진행완료(날짜 미표시)
export const buildGatheringTypeCards = (
  gatherings: GatheringListItem[],
  { today, filter, sort, curatedIds }: TypeCardOptions,
): GatheringTypeCard[] => {
  const rankOf = (g: GatheringListItem) => {
    const index = curatedIds.findIndex((id) => id === g.id || g.sessions.some((s) => s.id === id))
    return index === -1 ? Number.MAX_SAFE_INTEGER : index
  }
  const sorted = [...gatherings].sort((a, b) => {
    if (sort === 'latest') return compareStr(b.createdAt, a.createdAt)
    if (sort === 'oldest') return compareStr(a.createdAt, b.createdAt)
    // popular — 큐레이션 순서 우선, 동순위는 최신 등록순
    return rankOf(a) - rankOf(b) || compareStr(b.createdAt, a.createdAt)
  })

  return sorted.flatMap((g) => {
    const open = g.sessions.find((s) => s.status === 'OPEN')
    const representative = filter === 'open'
      ? open
      : filter === 'completed'
        ? g.sessions.filter((s) => s.status === 'DONE').at(-1)
        : open ?? g.sessions.find((s) => s.eventDate >= today) ?? g.sessions.at(-1)
    if (!representative) return []
    return [{
      id: g.id,
      title: g.title,
      thumbnailUrl: g.thumbnailUrl,
      tags: g.tags,
      totalCount: g.sessions.length,
      representativeStatus: toBadgeStatus(representative.status),
      displayDate: representative.status === 'DONE' ? null : representative.eventDate,
    }]
  })
}
