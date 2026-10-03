import type { FeedItem, FeedMedia, FeedResponse } from './types'

// KAN-380(GET /api/feed) 전까지 쓰는 목 데이터.
// 게더링 id·제목은 whatsup-house-backend db/migration/V2__insert_mock_data.sql 시드(고정 UUID)에서 가져옴.
// TODO(KAN-380): 실제 API 연결 시 이 파일 삭제.
const COMMUTE = { id: 'ff29fa1d-2f9c-59e6-ab5c-e096bd30177c', title: '퇴근 게더링' }
const DINING = { id: '52f9cd2c-7b9b-5bcf-ab24-76f7242cc1f8', title: '우연한 식탁' }
const INSTAGRAM = 'https://www.instagram.com/whatsup_house/'

const img = (name: string): FeedMedia => ({ type: 'IMAGE', url: `/feed/${name}.jpg` })
const reel = (n: number): FeedMedia => ({
  type: 'VIDEO',
  url: `/feed/reel-${n}.mp4`,
  posterUrl: `/feed/reel-${n}-poster.jpg`,
  width: 720,
  height: 1280,
})

type BaseItem = Omit<FeedItem, 'id' | 'postedAt'>

const BASE: BaseItem[] = [
  { kind: 'POST', media: [reel(1)], gathering: COMMUTE, instagramUrl: INSTAGRAM,
    caption: '퇴근하고 바로 와도 괜찮아요 🙌\n처음 보는 사이인데 어느새 마지막 지하철 걱정하던 금요일 밤.\n이번 주 퇴근 게더링도 자리 남아 있어요!' },
  { kind: 'REVIEW', media: [img('review-2'), img('review-6')], gathering: COMMUTE, reviewId: 'mock-review-1',
    caption: '혼자 가서 어색할까 걱정했는데 호스트님이 자연스럽게 대화를 이어주셔서 3시간이 금방 갔어요. 다음엔 친구도 데려갈게요!' },
  { kind: 'POST', media: [img('home-1'), img('review-1'), img('review-4')], gathering: null, instagramUrl: INSTAGRAM,
    caption: '청춘이 와썹 5월 🌿\n이번 달 게더링 일정이 나왔어요. 옆으로 넘겨서 지난 달 분위기도 확인해 보세요.' },
  { kind: 'POST', media: [reel(2)], gathering: DINING, instagramUrl: INSTAGRAM,
    caption: '처음 보는 4~6명이 함께하는 작은 저녁 🍽️\n소개팅도, 딱딱한 네트워킹도 아닌 그냥 좋은 사람들과의 한 끼. 우연한 식탁에서 만나요.' },
  { kind: 'REVIEW', media: [img('review-5')], gathering: DINING, reviewId: 'mock-review-2',
    caption: '음식도 맛있었지만 대화가 더 맛있었던 저녁. 연락처 교환까지 하고 왔어요 ㅎㅎ' },
  { kind: 'POST', media: [img('home-3')], gathering: null, instagramUrl: INSTAGRAM,
    caption: '보라매공원 경찰과 도둑 🚓\n어릴 때 하던 그 놀이, 어른이 돼서 하면 더 재밌습니다. 참가비 3,000원!' },
  { kind: 'POST', media: [reel(3)], gathering: null, instagramUrl: INSTAGRAM,
    caption: '와썹 러닝크루 🏃 노을 보면서 같이 달릴 사람 구해요. 페이스 상관없이 누구나!' },
  { kind: 'POST', media: [img('home-4'), img('review-3')], gathering: null, instagramUrl: INSTAGRAM,
    caption: '전국 대학생 게더링 📚 시험 끝난 기념으로 다 같이 모여요.' },
  { kind: 'REVIEW', media: [img('review-3')], gathering: COMMUTE, reviewId: 'mock-review-3',
    caption: '마지막에 서로에게 편지 쓰는 시간이 있었는데 집에 와서 읽고 괜히 뭉클했어요 💌' },
  { kind: 'POST', media: [img('home-6')], gathering: null, instagramUrl: INSTAGRAM,
    caption: 'Whatsup Running Crew 🌅 이번 주 토요일 아침 7시, 한강에서 만나요.' },
  { kind: 'POST', media: [img('home-5')], gathering: null, instagramUrl: INSTAGRAM,
    caption: '왜 우리는 와썹하우스를 만들었을까?\n혼자 사는 2030이 부담 없이 사람을 만날 수 있는 거실 같은 곳이 있었으면 해서요.' },
  { kind: 'REVIEW', media: [img('host-1'), img('review-2')], gathering: COMMUTE, reviewId: 'mock-review-4',
    caption: '호스트님 리액션 장인 👍 낯가림 심한 편인데도 편하게 있다 왔어요.' },
]

const PAGE_SIZE = 10
const PAGE_COUNT = 5
const LATEST = new Date('2026-09-30T20:00:00+09:00').getTime()
const HOURS = 60 * 60 * 1000

// BASE를 돌려 쓰되 id는 페이지마다 고유하게. cursor는 페이지 번호 문자열.
export function getMockFeedPage(cursor?: string): FeedResponse {
  const page = Number(cursor ?? 0)
  const items: FeedItem[] = Array.from({ length: PAGE_SIZE }, (_, i) => {
    const n = page * PAGE_SIZE + i
    return { ...BASE[n % BASE.length], id: `mock-${n}`, postedAt: new Date(LATEST - n * 30 * HOURS).toISOString() }
  })
  return { items, nextCursor: page + 1 < PAGE_COUNT ? String(page + 1) : null }
}
